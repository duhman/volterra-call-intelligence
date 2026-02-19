import { createServiceClient } from "@/lib/supabase/server";
import {
  completeJob,
  enqueueTelavoxJob,
  failJob,
  jobExists,
  startJob,
  type TelavoxJob,
} from "./job-queue";
import { sendSlackMessage, updateSlackMessage } from "@/lib/slack/client";

const DEFAULT_CONSENT_TIMEOUT_HOURS = 24;
const DEFAULT_CONSENT_REMINDER_HOURS = 2;

async function getSettings(
  keys: string[],
): Promise<Record<string, string | undefined>> {
  const supabase = await createServiceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("settings")
    .select("key, value")
    .in("key", keys);

  if (error) {
    return {};
  }

  const map: Record<string, string> = {};
  for (const row of data || []) {
    if (row?.key) map[row.key] = row.value;
  }
  return map;
}

function parseNumber(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function buildConsentBlocks(options: {
  telavoxCallId: string;
  requestId: string;
  direction?: string | null;
  fromNumber?: string | null;
  toNumber?: string | null;
  reminder?: boolean;
}) {
  const details = [
    options.direction ? `*Direction:* ${options.direction}` : undefined,
    options.fromNumber ? `*From:* ${options.fromNumber}` : undefined,
    options.toNumber ? `*To:* ${options.toNumber}` : undefined,
    `*Call ID:* ${options.telavoxCallId}`,
  ]
    .filter(Boolean)
    .join("\n");

  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: options.reminder
          ? "*Reminder:* approve transcription for this call?"
          : "*Approve transcription for this call?*",
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: details || "Details unavailable.",
      },
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          action_id: "consent_approve",
          style: "primary",
          text: { type: "plain_text", text: "Approve" },
          value: JSON.stringify({
            requestId: options.requestId,
            telavox_call_id: options.telavoxCallId,
          }),
        },
        {
          type: "button",
          action_id: "consent_decline",
          style: "danger",
          text: { type: "plain_text", text: "Decline" },
          value: JSON.stringify({
            requestId: options.requestId,
            telavox_call_id: options.telavoxCallId,
          }),
        },
      ],
    },
  ] as Array<Record<string, unknown>>;
}

export async function processConsentRequestJob(job: TelavoxJob): Promise<void> {
  await startJob(job.id);

  try {
    const supabase = await createServiceClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: session, error: sessionError } = await (supabase as any)
      .from("telavox_call_sessions")
      .select(
        "id, telavox_org_id, agent_user_id, hubspot_contact_id, consent_status, transcription_status, from_number, to_number, direction",
      )
      .eq("telavox_call_id", job.telavox_call_id)
      .single();

    if (sessionError || !session) {
      throw new Error(
        `Session not found for call ${job.telavox_call_id}: ${sessionError?.message || "not found"}`,
      );
    }

    if (session.transcription_status === "completed") {
      await completeJob(job.id);
      return;
    }

    if (session.consent_status && session.consent_status !== "pending") {
      await completeJob(job.id);
      return;
    }

    const settings = await getSettings([
      "consent_enabled",
      "consent_timeout_hours",
      "consent_reminder_hours",
      "consent_auto_approve_known_contacts",
    ]);

    const consentEnabled = settings.consent_enabled !== "false";
    if (!consentEnabled) {
      const exists = await jobExists("stt.request", job.telavox_call_id);
      if (!exists) {
        await enqueueTelavoxJob({
          job_type: "stt.request",
          telavox_call_id: job.telavox_call_id,
          telavox_org_id: job.telavox_org_id,
        });
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("telavox_call_sessions")
        .update({
          consent_status: "not_required",
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.id);

      await completeJob(job.id);
      return;
    }

    const autoApproveKnown =
      settings.consent_auto_approve_known_contacts === "true";
    if (autoApproveKnown && session.hubspot_contact_id) {
      const exists = await jobExists("stt.request", job.telavox_call_id);
      if (!exists) {
        await enqueueTelavoxJob({
          job_type: "stt.request",
          telavox_call_id: job.telavox_call_id,
          telavox_org_id: job.telavox_org_id,
        });
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("telavox_call_sessions")
        .update({
          consent_status: "not_required",
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.id);

      await completeJob(job.id);
      return;
    }

    if (!session.agent_user_id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("telavox_call_sessions")
        .update({
          consent_status: "declined",
          transcription_status: "failed",
          last_error: "Missing agent_user_id for consent",
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.id);

      await completeJob(job.id);
      return;
    }

    // Check for existing pending request
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingRequest } = await (supabase as any)
      .from("transcription_consent_requests")
      .select("id, status, slack_channel_id, slack_message_ts")
      .eq("telavox_call_id", job.telavox_call_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingRequest?.status === "pending") {
      await completeJob(job.id);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: mapping } = await (supabase as any)
      .from("agent_slack_mappings")
      .select("slack_user_id")
      .eq("agent_user_id", session.agent_user_id)
      .eq("is_active", true)
      .single();

    if (!mapping?.slack_user_id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("telavox_call_sessions")
        .update({
          consent_status: "declined",
          transcription_status: "failed",
          last_error: "No Slack mapping for agent",
          updated_at: new Date().toISOString(),
        })
        .eq("id", session.id);

      await completeJob(job.id);
      return;
    }

    const timeoutHours = parseNumber(
      settings.consent_timeout_hours,
      DEFAULT_CONSENT_TIMEOUT_HOURS,
    );
    const reminderHours = parseNumber(
      settings.consent_reminder_hours,
      DEFAULT_CONSENT_REMINDER_HOURS,
    );
    const now = new Date();
    const expiresAt = new Date(now.getTime() + timeoutHours * 60 * 60 * 1000);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: consentRequest, error: insertError } = await (supabase as any)
      .from("transcription_consent_requests")
      .insert({
        telavox_call_id: job.telavox_call_id,
        agent_user_id: session.agent_user_id,
        slack_user_id: mapping.slack_user_id,
        status: "pending",
        expires_at: expiresAt.toISOString(),
        sent_at: now.toISOString(),
      })
      .select()
      .single();

    if (insertError || !consentRequest) {
      throw new Error(
        `Failed to create consent request: ${insertError?.message || "unknown error"}`,
      );
    }

    const blocks = buildConsentBlocks({
      telavoxCallId: job.telavox_call_id,
      requestId: consentRequest.id,
      direction: session.direction,
      fromNumber: session.from_number,
      toNumber: session.to_number,
    });

    const message = await sendSlackMessage({
      channel: mapping.slack_user_id,
      text: `Approve transcription for call ${job.telavox_call_id}?`,
      blocks,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from("transcription_consent_requests")
      .update({
        slack_channel_id: message.channelId,
        slack_message_ts: message.messageTs,
        sent_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq("id", consentRequest.id);

    if (updateError) {
      throw new Error(
        `Failed to update consent request Slack metadata: ${updateError.message}`,
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("telavox_call_sessions")
      .update({
        consent_status: "pending",
        updated_at: now.toISOString(),
      })
      .eq("id", session.id);

    if (reminderHours > 0) {
      const reminderAt = new Date(
        now.getTime() + reminderHours * 60 * 60 * 1000,
      );
      const reminderExists = await jobExists(
        "consent.reminder",
        job.telavox_call_id,
      );
      if (!reminderExists) {
        await enqueueTelavoxJob({
          job_type: "consent.reminder",
          telavox_call_id: job.telavox_call_id,
          telavox_org_id: job.telavox_org_id,
          job_data: { consent_request_id: consentRequest.id },
          scheduled_at: reminderAt.toISOString(),
        });
      }
    }

    const expireExists = await jobExists("consent.expire", job.telavox_call_id);
    if (!expireExists) {
      await enqueueTelavoxJob({
        job_type: "consent.expire",
        telavox_call_id: job.telavox_call_id,
        telavox_org_id: job.telavox_org_id,
        job_data: { consent_request_id: consentRequest.id },
        scheduled_at: expiresAt.toISOString(),
      });
    }

    await completeJob(job.id);
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(
      `[Telavox Worker] Consent request failed for call ${job.telavox_call_id}:`,
      errorMsg,
    );
    await failJob(job.id, errorMsg);
    throw error;
  }
}

export async function processConsentReminderJob(
  job: TelavoxJob,
): Promise<void> {
  await startJob(job.id);

  try {
    const supabase = await createServiceClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: consent } = await (supabase as any)
      .from("transcription_consent_requests")
      .select(
        "id, status, slack_user_id, slack_channel_id, slack_message_ts, reminder_sent_at, expires_at, agent_user_id, telavox_call_id",
      )
      .eq("telavox_call_id", job.telavox_call_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!consent || consent.status !== "pending") {
      await completeJob(job.id);
      return;
    }

    if (consent.reminder_sent_at) {
      await completeJob(job.id);
      return;
    }

    const now = new Date();
    if (consent.expires_at && new Date(consent.expires_at) <= now) {
      await completeJob(job.id);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: session } = await (supabase as any)
      .from("telavox_call_sessions")
      .select("direction, from_number, to_number")
      .eq("telavox_call_id", job.telavox_call_id)
      .single();

    const blocks = buildConsentBlocks({
      telavoxCallId: job.telavox_call_id,
      requestId: consent.id,
      direction: session?.direction,
      fromNumber: session?.from_number,
      toNumber: session?.to_number,
      reminder: true,
    });

    await sendSlackMessage({
      channel: consent.slack_user_id,
      text: `Reminder: approve transcription for call ${job.telavox_call_id}`,
      blocks,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("transcription_consent_requests")
      .update({
        reminder_sent_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq("id", consent.id);

    await completeJob(job.id);
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(
      `[Telavox Worker] Consent reminder failed for call ${job.telavox_call_id}:`,
      errorMsg,
    );
    await failJob(job.id, errorMsg);
    throw error;
  }
}

export async function processConsentExpireJob(job: TelavoxJob): Promise<void> {
  await startJob(job.id);

  try {
    const supabase = await createServiceClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: consent } = await (supabase as any)
      .from("transcription_consent_requests")
      .select(
        "id, status, slack_channel_id, slack_message_ts, expires_at, telavox_call_id",
      )
      .eq("telavox_call_id", job.telavox_call_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!consent || consent.status !== "pending") {
      await completeJob(job.id);
      return;
    }

    const now = new Date();
    if (consent.expires_at && new Date(consent.expires_at) > now) {
      await completeJob(job.id);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: session } = await (supabase as any)
      .from("telavox_call_sessions")
      .select("id, direction, from_number, to_number")
      .eq("telavox_call_id", job.telavox_call_id)
      .single();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateConsentError } = await (supabase as any)
      .from("transcription_consent_requests")
      .update({
        status: "expired",
        responded_at: now.toISOString(),
        response_source: "timeout",
        updated_at: now.toISOString(),
      })
      .eq("id", consent.id);

    if (updateConsentError) {
      throw new Error(
        `Failed to expire consent request: ${updateConsentError.message}`,
      );
    }

    if (session?.id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("telavox_call_sessions")
        .update({
          consent_status: "expired",
          transcription_status: "failed",
          last_error: "Consent timeout",
          updated_at: now.toISOString(),
        })
        .eq("id", session.id);
    }

    if (consent.slack_channel_id && consent.slack_message_ts) {
      await updateSlackMessage({
        channelId: consent.slack_channel_id,
        messageTs: consent.slack_message_ts,
        text: "Consent expired. Transcription will not proceed.",
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "*Transcription decision:* Expired",
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: [
                session?.direction
                  ? `*Direction:* ${session.direction}`
                  : undefined,
                session?.from_number
                  ? `*From:* ${session.from_number}`
                  : undefined,
                session?.to_number ? `*To:* ${session.to_number}` : undefined,
                `*Call ID:* ${job.telavox_call_id}`,
              ]
                .filter(Boolean)
                .join("\n"),
            },
          },
        ],
      });
    }

    await completeJob(job.id);
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(
      `[Telavox Worker] Consent expire failed for call ${job.telavox_call_id}:`,
      errorMsg,
    );
    await failJob(job.id, errorMsg);
    throw error;
  }
}
