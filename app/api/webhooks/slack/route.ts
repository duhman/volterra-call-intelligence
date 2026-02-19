import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { enqueueTelavoxJob, jobExists } from "@/lib/telavox/job-queue";
import { getSlackConfig, updateSlackMessage } from "@/lib/slack/client";

export const dynamic = "force-dynamic";

type SlackActionPayload = {
  type: string;
  user?: { id?: string; username?: string; name?: string };
  channel?: { id?: string };
  message?: { ts?: string };
  actions?: Array<{ action_id?: string; value?: string }>;
  response_url?: string;
};

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

async function verifySlackSignature(
  headers: Headers,
  rawBody: string,
): Promise<{ valid: boolean; error?: string }> {
  const signature = headers.get("x-slack-signature");
  const timestamp = headers.get("x-slack-request-timestamp");
  if (!signature || !timestamp) {
    return { valid: false, error: "Missing Slack signature headers" };
  }

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) {
    return { valid: false, error: "Invalid Slack timestamp" };
  }

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > 300) {
    return { valid: false, error: "Slack timestamp too old" };
  }

  const config = await getSlackConfig();
  if (!config.signingSecret) {
    return { valid: false, error: "Slack signing secret not configured" };
  }

  const baseString = `v0:${timestamp}:${rawBody}`;
  const computed = `v0=${crypto
    .createHmac("sha256", config.signingSecret)
    .update(baseString, "utf8")
    .digest("hex")}`;

  if (!safeCompare(computed, signature)) {
    return { valid: false, error: "Slack signature mismatch" };
  }

  return { valid: true };
}

function parseActionValue(value?: string): {
  requestId?: string;
  telavoxCallId?: string;
} {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as {
      requestId?: string;
      telavox_call_id?: string;
      callId?: string;
    };
    return {
      requestId: parsed.requestId,
      telavoxCallId: parsed.telavox_call_id || parsed.callId,
    };
  } catch {
    return { telavoxCallId: value };
  }
}

function buildDecisionBlocks(options: {
  status: "approved" | "declined" | "expired" | "already";
  telavoxCallId: string;
  direction?: string | null;
  fromNumber?: string | null;
  toNumber?: string | null;
}) {
  const statusText =
    options.status === "approved"
      ? "Approved"
      : options.status === "declined"
        ? "Declined"
        : options.status === "expired"
          ? "Expired"
          : "Already handled";

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
        text: `*Transcription decision:* ${statusText}`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: details || "Details unavailable.",
      },
    },
  ] as Array<Record<string, unknown>>;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const verification = await verifySlackSignature(req.headers, rawBody);
  if (!verification.valid) {
    return NextResponse.json(
      { error: verification.error || "Unauthorized" },
      { status: 401 },
    );
  }

  const params = new URLSearchParams(rawBody);
  const payloadRaw = params.get("payload");
  if (!payloadRaw) {
    return NextResponse.json({ error: "Missing payload" }, { status: 400 });
  }

  let payload: SlackActionPayload;
  try {
    payload = JSON.parse(payloadRaw) as SlackActionPayload;
  } catch {
    return NextResponse.json(
      { error: "Invalid payload JSON" },
      { status: 400 },
    );
  }

  if (payload.type !== "block_actions") {
    return NextResponse.json({ status: "ignored" });
  }

  const action = payload.actions?.[0];
  const actionId = action?.action_id;
  if (!actionId) {
    return NextResponse.json({ status: "ignored" });
  }

  if (actionId !== "consent_approve" && actionId !== "consent_decline") {
    return NextResponse.json({ status: "ignored" });
  }

  const { requestId, telavoxCallId } = parseActionValue(action?.value);
  if (!requestId || !telavoxCallId) {
    return NextResponse.json(
      { error: "Missing consent metadata" },
      { status: 400 },
    );
  }

  const supabase = await createServiceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: consent, error: consentError } = await (supabase as any)
    .from("transcription_consent_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (consentError || !consent) {
    return NextResponse.json(
      { error: "Consent request not found" },
      { status: 404 },
    );
  }

  if (consent.status !== "pending") {
    if (consent.slack_channel_id && consent.slack_message_ts) {
      await updateSlackMessage({
        channelId: consent.slack_channel_id,
        messageTs: consent.slack_message_ts,
        text: "Transcription decision already recorded.",
        blocks: buildDecisionBlocks({
          status: "already",
          telavoxCallId,
        }),
      });
    }
    return NextResponse.json({ status: "already_processed" });
  }

  if (consent.slack_user_id && payload.user?.id) {
    if (consent.slack_user_id !== payload.user.id) {
      return NextResponse.json({ error: "User mismatch" }, { status: 403 });
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: session, error: sessionError } = await (supabase as any)
    .from("telavox_call_sessions")
    .select(
      "id, telavox_org_id, from_number, to_number, direction, transcription_status",
    )
    .eq("telavox_call_id", telavoxCallId)
    .single();

  if (sessionError || !session) {
    return NextResponse.json(
      { error: "Call session not found" },
      { status: 404 },
    );
  }

  const decidedStatus =
    actionId === "consent_approve" ? "approved" : "declined";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateConsentError } = await (supabase as any)
    .from("transcription_consent_requests")
    .update({
      status: decidedStatus,
      responded_at: new Date().toISOString(),
      response_source: "slack",
      response_metadata: {
        action_id: actionId,
        slack_user_id: payload.user?.id,
        slack_user_name: payload.user?.username || payload.user?.name,
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", consent.id);

  if (updateConsentError) {
    return NextResponse.json(
      { error: "Failed to update consent" },
      { status: 500 },
    );
  }

  if (decidedStatus === "approved") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateSessionError } = await (supabase as any)
      .from("telavox_call_sessions")
      .update({
        consent_status: "approved",
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.id);

    if (updateSessionError) {
      return NextResponse.json(
        { error: "Failed to update call session" },
        { status: 500 },
      );
    }

    const exists = await jobExists("stt.request", telavoxCallId);
    if (!exists) {
      await enqueueTelavoxJob({
        job_type: "stt.request",
        telavox_call_id: telavoxCallId,
        telavox_org_id: session.telavox_org_id,
      });
    }
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateSessionError } = await (supabase as any)
      .from("telavox_call_sessions")
      .update({
        consent_status: "declined",
        transcription_status: "failed",
        last_error: "Transcription declined by agent",
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.id);

    if (updateSessionError) {
      return NextResponse.json(
        { error: "Failed to update call session" },
        { status: 500 },
      );
    }
  }

  if (consent.slack_channel_id && consent.slack_message_ts) {
    try {
      await updateSlackMessage({
        channelId: consent.slack_channel_id,
        messageTs: consent.slack_message_ts,
        text:
          decidedStatus === "approved"
            ? "Transcription approved."
            : "Transcription declined.",
        blocks: buildDecisionBlocks({
          status: decidedStatus,
          telavoxCallId,
          direction: session.direction,
          fromNumber: session.from_number,
          toNumber: session.to_number,
        }),
      });
    } catch (slackError) {
      // Log but don't fail - the consent decision was already recorded
      console.error(
        "[Slack Consent] Failed to update message:",
        slackError instanceof Error ? slackError.message : slackError,
      );
    }
  }

  return NextResponse.json({ status: "ok" });
}
