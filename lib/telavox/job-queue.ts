/**
 * Telavox Job Queue Operations
 * Durable background jobs for recording lookup, transcription, and HubSpot sync
 */

import { createServiceClient } from "@/lib/supabase/server";

export type TelavoxJobType =
  | "recording.lookup"
  | "stt.request"
  | "hubspot.sync"
  | "consent.request"
  | "consent.reminder"
  | "consent.expire";
export type TelavoxJobStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "failed";

export interface TelavoxJob {
  id: string;
  job_type: TelavoxJobType;
  telavox_call_id: string;
  telavox_org_id: string;
  status: TelavoxJobStatus;
  attempts: number;
  max_attempts: number;
  error_message: string | null;
  job_data: Record<string, unknown> | null;
  scheduled_at: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TelavoxJobInsert {
  job_type: TelavoxJobType;
  telavox_call_id: string;
  telavox_org_id: string;
  job_data?: Record<string, unknown>;
  scheduled_at?: string;
  max_attempts?: number;
}

/**
 * Enqueue a new job
 */
export async function enqueueTelavoxJob(
  job: TelavoxJobInsert,
): Promise<TelavoxJob> {
  const supabase = await createServiceClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("telavox_job_queue")
    .insert({
      job_type: job.job_type,
      telavox_call_id: job.telavox_call_id,
      telavox_org_id: job.telavox_org_id,
      job_data: job.job_data || null,
      scheduled_at: job.scheduled_at || new Date().toISOString(),
      max_attempts: job.max_attempts || 3,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to enqueue job: ${error.message}`);
  }

  return data as TelavoxJob;
}

/**
 * Get pending jobs of a specific type, ordered by scheduled_at
 */
export async function getPendingJobs(
  jobType: TelavoxJobType,
  limit: number = 10,
): Promise<TelavoxJob[]> {
  const supabase = await createServiceClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("telavox_job_queue")
    .select("*")
    .eq("job_type", jobType)
    .eq("status", "pending")
    .lte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to get pending jobs: ${error.message}`);
  }

  return (data || []) as TelavoxJob[];
}

/**
 * Mark a job as in_progress
 */
export async function startJob(jobId: string): Promise<void> {
  const supabase = await createServiceClient();

  // Get current attempts first
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: job } = await (supabase as any)
    .from("telavox_job_queue")
    .select("attempts")
    .eq("id", jobId)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("telavox_job_queue")
    .update({
      status: "in_progress",
      started_at: new Date().toISOString(),
      attempts: (job?.attempts || 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  if (error) {
    throw new Error(`Failed to start job: ${error.message}`);
  }
}

/**
 * Mark a job as completed
 */
export async function completeJob(jobId: string): Promise<void> {
  const supabase = await createServiceClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("telavox_job_queue")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  if (error) {
    throw new Error(`Failed to complete job: ${error.message}`);
  }
}

/**
 * Mark a job as failed
 */
export async function failJob(
  jobId: string,
  errorMessage: string,
): Promise<void> {
  const supabase = await createServiceClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const job = await (supabase as any)
    .from("telavox_job_queue")
    .select("attempts, max_attempts")
    .eq("id", jobId)
    .single();

  const attempts = job.data?.attempts || 0;
  const maxAttempts = job.data?.max_attempts || 3;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("telavox_job_queue")
    .update({
      status: attempts >= maxAttempts ? "failed" : "pending",
      error_message: errorMessage,
      scheduled_at:
        attempts < maxAttempts
          ? new Date(Date.now() + Math.pow(2, attempts) * 60000).toISOString() // Exponential backoff
          : undefined,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  if (error) {
    throw new Error(`Failed to fail job: ${error.message}`);
  }
}

/**
 * Check if a job already exists for a call (idempotency)
 */
export async function jobExists(
  jobType: TelavoxJobType,
  telavoxCallId: string,
  status?: TelavoxJobStatus,
): Promise<boolean> {
  const supabase = await createServiceClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from("telavox_job_queue")
    .select("id", { count: "exact", head: true })
    .eq("job_type", jobType)
    .eq("telavox_call_id", telavoxCallId);

  if (status) {
    query = query.eq("status", status);
  }

  const { count, error } = await query;

  if (error) {
    return false;
  }

  return (count || 0) > 0;
}
