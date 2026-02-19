/**
 * Telavox Worker Cron Job
 * Processes pending jobs from telavox_job_queue
 * Should be called periodically (e.g., every minute via Vercel Cron)
 */

import { NextRequest, NextResponse } from "next/server";
import { getPendingJobs, type TelavoxJobType } from "@/lib/telavox/job-queue";
import {
  processRecordingLookupJob,
  processSttRequestJob,
  processHubSpotSyncJob,
} from "@/lib/telavox/workers";
import {
  processConsentRequestJob,
  processConsentReminderJob,
  processConsentExpireJob,
} from "@/lib/telavox/consent-workers";

export const dynamic = "force-dynamic";

// Maximum number of jobs to process per cron run
const MAX_JOBS_PER_RUN = 10;

export async function GET(req: NextRequest) {
  try {
    // Verify cron secret if configured
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if table exists by attempting a simple query
    const { createServiceClient } = await import("@/lib/supabase/server");
    const supabase = await createServiceClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: tableCheckError } = await (supabase as any)
      .from("telavox_job_queue")
      .select("id")
      .limit(1);

    if (tableCheckError) {
      const errorMsg = tableCheckError.message || String(tableCheckError);
      if (
        errorMsg.includes("does not exist") ||
        errorMsg.includes("schema cache")
      ) {
        console.warn(
          "[Telavox Cron] Table telavox_job_queue does not exist. Migration 012_telavox_job_queue.sql needs to be applied.",
        );
        return NextResponse.json(
          {
            success: false,
            error:
              "Table telavox_job_queue does not exist. Please run migration 012_telavox_job_queue.sql",
            timestamp: new Date().toISOString(),
          },
          { status: 503 },
        );
      }
      throw tableCheckError;
    }

    const results = {
      processed: 0,
      errors: [] as string[],
      jobs: {
        "recording.lookup": 0,
        "consent.request": 0,
        "consent.reminder": 0,
        "consent.expire": 0,
        "stt.request": 0,
        "hubspot.sync": 0,
      } as Record<TelavoxJobType, number>,
    };

    // Process each job type in order:
    // 1. recording.lookup - Find recording URL from Telavox
    // 2. consent.* - Ask for transcription approval in Slack
    // 3. stt.request - Request transcription from ElevenLabs
    // 4. hubspot.sync - Sync to HubSpot CRM
    const jobTypes: TelavoxJobType[] = [
      "recording.lookup",
      "consent.request",
      "consent.reminder",
      "consent.expire",
      "stt.request",
      "hubspot.sync",
    ];

    for (const jobType of jobTypes) {
      try {
        const jobs = await getPendingJobs(jobType, MAX_JOBS_PER_RUN);
        results.jobs[jobType] = jobs.length;

        for (const job of jobs) {
          try {
            switch (jobType) {
              case "recording.lookup":
                await processRecordingLookupJob(job);
                break;
              case "consent.request":
                await processConsentRequestJob(job);
                break;
              case "consent.reminder":
                await processConsentReminderJob(job);
                break;
              case "consent.expire":
                await processConsentExpireJob(job);
                break;
              case "stt.request":
                await processSttRequestJob(job);
                break;
              case "hubspot.sync":
                await processHubSpotSyncJob(job);
                break;
            }
            results.processed++;
          } catch (error: unknown) {
            const errorMsg = `Job ${job.id} (${jobType}): ${error instanceof Error ? error.message : String(error)}`;
            results.errors.push(errorMsg);
            console.error(`[Telavox Cron] ${errorMsg}`);
          }
        }
      } catch (error: unknown) {
        const errorMsg = `Failed to process ${jobType}: ${error instanceof Error ? error.message : String(error)}`;
        results.errors.push(errorMsg);
        console.error(`[Telavox Cron] ${errorMsg}`);
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error("[Telavox Cron] Fatal error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
