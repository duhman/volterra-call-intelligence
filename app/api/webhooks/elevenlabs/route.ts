import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { analyzeConversation } from "@/lib/analysis/conversationAnalyzer";
import { ApiErrors, logApiError } from "@/lib/utils/api-errors";

/**
 * ElevenLabs Transcription Webhook
 *
 * Handles post_call_transcription events from ElevenLabs Scribe API.
 * This is triggered after Telavox recordings are sent for transcription.
 *
 * Flow:
 * 1. Telavox webhook receives call.ended → enqueues recording.lookup job
 * 2. Worker finds recording → uploads to storage → sends to ElevenLabs
 * 3. ElevenLabs transcribes → sends webhook here
 * 4. This webhook updates telavox_call_sessions → enqueues hubspot.sync job
 */

// Type definitions for ElevenLabs webhook payload
interface ElevenLabsWebhookPayload {
  type:
    | "post_call_transcription"
    | "post_call_audio"
    | "call_initiation_failure";
  data: {
    agent_id: string;
    conversation_id: string;
    status?: string;
    transcript?: Array<{ role: string; message: string }>;
    metadata?: {
      telavox_call_id?: string;
      [key: string]: unknown;
    };
    has_audio?: boolean;
    has_user_audio?: boolean;
    has_response_audio?: boolean;
    duration_seconds?: number;
  };
  event_timestamp?: number;
}

export async function POST(request: NextRequest) {
  try {
    // Verify HMAC signature
    const signature = request.headers.get("elevenlabs-signature");
    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }

    const body = await request.text();
    const secret = process.env.WEBHOOK_SECRET || "";

    // Parse signature - ElevenLabs format: "t=timestamp,v0=hash"
    const signatureParts = signature.split(",");
    const timestampPart = signatureParts.find((s) => s.startsWith("t="));
    const hashPart = signatureParts.find((s) => s.startsWith("v0="));

    if (!timestampPart || !hashPart) {
      console.error("[ElevenLabs] Invalid signature format:", signature);
      return NextResponse.json(
        { error: "Invalid signature format" },
        { status: 401 },
      );
    }

    const timestamp = parseInt(timestampPart.substring(2));
    const receivedHash = hashPart.substring(3);

    // Validate timestamp (within 5 minutes)
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > 300) {
      return NextResponse.json({ error: "Timestamp too old" }, { status: 401 });
    }

    // Verify signature
    const fullPayload = `${timestamp}.${body}`;
    const computedHash = crypto
      .createHmac("sha256", secret)
      .update(fullPayload)
      .digest("hex");

    if (computedHash !== receivedHash) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    let data: ElevenLabsWebhookPayload;
    try {
      data = JSON.parse(body) as ElevenLabsWebhookPayload;
    } catch (parseError) {
      logApiError(parseError, {
        route: "/api/webhooks/elevenlabs",
        method: "POST",
      });
      return NextResponse.json(
        ApiErrors.badRequest("Invalid JSON payload").toJSON(),
        { status: 400 },
      );
    }

    // Only handle Telavox transcription completions
    if (
      data.type === "post_call_transcription" &&
      data.data?.metadata?.telavox_call_id
    ) {
      // Log audio availability fields if present (for monitoring)
      if (
        data.data.has_audio !== undefined ||
        data.data.has_user_audio !== undefined ||
        data.data.has_response_audio !== undefined
      ) {
        console.log("[ElevenLabs][Telavox] Audio availability:", {
          has_audio: data.data.has_audio,
          has_user_audio: data.data.has_user_audio,
          has_response_audio: data.data.has_response_audio,
          conversation_id: data.data.conversation_id,
        });
      }

      const supabase = await createServiceClient();
      const conversationData = data.data;
      const telavoxCallId = conversationData.metadata
        ?.telavox_call_id as string;

      if (!telavoxCallId) {
        console.error(
          "[ElevenLabs][Telavox] Missing telavox_call_id in metadata",
        );
        return NextResponse.json({ status: "error" }, { status: 400 });
      }

      // Build flat transcript text from turns
      const transcript: string =
        conversationData.transcript
          ?.map(
            (turn: { role: string; message: string }) =>
              `${turn.role}: ${turn.message}`,
          )
          .join("\n") || "";

      // Analyze transcript
      const analysis = await analyzeConversation(transcript);

      // Update Telavox call session with transcription + insights
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase as any)
        .from("telavox_call_sessions")
        .update({
          transcription_status: "completed",
          transcript,
          summary: analysis.summary,
          sentiment: analysis.sentiment,
          insights_json: {
            keyPoints: analysis.keyPoints,
            nextSteps: analysis.nextSteps,
            dealStage: analysis.dealStage,
            competitorMentions: analysis.competitorMentions,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("telavox_call_id", telavoxCallId);

      if (updateError) {
        console.error(
          "[ElevenLabs][Telavox] Failed to update telavox_call_sessions",
          updateError,
        );
        // Mark as failed for observability
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from("telavox_call_sessions")
          .update({
            transcription_status: "failed",
            last_error:
              updateError.message || "Failed to persist transcription",
            updated_at: new Date().toISOString(),
          })
          .eq("telavox_call_id", telavoxCallId);
        return NextResponse.json({ status: "error" }, { status: 500 });
      }

      // Enqueue HubSpot sync job (idempotent; no-op if already synced)
      try {
        const { enqueueTelavoxJob, jobExists } =
          await import("@/lib/telavox/job-queue");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: sessionData } = await (supabase as any)
          .from("telavox_call_sessions")
          .select("telavox_org_id")
          .eq("telavox_call_id", telavoxCallId)
          .single();

        if (sessionData?.telavox_org_id) {
          const exists = await jobExists("hubspot.sync", telavoxCallId);
          if (!exists) {
            await enqueueTelavoxJob({
              job_type: "hubspot.sync",
              telavox_call_id: telavoxCallId,
              telavox_org_id: sessionData.telavox_org_id,
            });
            console.log(
              `[ElevenLabs][Telavox] Enqueued HubSpot sync job for call ${telavoxCallId}`,
            );
          }
        }
      } catch (e: unknown) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        console.error(
          `[ElevenLabs][Telavox] Failed to enqueue HubSpot sync job for call ${telavoxCallId}:`,
          errorMsg,
        );
        // Do not fail webhook; sync can be retried separately
      }

      return NextResponse.json({ status: "received" });
    }

    // Log and ignore non-Telavox events
    console.log("[ElevenLabs] Ignoring non-Telavox event:", data.type);
    return NextResponse.json({ status: "received" });
  } catch (error) {
    logApiError(error, {
      route: "/api/webhooks/elevenlabs",
      method: "POST",
    });

    const errorResponse = ApiErrors.internalServerError(
      "Failed to process webhook",
      process.env.NODE_ENV === "development" ? error : undefined,
    );

    return NextResponse.json(errorResponse.toJSON(), {
      status: errorResponse.statusCode,
    });
  }
}
