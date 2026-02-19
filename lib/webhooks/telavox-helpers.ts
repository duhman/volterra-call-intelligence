/**
 * Shared Telavox webhook helper functions
 */

import { createServiceClient } from "@/lib/supabase/server";

/**
 * Normalize phone number to E.164 format
 */
export function normalizePhoneToE164(phoneNumber: string): string {
  let normalized = phoneNumber.trim();
  normalized = normalized.replace(/[\s\-\(\)\.]/g, "");
  const hasPlus = normalized.startsWith("+");
  if (hasPlus) {
    normalized = "+" + normalized.substring(1).replace(/\D/g, "");
  } else {
    normalized = normalized.replace(/\D/g, "");
  }
  return normalized;
}

/**
 * Fetch recording URL from Telavox API using call history endpoint
 * Queries /calls API with withRecordings=true to find recordingId, then constructs URL
 *
 * IMPORTANT: Telavox API is user-scoped - each token only sees that user's calls.
 * We first look up the agent's token from telavox_api_keys, falling back to org token.
 */
export async function fetchRecordingUrlFromTelavox(
  lid: string,
  orgId: string,
): Promise<string | null> {
  const supabase = await createServiceClient();

  // First, get the call session to find the agent email
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: session } = await (supabase as any)
    .from("telavox_call_sessions")
    .select("agent_user_id, from_number, to_number, started_at")
    .eq("telavox_call_id", lid)
    .single();

  let accessToken: string | null = null;
  let tokenSource = "none";

  // Try to get agent-specific token first (required for user-scoped Telavox API)
  if (session?.agent_user_id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: agentKey } = await (supabase as any)
      .from("telavox_api_keys")
      .select("api_key")
      .eq("agent_email", session.agent_user_id)
      .single();

    if (agentKey?.api_key) {
      accessToken = agentKey.api_key;
      tokenSource = `agent:${session.agent_user_id}`;
    }
  }

  // Fall back to org-level token (may not work for user-scoped endpoints)
  if (!accessToken) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: config } = await (supabase as any)
      .from("telavox_org_configs")
      .select("access_token")
      .eq("telavox_org_id", orgId)
      .single();

    if (config?.access_token) {
      accessToken = config.access_token;
      tokenSource = `org:${orgId}`;
    }
  }

  if (!accessToken) {
    console.warn(
      `[Telavox] No access token found for LID ${lid} (agent: ${session?.agent_user_id}, org: ${orgId})`,
    );
    return null;
  }

  console.log(`[Telavox] Using token from ${tokenSource} for LID ${lid}`);

  const apiBase = "https://api.telavox.se";

  try {
    // Query call history with recordings enabled
    // Note: This returns last 30 calls for the authenticated user
    const callsResponse = await fetch(`${apiBase}/calls?withRecordings=true`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!callsResponse.ok) {
      const errorText = await callsResponse.text();
      console.warn(
        `[Telavox] API call history request failed (${callsResponse.status}): ${errorText}`,
      );
      return null;
    }

    interface TelavoxCall {
      datetimeISO?: string;
      datetime?: string;
      number?: string;
      numberE164?: string;
      recordingId?: string;
      duration?: number;
    }

    const callsData = (await callsResponse.json()) as {
      incoming?: TelavoxCall[];
      outgoing?: TelavoxCall[];
    };

    // Search through incoming and outgoing calls for matching LID
    const allCalls = [
      ...(callsData.incoming || []),
      ...(callsData.outgoing || []),
    ];

    // Use session data already fetched above for matching
    if (session) {
      const { from_number, to_number, started_at } = session;

      // Normalize phone numbers for comparison
      const normalizedFrom = from_number
        ? normalizePhoneToE164(from_number)
        : null;
      const normalizedTo = to_number ? normalizePhoneToE164(to_number) : null;

      // Find matching call by phone numbers and approximate timestamp
      // Prefer calls with duration > 0 (connected calls) and better time matches
      const matchingCalls = allCalls
        .map((call: TelavoxCall) => {
          const callTime = new Date(
            call.datetimeISO || call.datetime || "",
          ).getTime();
          const sessionTime = started_at ? new Date(started_at).getTime() : 0;
          const timeDiff = Math.abs(callTime - sessionTime);

          // Use numberE164 from Telavox API (already in E.164 format)
          // Fall back to normalizing the number field if numberE164 not available
          const normalizedCallNumber =
            call.numberE164 ||
            (call.number ? normalizePhoneToE164(call.number) : null);

          // Match if within 10 minutes and phone numbers match
          const phoneMatch =
            (normalizedFrom && normalizedCallNumber === normalizedFrom) ||
            (normalizedTo && normalizedCallNumber === normalizedTo);

          const isWithinTimeWindow = timeDiff < 10 * 60 * 1000; // 10 minutes tolerance

          if (phoneMatch && isWithinTimeWindow && call.recordingId) {
            return {
              call,
              timeDiff,
              duration: call.duration || 0,
            };
          }
          return null;
        })
        .filter(
          (
            match,
          ): match is {
            call: TelavoxCall;
            timeDiff: number;
            duration: number;
          } => match !== null,
        )
        .sort((a, b) => {
          // Prefer calls with duration > 0 (connected calls)
          if (a.duration > 0 && b.duration === 0) return -1;
          if (a.duration === 0 && b.duration > 0) return 1;
          // Then prefer better time matches
          return a.timeDiff - b.timeDiff;
        });

      if (matchingCalls.length > 0) {
        const bestMatch = matchingCalls[0];
        // Construct recording URL - Telavox API serves recordings at this endpoint
        // NOTE: This endpoint requires Bearer token auth. The recording will be mirrored
        // to Supabase Storage with authentication before being passed to ElevenLabs.
        const recordingUrl = `${apiBase}/recordings/${bestMatch.call.recordingId}`;
        console.log(
          `[Telavox] Found recording URL via API for LID ${lid}: ${recordingUrl} (matched ${matchingCalls.length} candidate(s), selected best match with duration=${bestMatch.duration}s, timeDiff=${Math.round(bestMatch.timeDiff / 1000)}s)`,
        );
        return recordingUrl;
      }
    }

    // Fallback: if any call has a recordingId and we can't match precisely,
    // we could return the first one, but that's risky. Better to return null.
    return null;
  } catch (error: unknown) {
    console.error(
      `[Telavox] Error fetching recording URL from API for LID ${lid}:`,
      error,
    );
    return null;
  }
}
