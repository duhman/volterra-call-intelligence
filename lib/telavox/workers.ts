/**
 * Telavox Worker Functions
 * Process background jobs for recording lookup, transcription, and HubSpot sync
 */

import { createServiceClient } from "@/lib/supabase/server";
import {
  uploadRecordingFromUrl,
  getSignedRecordingUrl,
} from "@/lib/supabase/storage";
import { startJob, completeJob, failJob, type TelavoxJob } from "./job-queue";
import { fetchRecordingUrlFromTelavox } from "@/lib/webhooks/telavox-helpers";
import { syncTelavoxCallToHubSpot } from "@/lib/integrations/workflows/sync-telavox-call-to-hubspot";

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
 * Worker: Lookup recording URL from Telavox API
 */
export async function processRecordingLookupJob(
  job: TelavoxJob,
): Promise<void> {
  await startJob(job.id);

  try {
    const recordingUrl = await fetchRecordingUrlFromTelavox(
      job.telavox_call_id,
      job.telavox_org_id,
    );

    if (!recordingUrl) {
      throw new Error(
        `Recording URL not found for call ${job.telavox_call_id} via Telavox API`,
      );
    }

    const supabase = await createServiceClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from("telavox_call_sessions")
      .update({
        recording_url: recordingUrl,
        recording_status: "available",
        updated_at: new Date().toISOString(),
      })
      .eq("telavox_call_id", job.telavox_call_id);

    if (updateError) {
      throw new Error(`Failed to update recording_url: ${updateError.message}`);
    }

    const consentEnabled = await getConsentEnabled(supabase);
    const jobType = consentEnabled ? "consent.request" : "stt.request";

    // Enqueue follow-up job
    const { enqueueTelavoxJob } = await import("./job-queue");
    await enqueueTelavoxJob({
      job_type: jobType,
      telavox_call_id: job.telavox_call_id,
      telavox_org_id: job.telavox_org_id,
    });

    await completeJob(job.id);
    console.log(
      `[Telavox Worker] Recording lookup completed for call ${job.telavox_call_id}, recording URL: ${recordingUrl.substring(0, 100)}...`,
    );
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(
      `[Telavox Worker] Recording lookup failed for call ${job.telavox_call_id}:`,
      errorMsg,
    );
    await failJob(job.id, errorMsg);
    throw error;
  }
}

/**
 * Worker: Mirror recording to Supabase Storage and start ElevenLabs transcription
 */
export async function processSttRequestJob(job: TelavoxJob): Promise<void> {
  await startJob(job.id);

  try {
    const supabase = await createServiceClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: session, error: sessionError } = await (supabase as any)
      .from("telavox_call_sessions")
      .select(
        "id, telavox_org_id, recording_url, transcription_status, consent_status, elevenlabs_job_id",
      )
      .eq("telavox_call_id", job.telavox_call_id)
      .single();

    if (sessionError || !session) {
      throw new Error(
        `Session not found for call ${job.telavox_call_id}: ${sessionError?.message || "not found"}`,
      );
    }

    if (!session.recording_url) {
      throw new Error(
        `Recording URL not available for call ${job.telavox_call_id}`,
      );
    }

    if (session.transcription_status === "in_progress") {
      console.log(
        `[Telavox Worker] Transcription already in progress for call ${job.telavox_call_id}`,
      );
      await completeJob(job.id);
      return;
    }

    const consentEnabled = await getConsentEnabled(supabase);
    if (
      consentEnabled &&
      session.consent_status !== "approved" &&
      session.consent_status !== "not_required"
    ) {
      console.log(
        `[Telavox Worker] Skipping transcription for call ${job.telavox_call_id}: consent not approved`,
      );
      await completeJob(job.id);
      return;
    }

    const apiKey =
      process.env.ELEVENLABS_API_KEY || process.env.ELEVENLABS_API_KEY_DEFAULT;
    if (!apiKey) {
      throw new Error("ELEVENLABS_API_KEY not configured");
    }

    const webhookUrl = `${
      process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL
    }/api/webhooks/elevenlabs`;

    if (!webhookUrl || webhookUrl.includes("undefined")) {
      throw new Error("NEXT_PUBLIC_APP_URL or APP_URL not configured");
    }

    if (!process.env.WEBHOOK_SECRET) {
      throw new Error("WEBHOOK_SECRET not configured");
    }

    // Mirror recording to Supabase Storage if needed
    let audioUrlForStt = session.recording_url;
    const isOurStorageUrl =
      session.recording_url?.includes("/storage/v1/object") ||
      session.recording_url?.includes("supabase.co/storage");

    const isTelavoxApiUrl = session.recording_url?.includes(
      "api.telavox.se/recordings/",
    );

    if (!isOurStorageUrl && session.recording_url && session.telavox_org_id) {
      console.log(
        `[Telavox Worker] Mirroring recording to storage for call ${job.telavox_call_id}`,
      );

      let fetchHeaders: Record<string, string> | undefined;
      if (isTelavoxApiUrl) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: orgConfig, error: configError } = await (supabase as any)
          .from("telavox_org_configs")
          .select("access_token")
          .eq("telavox_org_id", session.telavox_org_id)
          .single();

        if (configError || !orgConfig?.access_token) {
          throw new Error(
            `Missing access_token for org ${session.telavox_org_id}`,
          );
        }

        fetchHeaders = {
          Authorization: `Bearer ${orgConfig.access_token}`,
        };
      }

      const storagePath = `telavox/${session.telavox_org_id}/${job.telavox_call_id}.mp3`;
      await uploadRecordingFromUrl(
        session.recording_url,
        storagePath,
        fetchHeaders,
      );

      audioUrlForStt = await getSignedRecordingUrl(storagePath, 3600);
      console.log(
        `[Telavox Worker] Successfully mirrored recording and generated signed URL for call ${job.telavox_call_id}`,
      );
    }

    // Create ElevenLabs transcription job (EU endpoint for GDPR compliance)
    const apiBase =
      process.env.ELEVENLABS_API_BASE ||
      "https://api.eu.residency.elevenlabs.io";
    const transcriptionRes = await fetch(`${apiBase}/v1/transcriptions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        audio_url: audioUrlForStt,
        metadata: { telavox_call_id: job.telavox_call_id },
        webhook_url: webhookUrl,
      }),
    });

    if (!transcriptionRes.ok) {
      const errorText = await transcriptionRes.text();
      throw new Error(
        `ElevenLabs API error (${transcriptionRes.status}): ${errorText}`,
      );
    }

    const jobResponse = (await transcriptionRes.json()) as { id: string };
    if (!jobResponse?.id) {
      throw new Error("ElevenLabs job ID missing from response");
    }

    // Update session with job ID
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from("telavox_call_sessions")
      .update({
        elevenlabs_job_id: jobResponse.id,
        transcription_status: "in_progress",
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.id);

    if (updateError) {
      throw new Error(`Failed to update session: ${updateError.message}`);
    }

    await completeJob(job.id);
    console.log(
      `[Telavox Worker] STT job created for call ${job.telavox_call_id}, ElevenLabs job ID: ${jobResponse.id}, audio URL: ${audioUrlForStt.substring(0, 100)}...`,
    );
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(
      `[Telavox Worker] STT request failed for call ${job.telavox_call_id}:`,
      errorMsg,
    );

    // Update session error state
    try {
      const supabase = await createServiceClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("telavox_call_sessions")
        .update({
          transcription_status: "failed",
          last_error: errorMsg.substring(0, 500),
          updated_at: new Date().toISOString(),
        })
        .eq("telavox_call_id", job.telavox_call_id);
    } catch (updateErr) {
      console.error(
        "[Telavox Worker] Failed to update session error:",
        updateErr,
      );
    }

    await failJob(job.id, errorMsg);
    throw error;
  }
}

/**
 * Worker: Sync completed transcription to HubSpot
 */
export async function processHubSpotSyncJob(job: TelavoxJob): Promise<void> {
  await startJob(job.id);

  try {
    await syncTelavoxCallToHubSpot(job.telavox_call_id);
    await completeJob(job.id);
    console.log(
      `[Telavox Worker] HubSpot sync completed for call ${job.telavox_call_id}`,
    );
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(
      `[Telavox Worker] HubSpot sync failed for call ${job.telavox_call_id}:`,
      errorMsg,
    );
    await failJob(job.id, errorMsg);
    throw error;
  }
}
