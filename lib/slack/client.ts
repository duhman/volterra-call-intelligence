import { WebClient } from "@slack/web-api";
import { createServiceClient } from "@/lib/supabase/server";

export interface SlackConfig {
  botToken: string | null;
  signingSecret: string | null;
}

export async function getSlackConfig(): Promise<SlackConfig> {
  const envBotToken = process.env.SLACK_BOT_TOKEN?.trim() || null;
  const envSigningSecret = process.env.SLACK_SIGNING_SECRET?.trim() || null;

  const supabase = await createServiceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("settings")
    .select("key, value")
    .in("key", ["slack_bot_token", "slack_signing_secret"]);

  if (error) {
    return {
      botToken: envBotToken,
      signingSecret: envSigningSecret,
    };
  }

  const settings = new Map<string, string>();
  for (const row of data || []) {
    if (row?.key && row?.value) settings.set(row.key, row.value);
  }

  return {
    botToken: envBotToken || settings.get("slack_bot_token") || null,
    signingSecret:
      envSigningSecret || settings.get("slack_signing_secret") || null,
  };
}

export async function getSlackWebClient(): Promise<WebClient> {
  const config = await getSlackConfig();
  if (!config.botToken) {
    throw new Error("Slack bot token not configured");
  }
  return new WebClient(config.botToken);
}

export async function sendSlackMessage(options: {
  channel: string;
  text: string;
  blocks?: Array<Record<string, unknown>>;
}): Promise<{ channelId: string; messageTs: string }> {
  const client = await getSlackWebClient();
  const payload = {
    channel: options.channel,
    text: options.text,
  } as Record<string, unknown>;

  if (options.blocks) {
    payload.blocks = options.blocks;
  }

  const response = await client.chat.postMessage(
    payload as unknown as Parameters<WebClient["chat"]["postMessage"]>[0],
  );

  if (!response.ok || !response.channel || !response.ts) {
    throw new Error(
      `Failed to post Slack message: ${response.error || "unknown error"}`,
    );
  }

  return {
    channelId: response.channel as string,
    messageTs: response.ts as string,
  };
}

export async function updateSlackMessage(options: {
  channelId: string;
  messageTs: string;
  text: string;
  blocks?: Array<Record<string, unknown>>;
}): Promise<void> {
  const client = await getSlackWebClient();
  const payload = {
    channel: options.channelId,
    ts: options.messageTs,
    text: options.text,
  } as Record<string, unknown>;

  if (options.blocks) {
    payload.blocks = options.blocks;
  }

  const response = await client.chat.update(
    payload as unknown as Parameters<WebClient["chat"]["update"]>[0],
  );

  if (!response.ok) {
    throw new Error(
      `Failed to update Slack message: ${response.error || "unknown error"}`,
    );
  }
}
