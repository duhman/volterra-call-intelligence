import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getHubSpotClient } from "@/lib/hubspot/client";
import { FilterOperatorEnum } from "@hubspot/api-client/lib/codegen/crm/contacts/models/Filter";
import { enqueueTelavoxJob, jobExists } from "@/lib/telavox/job-queue";
import { normalizePhoneToE164 } from "@/lib/webhooks/telavox-helpers";
import { getSwedishPhoneVariants } from "@/lib/phone/swedish-phone";

/**
 * Telavox webhook handler
 *
 * Expected (configurable) events:
 * - call.started
 * - call.answered
 * - call.ended
 * - call.recording.ready
 *
 * All events are keyed by telavox_call_id and telavox_org_id.
 */

// Prevent Vercel from caching webhook responses
export const dynamic = "force-dynamic";

// Cache-Control headers for all webhook responses (no caching)
const NO_CACHE_HEADERS = {
  "Cache-Control": "no-cache, no-store, must-revalidate, private",
  Pragma: "no-cache",
  Expires: "0",
};

type TelavoxEventType =
  | "call.started"
  | "call.answered"
  | "call.ended"
  | "call.recording.ready";

interface TelavoxWebhookPayload {
  eventType: string; // Telavox sends "ringing", "answer", "hangup"
  callId?: string;
  orgId?: string;
  direction?: "INBOUND" | "OUTBOUND" | string;
  from?: string;
  to?: string;
  agentEmail?: string;
  agentUserId?: string;
  recordingUrl?: string;
  timestamp?: string;
  isAnonymous?: string;
  WEBHOOK_SECRET?: string;
  LID?: string; // Telavox unique call identifier
  // Additional fields may be present; ignore safely.
  [key: string]: unknown;
}

// Map Telavox event names to our internal event types
function mapTelavoxEvent(event: string): TelavoxEventType | null {
  const normalized = event?.toLowerCase().trim();
  switch (normalized) {
    case "ringing":
      return "call.started";
    case "answer":
      return "call.answered";
    case "hangup":
      return "call.ended";
    case "call.started":
    case "call.answered":
    case "call.ended":
    case "call.recording.ready":
      return normalized as TelavoxEventType;
    default:
      return null;
  }
}

// Helper: constant-time comparison
function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

async function getConsentEnabled(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("settings")
    .select("value")
    .eq("key", "consent_enabled")
    .single();

  return data?.value !== "false";
}

/**
 * Verify Telavox webhook using HMAC signature from headers.
 * Primary authentication method - checks for signature in common header names.
 */
async function verifyTelavoxSignature(
  req: NextRequest,
  rawBody: string,
  orgId: string,
): Promise<{ valid: boolean; error?: string }> {
  // Check multiple possible header names for signature
  const signature =
    req.headers.get("x-telavox-signature") ||
    req.headers.get("x-signature") ||
    req.headers.get("telavox-signature") ||
    req.headers.get("signature");

  if (!signature) {
    return { valid: false, error: "No signature header found" };
  }

  if (!orgId) {
    return { valid: false, error: "Missing orgId for signature verification" };
  }

  const supabase = await createServiceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: config, error } = await (supabase as any)
    .from("telavox_org_configs")
    .select("webhook_secret")
    .eq("telavox_org_id", orgId)
    .single();

  if (error || !config?.webhook_secret) {
    console.error("[Telavox] Missing org config for orgId", orgId, error);
    return { valid: false, error: "Organization config not found" };
  }

  // Try different HMAC formats that webhook providers commonly use
  // Format 1: Direct HMAC-SHA256 hex
  const expectedHex = crypto
    .createHmac("sha256", config.webhook_secret)
    .update(rawBody)
    .digest("hex");

  if (safeCompare(signature, expectedHex)) {
    return { valid: true };
  }

  // Format 2: SHA256=hex (common format)
  if (signature.startsWith("sha256=")) {
    const sigValue = signature.substring(7);
    if (safeCompare(sigValue, expectedHex)) {
      return { valid: true };
    }
  }

  // Format 3: timestamp,signature (like Stripe)
  if (signature.includes(",")) {
    const parts = signature.split(",");
    const sigPart = parts.find(
      (p) => p.startsWith("v1=") || p.startsWith("sha256="),
    );
    if (sigPart) {
      const sigValue = sigPart.includes("=") ? sigPart.split("=")[1] : sigPart;
      if (safeCompare(sigValue, expectedHex)) {
        return { valid: true };
      }
    }
  }

  return { valid: false, error: "Signature mismatch" };
}

async function handleCallStarted(payload: TelavoxWebhookPayload) {
  // Validate required fields
  if (!payload.orgId || !payload.callId) {
    console.error("[Telavox] Missing required fields in handleCallStarted:", {
      orgId: payload.orgId,
      callId: payload.callId,
    });
    throw new Error("Missing required fields: orgId or callId");
  }

  const supabase = await createServiceClient();

  // Resolve org config to attach hubspot_portal_id
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: orgConfig } = await (supabase as any)
    .from("telavox_org_configs")
    .select("hubspot_portal_id")
    .eq("telavox_org_id", payload.orgId)
    .single();

  // Map direction - handle various Telavox formats
  const direction = (() => {
    if (!payload.direction) return "INBOUND"; // Default to inbound
    const dir = payload.direction.toUpperCase().trim();
    if (dir === "OUTBOUND" || dir === "OUTGOING") return "OUTBOUND";
    if (dir === "INBOUND" || dir === "INCOMING") return "INBOUND";
    console.warn(
      "[Telavox] Unknown direction value, defaulting to INBOUND:",
      payload.direction,
    );
    return "INBOUND"; // Default to inbound for unknown values
  })();

  const fromNumber = payload.from ?? null;
  const toNumber = payload.to ?? null;

  // Upsert by telavox_call_id
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("telavox_call_sessions")
    .upsert(
      {
        telavox_call_id: payload.callId,
        telavox_org_id: payload.orgId,
        hubspot_portal_id: orgConfig?.hubspot_portal_id ?? null,
        direction,
        from_number: fromNumber,
        to_number: toNumber,
        agent_user_id: payload.agentUserId ?? payload.agentEmail ?? null,
        started_at: new Date().toISOString(),
      },
      {
        onConflict: "telavox_call_id",
      },
    );

  if (error) {
    console.error("[Telavox] handleCallStarted upsert error", error);
    throw error;
  }

  // Attempt to associate call with HubSpot contact by phone number (non-blocking)
  // This runs asynchronously and doesn't block the webhook response
  associateCallWithHubSpotContact(
    payload.callId,
    orgConfig?.hubspot_portal_id ?? null,
    fromNumber,
    toNumber,
    direction as "INBOUND" | "OUTBOUND",
  ).catch((err) => {
    console.warn(
      `[Telavox] Background phone matching failed for call ${payload.callId}:`,
      err,
    );
  });
}

/**
 * Search HubSpot contacts by phone number with retry logic
 * Uses Swedish phone format variants to maximize match probability
 * Returns the first matching contact ID, or null if no match found
 */
async function findHubSpotContactByPhone(
  phoneNumber: string | null,
  portalId: string | null,
  maxRetries: number = 3,
): Promise<string | null> {
  if (!phoneNumber || !portalId) {
    return null;
  }

  // Generate all Swedish phone format variants for comprehensive matching
  // This handles: +46, 0-prefix, spaced formats like "073 - 200 00 04"
  const phoneVariants = getSwedishPhoneVariants(phoneNumber);

  if (phoneVariants.length === 0) {
    console.warn(`[Telavox] No phone variants generated for: ${phoneNumber}`);
    return null;
  }

  console.log(
    `[Telavox] Searching HubSpot with ${phoneVariants.length} phone variants for: ${phoneNumber}`,
  );

  const accessToken = process.env.HUBSPOT_PRIVATE_ACCESS_TOKEN;
  if (!accessToken) {
    console.warn(
      "[Telavox] HUBSPOT_PRIVATE_ACCESS_TOKEN not configured, skipping phone matching",
    );
    return null;
  }

  const client = getHubSpotClient(accessToken);

  // Try each phone variant until we find a match
  for (const variant of phoneVariants) {
    // Skip variants that are too short
    if (variant.replace(/\D/g, "").length < 7) {
      continue;
    }

    // Retry logic with exponential backoff for transient errors
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Search for contacts matching phone number in common phone fields
        // HubSpot phone fields: phone, mobilephone
        // Use OR logic: search in either phone or mobilephone field
        const searchResult = await client.crm.contacts.searchApi.doSearch({
          filterGroups: [
            {
              filters: [
                {
                  propertyName: "phone",
                  operator: FilterOperatorEnum.Eq,
                  value: variant,
                },
              ],
            },
            {
              filters: [
                {
                  propertyName: "mobilephone",
                  operator: FilterOperatorEnum.Eq,
                  value: variant,
                },
              ],
            },
          ],
          limit: 1,
          properties: ["phone", "mobilephone"],
        });

        if (searchResult.results && searchResult.results.length > 0) {
          const contact = searchResult.results[0];
          console.log(
            `[Telavox] Found HubSpot contact ${contact.id} for phone ${phoneNumber} (matched variant: ${variant})`,
          );
          return contact.id;
        }

        // No match for this variant, try next one
        break;
      } catch (error: unknown) {
        const isRetryable =
          (error as { statusCode?: number })?.statusCode === 408 ||
          (error as { statusCode?: number })?.statusCode === 429 ||
          ((error as { statusCode?: number })?.statusCode ?? 0) >= 500 ||
          (error instanceof Error &&
            (error.message?.includes("socket hang up") ||
              error.message?.includes("ECONNRESET") ||
              error.message?.includes("ETIMEDOUT")));

        if (!isRetryable || attempt === maxRetries) {
          // Log but don't fail - try next variant
          console.warn(
            `[Telavox] Error searching HubSpot for variant ${variant} (attempt ${attempt}/${maxRetries}):`,
            error instanceof Error ? error.message : String(error),
          );
          break; // Try next variant
        }

        // Exponential backoff with jitter
        const baseDelay = 1000;
        const delay =
          baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
        console.warn(
          `[Telavox] Retryable error, retrying in ${Math.round(delay)}ms:`,
          error instanceof Error ? error.message : String(error),
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  console.log(
    `[Telavox] No HubSpot contact found for any variant of ${phoneNumber}`,
  );
  return null;
}

/**
 * Attempt to associate Telavox call session with HubSpot contact/deal by phone number
 * This runs asynchronously and doesn't block the webhook response
 */
async function associateCallWithHubSpotContact(
  callId: string,
  portalId: string | null,
  fromNumber: string | null,
  toNumber: string | null,
  direction: "INBOUND" | "OUTBOUND",
): Promise<void> {
  if (!portalId) {
    return; // No portal ID means we can't search HubSpot
  }

  // For inbound calls, match the caller (fromNumber)
  // For outbound calls, match the recipient (toNumber)
  const phoneToMatch = direction === "INBOUND" ? fromNumber : toNumber;

  if (!phoneToMatch) {
    return;
  }

  try {
    const contactId = await findHubSpotContactByPhone(phoneToMatch, portalId);

    if (contactId) {
      const supabase = await createServiceClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("telavox_call_sessions")
        .update({ hubspot_contact_id: contactId })
        .eq("telavox_call_id", callId);

      if (error) {
        console.error(
          `[Telavox] Failed to update hubspot_contact_id for call ${callId}:`,
          error,
        );
      } else {
        console.log(
          `[Telavox] Associated call ${callId} with HubSpot contact ${contactId}`,
        );
      }
    }
  } catch (error) {
    // Don't fail webhook - association is optional
    console.warn(
      `[Telavox] Error associating call ${callId} with HubSpot:`,
      error,
    );
  }
}

async function handleCallAnswered(payload: TelavoxWebhookPayload) {
  // Validate required fields
  if (!payload.orgId || !payload.callId) {
    console.error("[Telavox] Missing required fields in handleCallAnswered:", {
      orgId: payload.orgId,
      callId: payload.callId,
    });
    throw new Error("Missing required fields: orgId or callId");
  }

  const supabase = await createServiceClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("telavox_call_sessions")
    .select("id, answered_at")
    .eq("telavox_call_id", payload.callId)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("[Telavox] handleCallAnswered fetch error", error);
    throw error;
  }

  if (!data) {
    // Create minimal row if missing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insertError } = await (supabase as any)
      .from("telavox_call_sessions")
      .insert({
        telavox_call_id: payload.callId,
        telavox_org_id: payload.orgId,
        answered_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error("[Telavox] handleCallAnswered insert error", insertError);
      throw insertError;
    }
    return;
  }

  if (!data.answered_at) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from("telavox_call_sessions")
      .update({ answered_at: new Date().toISOString() })
      .eq("id", data.id);

    if (updateError) {
      console.error("[Telavox] handleCallAnswered update error", updateError);
      throw updateError;
    }
  }
}

async function handleCallEnded(payload: TelavoxWebhookPayload) {
  // Validate required fields
  if (!payload.orgId || !payload.callId) {
    console.error("[Telavox] Missing required fields in handleCallEnded:", {
      orgId: payload.orgId,
      callId: payload.callId,
    });
    throw new Error("Missing required fields: orgId or callId");
  }

  const supabase = await createServiceClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("telavox_call_sessions")
    .select("id, ended_at, recording_url")
    .eq("telavox_call_id", payload.callId)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("[Telavox] handleCallEnded fetch error", error);
    throw error;
  }

  if (!data) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insertError } = await (supabase as any)
      .from("telavox_call_sessions")
      .insert({
        telavox_call_id: payload.callId,
        telavox_org_id: payload.orgId,
        ended_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error("[Telavox] handleCallEnded insert error", insertError);
      throw insertError;
    }

    // Enqueue lookup job if recording URL not provided
    if (!payload.recordingUrl) {
      console.log(
        `[Telavox] No recording URL in call.ended webhook for ${payload.callId}, enqueueing lookup job`,
      );
      try {
        const exists = await jobExists("recording.lookup", payload.callId);
        if (!exists) {
          await enqueueTelavoxJob({
            job_type: "recording.lookup",
            telavox_call_id: payload.callId,
            telavox_org_id: payload.orgId,
            scheduled_at: new Date(Date.now() + 30000).toISOString(), // 30s delay
          });
        }
      } catch (err) {
        console.error("[Telavox] Failed to enqueue lookup job:", err);
      }
    }
    return;
  }

  if (!data.ended_at) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from("telavox_call_sessions")
      .update({ ended_at: new Date().toISOString() })
      .eq("id", data.id);

    if (updateError) {
      console.error("[Telavox] handleCallEnded update error", updateError);
      throw updateError;
    }
  }

  // If no recording URL yet, enqueue lookup job (with delay to allow recording to be available)
  if (!data.recording_url && !payload.recordingUrl) {
    console.log(
      `[Telavox] No recording URL found for call ${payload.callId}, enqueueing lookup job`,
    );
    try {
      const exists = await jobExists("recording.lookup", payload.callId);
      if (!exists) {
        await enqueueTelavoxJob({
          job_type: "recording.lookup",
          telavox_call_id: payload.callId,
          telavox_org_id: payload.orgId,
          scheduled_at: new Date(Date.now() + 30000).toISOString(), // 30s delay
        });
      }
    } catch (err) {
      console.error("[Telavox] Failed to enqueue lookup job:", err);
    }
  }
}

async function handleRecordingReady(payload: TelavoxWebhookPayload) {
  // Validate required fields
  if (!payload.orgId || !payload.callId) {
    console.error(
      "[Telavox] Missing required fields in handleRecordingReady:",
      {
        orgId: payload.orgId,
        callId: payload.callId,
      },
    );
    throw new Error("Missing required fields: orgId or callId");
  }

  const supabase = await createServiceClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: session, error } = await (supabase as any)
    .from("telavox_call_sessions")
    .select("id, transcription_status")
    .eq("telavox_call_id", payload.callId)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("[Telavox] handleRecordingReady fetch error", error);
    throw error;
  }

  if (!session) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insertError } = await (supabase as any)
      .from("telavox_call_sessions")
      .insert({
        telavox_call_id: payload.callId,
        telavox_org_id: payload.orgId,
        recording_url: payload.recordingUrl ?? null,
        recording_status: payload.recordingUrl ? "available" : "pending",
      });

    if (insertError) {
      console.error("[Telavox] handleRecordingReady insert error", insertError);
      throw insertError;
    }
    // Enqueue STT request job if recording URL is available
    if (payload.recordingUrl) {
      try {
        const consentEnabled = await getConsentEnabled(supabase);
        const jobType = consentEnabled ? "consent.request" : "stt.request";
        const exists = await jobExists(jobType, payload.callId);
        if (!exists) {
          await enqueueTelavoxJob({
            job_type: jobType,
            telavox_call_id: payload.callId,
            telavox_org_id: payload.orgId,
          });
          console.log(
            `[Telavox] Enqueued ${jobType} job for call ${payload.callId}`,
          );
        }
      } catch (err) {
        console.error(
          "[Telavox] Failed to enqueue recording follow-up job:",
          err,
        );
      }
    }
    return;
  }

  const updates: Record<string, unknown> = {
    recording_url: payload.recordingUrl ?? null,
    recording_status: payload.recordingUrl ? "available" : "pending",
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase as any)
    .from("telavox_call_sessions")
    .update(updates)
    .eq("id", session.id);

  if (updateError) {
    console.error("[Telavox] handleRecordingReady update error", updateError);
    throw updateError;
  }

  // Enqueue STT request job if recording URL is available
  if (payload.recordingUrl) {
    try {
      // Check transcribe_unknown_numbers setting
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: unknownSetting } = await (supabase as any)
        .from("settings")
        .select("value")
        .eq("key", "transcribe_unknown_numbers")
        .single();

      const transcribeUnknown = unknownSetting?.value !== "false"; // Default true if missing

      // Check if call is associated with HubSpot contact
      // We need to re-fetch session to get latest hubspot_contact_id (might have been updated by background matching)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: currentSession } = await (supabase as any)
        .from("telavox_call_sessions")
        .select("hubspot_contact_id")
        .eq("id", session.id)
        .single();

      if (!transcribeUnknown && !currentSession?.hubspot_contact_id) {
        console.log(
          `[Telavox] Skipping transcription for call ${payload.callId}: Unknown number and transcribe_unknown_numbers=false`,
        );
        return;
      }

      const consentEnabled = await getConsentEnabled(supabase);
      const jobType = consentEnabled ? "consent.request" : "stt.request";
      const exists = await jobExists(jobType, payload.callId);
      if (!exists) {
        await enqueueTelavoxJob({
          job_type: jobType,
          telavox_call_id: payload.callId,
          telavox_org_id: payload.orgId,
        });
        console.log(
          `[Telavox] Enqueued ${jobType} job for call ${payload.callId}`,
        );
      }
    } catch (err) {
      console.error(
        "[Telavox] Failed to enqueue recording follow-up job:",
        err,
      );
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const isDebugMode = process.env.DEBUG_TELAVOX_WEBHOOK === "true";
    const disableAuth = process.env.DISABLE_TELAVOX_WEBHOOK_AUTH === "true";

    // Log environment variable status immediately
    console.log("[Telavox] Environment check:", {
      DEBUG_TELAVOX_WEBHOOK: process.env.DEBUG_TELAVOX_WEBHOOK,
      DISABLE_TELAVOX_WEBHOOK_AUTH: process.env.DISABLE_TELAVOX_WEBHOOK_AUTH,
      isDebugMode,
      disableAuth,
    });

    // Security: Block requests if auth is disabled in production
    if (disableAuth) {
      if (process.env.NODE_ENV === "production") {
        console.error(
          "[Telavox] CRITICAL: Cannot disable webhook authentication in production!",
        );
        return NextResponse.json(
          {
            error: "Security configuration error",
            details:
              "Webhook authentication cannot be disabled in production environment",
          },
          { status: 500, headers: NO_CACHE_HEADERS },
        );
      }

      // Non-production warning
      console.warn(
        "[Telavox] ⚠️ WARNING: Webhook authentication is DISABLED. This should only be used for testing.",
      );
    } else {
      console.log("[Telavox] Webhook authentication is ENABLED");
    }

    // Validate required environment variables
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("[Telavox] SUPABASE_SERVICE_ROLE_KEY is not configured");
      return NextResponse.json(
        {
          error: "Server configuration error",
          details: "Database service key not configured",
        },
        { status: 500, headers: NO_CACHE_HEADERS },
      );
    }

    // Enhanced logging - always log key information for webhook debugging
    const headers = Object.fromEntries(req.headers.entries());
    const headerNames = Object.keys(headers);

    console.log("[Telavox] Incoming webhook request:", {
      method: req.method,
      url: req.url,
      headerNames: headerNames,
      hasBody: !!rawBody,
      bodyLength: rawBody.length,
      authorizationHeader: headers["authorization"] ? "present" : "missing",
      bearerToken: headers["authorization"]?.startsWith("Bearer ")
        ? "present"
        : "missing",
      signatureHeaders: {
        "x-telavox-signature": headers["x-telavox-signature"]
          ? "present"
          : "missing",
        "x-signature": headers["x-signature"] ? "present" : "missing",
        "telavox-signature": headers["telavox-signature"]
          ? "present"
          : "missing",
        signature: headers["signature"] ? "present" : "missing",
      },
      orgIdHeaders: {
        "x-telavox-org-id": headers["x-telavox-org-id"] || "missing",
        "x-telavox-organization-id":
          headers["x-telavox-organization-id"] || "missing",
      },
    });

    let parsed: TelavoxWebhookPayload;
    try {
      parsed = JSON.parse(rawBody);
    } catch (e) {
      console.error("[Telavox] Invalid JSON payload", {
        error: e instanceof Error ? e.message : String(e),
        bodyPreview: rawBody.substring(0, 200),
      });
      return NextResponse.json(
        { error: "Invalid JSON", details: "Failed to parse request body" },
        { status: 400, headers: NO_CACHE_HEADERS },
      );
    }

    // Log payload structure (always, but sanitized)
    const payloadKeys = Object.keys(parsed);
    console.log("[Telavox] Payload structure:", {
      keys: payloadKeys,
      hasEventType: "eventType" in parsed,
      eventType: parsed.eventType,
    });

    // Extract orgId from multiple possible locations
    const orgIdAttempts = {
      orgId: parsed.orgId,
      org_id: parsed.org_id,
      organizationId: parsed.organizationId,
      organisation_id: parsed.organisation_id,
      organization_id: parsed.organization_id,
      headerOrgId: req.headers.get("x-telavox-org-id"),
      headerOrganizationId: req.headers.get("x-telavox-organization-id"),
    };

    const orgId =
      parsed.orgId ||
      parsed.org_id ||
      parsed.organizationId ||
      parsed.organisation_id ||
      parsed.organization_id ||
      req.headers.get("x-telavox-org-id") ||
      req.headers.get("x-telavox-organization-id");

    console.log("[Telavox] OrgId extraction:", {
      extracted: orgId || "NOT FOUND",
      attempts: orgIdAttempts,
    });

    if (!orgId) {
      console.error(
        "[Telavox] Missing orgId - all extraction attempts failed:",
        {
          payloadKeys,
          headerNames,
          orgIdAttempts,
        },
      );
      return NextResponse.json(
        {
          error: "Missing orgId",
          details: "Could not find organization ID in payload or headers",
        },
        { status: 400, headers: NO_CACHE_HEADERS },
      );
    }

    // Skip authentication if disabled (for testing only)
    if (disableAuth) {
      console.warn(
        "[Telavox] ⚠️ AUTHENTICATION DISABLED - Bypassing all auth checks",
      );
      console.log(
        "[Telavox] Continuing without authentication verification...",
      );
    } else {
      console.log(
        "[Telavox] Authentication enabled - proceeding with verification",
      );

      // Validate Supabase service role key is configured
      if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.error("[Telavox] SUPABASE_SERVICE_ROLE_KEY is not configured");
        return NextResponse.json(
          {
            error: "Server configuration error",
            details: "Database service key not configured",
          },
          { status: 500, headers: NO_CACHE_HEADERS },
        );
      }

      // Get org config first (needed for both auth methods)
      let supabase;
      try {
        supabase = await createServiceClient();
      } catch (dbError) {
        console.error("[Telavox] Failed to create Supabase client:", dbError);
        return NextResponse.json(
          {
            error: "Database connection error",
            details: "Failed to connect to database",
          },
          { status: 500, headers: NO_CACHE_HEADERS },
        );
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: config, error: configError } = await (supabase as any)
        .from("telavox_org_configs")
        .select("webhook_secret")
        .eq("telavox_org_id", orgId)
        .single();

      if (configError) {
        console.error("[Telavox] Database query error:", {
          orgId,
          error: configError.message,
          errorCode: configError.code,
          errorDetails: configError.details,
        });

        // Distinguish between "not found" and other database errors
        if (configError.code === "PGRST116") {
          return NextResponse.json(
            {
              error: "Organization not configured",
              details: `No configuration found for orgId: ${orgId}`,
            },
            { status: 401, headers: NO_CACHE_HEADERS },
          );
        }

        return NextResponse.json(
          {
            error: "Database error",
            details: "Failed to query organization configuration",
          },
          { status: 500, headers: NO_CACHE_HEADERS },
        );
      }

      if (!config || !config.webhook_secret) {
        console.error("[Telavox] Org config missing webhook_secret:", {
          orgId,
          configExists: !!config,
        });
        return NextResponse.json(
          {
            error: "Organization not configured",
            details: `No webhook secret configured for orgId: ${orgId}`,
          },
          { status: 401, headers: NO_CACHE_HEADERS },
        );
      }

      // Try multiple authentication methods in order of preference
      const authHeader = req.headers.get("authorization");
      const bearerToken = authHeader?.startsWith("Bearer ")
        ? authHeader.substring(7).trim()
        : null;

      const signatureHeaders = {
        "x-telavox-signature": req.headers.get("x-telavox-signature"),
        "x-signature": req.headers.get("x-signature"),
        "telavox-signature": req.headers.get("telavox-signature"),
        signature: req.headers.get("signature"),
      };

      const hasSignatureHeader = Object.values(signatureHeaders).some(
        (h) => !!h,
      );
      const hasBearerToken = !!bearerToken;

      // Try multiple authentication methods - try all and succeed if any match
      let authPassed = false;
      let authError: string | null = null;

      // Method 1: Bearer token authentication (JWT) - per Telavox API docs
      if (hasBearerToken) {
        console.log("[Telavox] Attempting Bearer token (JWT) authentication");

        // Verify Bearer token matches webhook_secret
        // Note: Telavox may send JWT or a simple token - we'll compare against webhook_secret
        if (safeCompare(bearerToken, config.webhook_secret)) {
          console.log("[Telavox] Bearer token authentication passed");
          authPassed = true;
        } else {
          console.warn(
            "[Telavox] Bearer token authentication failed (will try other methods):",
            {
              tokenLength: bearerToken.length,
              expectedLength: config.webhook_secret.length,
              tokenPreview: bearerToken.substring(0, 8) + "...",
            },
          );
          authError = "Bearer token does not match webhook_secret";
        }
      }

      // Method 2: HMAC signature verification
      if (!authPassed && hasSignatureHeader) {
        console.log("[Telavox] Attempting HMAC signature verification");
        const sigResult = await verifyTelavoxSignature(
          req,
          rawBody,
          String(orgId),
        );

        if (sigResult.valid) {
          console.log("[Telavox] HMAC signature verification passed");
          authPassed = true;
        } else {
          console.warn(
            "[Telavox] HMAC signature verification failed (will try other methods):",
            {
              error: sigResult.error,
              signatureHeaders,
            },
          );
          authError = sigResult.error || "HMAC signature verification failed";
        }
      }

      // Method 3: Payload-based secret verification (fallback)
      if (!authPassed) {
        console.log("[Telavox] Attempting payload-based secret verification");

        const receivedSecret =
          parsed.WEBHOOK_SECRET ||
          parsed.webhook_secret ||
          parsed.webhookSecret;

        if (receivedSecret) {
          // Use constant-time comparison for security
          const expectedSecret = config.webhook_secret;
          if (safeCompare(String(receivedSecret), String(expectedSecret))) {
            console.log("[Telavox] Payload secret verification passed");
            authPassed = true;
          } else {
            console.warn("[Telavox] Payload secret mismatch:", {
              expectedLength: expectedSecret.length,
              receivedLength: String(receivedSecret).length,
              receivedPreview: String(receivedSecret).substring(0, 8) + "...",
            });
            authError = "Payload secret does not match configured secret";
          }
        } else {
          authError = "No authentication method provided";
        }
      }

      // If all authentication methods failed, reject the request
      if (!authPassed) {
        console.error("[Telavox] All authentication methods failed:", {
          hasBearerToken,
          hasSignatureHeader,
          authError,
          availableFields: payloadKeys,
        });
        return NextResponse.json(
          {
            error: "Authentication failed",
            details: authError || "No valid authentication method found",
          },
          { status: 401, headers: NO_CACHE_HEADERS },
        );
      }
    }

    if (isDebugMode) {
      console.log(
        "[DEBUG] Telavox webhook - Full payload:",
        JSON.stringify(parsed, null, 2),
      );
      console.log("[DEBUG] Telavox webhook - All headers:", headers);
    }

    // Map Telavox event names to our internal event types
    const mappedEventType = mapTelavoxEvent(parsed.eventType);
    if (!mappedEventType) {
      console.warn("[Telavox] Unknown event type, ignoring:", parsed.eventType);
      return NextResponse.json({ ok: true }, { headers: NO_CACHE_HEADERS }); // Acknowledge but don't process
    }

    // Prefer LID (Telavox unique call identifier) as callId, fallback to composite
    const callId =
      parsed.LID ||
      parsed.callId ||
      `${parsed.from || "unknown"}-${parsed.to || "unknown"}-${
        parsed.timestamp || Date.now()
      }`;

    if (isDebugMode) {
      console.log("[DEBUG] Telavox webhook - Mapped event:", mappedEventType);
      console.log("[DEBUG] Telavox webhook - Call ID:", callId);
    }

    // Build normalized payload
    const normalizedPayload: TelavoxWebhookPayload = {
      ...parsed,
      orgId: String(orgId),
      callId,
      eventType: mappedEventType,
    };

    // --- ENHANCEMENT: Log webhook and check settings ---
    const supabase = await createServiceClient();

    // 1. Log webhook to database
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("webhook_logs").insert({
      event_type: mappedEventType,
      payload: normalizedPayload,
      source_ip: req.headers.get("x-forwarded-for") || undefined,
      processed: false,
    });

    // 2. Check if system is enabled
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: systemSetting } = await (supabase as any)
      .from("settings")
      .select("value")
      .eq("key", "system_enabled")
      .single();

    if (systemSetting?.value === "false") {
      console.log(
        "[Telavox] System is disabled (paused). Skipping processing.",
      );
      return NextResponse.json({ ok: true }, { headers: NO_CACHE_HEADERS });
    }

    // 3. Check for blocked numbers (if phone numbers are present)
    const fromNum = normalizedPayload.from
      ? normalizePhoneToE164(normalizedPayload.from)
      : null;
    const toNum = normalizedPayload.to
      ? normalizePhoneToE164(normalizedPayload.to)
      : null;

    if (fromNum || toNum) {
      const numbersToCheck = [fromNum, toNum].filter(Boolean) as string[];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: blocked } = await (supabase as any)
        .from("blocked_numbers")
        .select("phone_number")
        .in("phone_number", numbersToCheck)
        .maybeSingle();

      if (blocked) {
        console.log(
          `[Telavox] Call blocked (number ${blocked.phone_number} is in blocklist). Skipping.`,
        );
        // Mark session as skipped if it exists, or create one as skipped?
        // For now just skip processing to avoid transcription.
        return NextResponse.json({ ok: true }, { headers: NO_CACHE_HEADERS });
      }
    }
    // --------------------------------------------------

    switch (mappedEventType) {
      case "call.started":
        await handleCallStarted(normalizedPayload);
        break;
      case "call.answered":
        await handleCallAnswered(normalizedPayload);
        break;
      case "call.ended":
        await handleCallEnded(normalizedPayload);
        break;
      case "call.recording.ready":
        await handleRecordingReady(normalizedPayload);
        break;
    }

    return NextResponse.json({ ok: true }, { headers: NO_CACHE_HEADERS });
  } catch (error) {
    console.error("[Telavox] Webhook error", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;

    console.error("[Telavox] Error details:", {
      message: errorMessage,
      stack: errorStack,
    });

    return NextResponse.json(
      {
        error: "Internal server error",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
      },
      { status: 500, headers: NO_CACHE_HEADERS },
    );
  }
}

// ElevenLabs webhook integration for Telavox is implemented in app/api/webhooks/elevenlabs/route.ts,
// which should:
// - Match telavox_call_sessions by elevenlabs_job_id
// - Update transcription_status, transcript, summary, sentiment, insights_json
// - Invoke syncTelavoxCallToHubSpot(telavox_call_id) for HubSpot sync.
