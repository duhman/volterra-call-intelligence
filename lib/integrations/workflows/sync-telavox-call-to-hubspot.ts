import { getHubSpotClient } from "@/lib/hubspot/client";
import { withRateLimitHandling } from "@/lib/hubspot/rateLimiter";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Sync a completed Telavox call session (with transcript & insights)
 * into HubSpot as an engagement, idempotently.
 *
 * Invoked from the ElevenLabs webhook handler once
 * telavox_call_sessions.transcription_status === 'completed'.
 */

interface TelavoxCallSession {
  id: string;
  telavox_call_id: string;
  hubspot_portal_id: string | null;
  hubspot_contact_id: string | null;
  hubspot_deal_id: string | null;
  started_at: string | null;
  ended_at: string | null;
  summary: string | null;
  sentiment: string | null;
  insights_json: Record<string, unknown> | null;
  hubspot_engagement_id: string | null;
  transcription_status: string | null;
}

/**
 * Main entrypoint used by webhook layer.
 */
export async function syncTelavoxCallToHubSpot(
  telavoxCallId: string
): Promise<void> {
  const supabase = await createServiceClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: session, error } = await (supabase as any)
    .from("telavox_call_sessions")
    .select(
      "id, telavox_call_id, hubspot_portal_id, hubspot_contact_id, hubspot_deal_id, started_at, ended_at, summary, sentiment, insights_json, hubspot_engagement_id, transcription_status"
    )
    .eq("telavox_call_id", telavoxCallId)
    .maybeSingle();

  if (error || !session) {
    console.error(
      "[Telavox->HubSpot] Failed to load telavox_call_sessions row",
      error
    );
    return;
  }

  const call = session as TelavoxCallSession;

  if (call.transcription_status !== "completed") {
    // Only sync when transcription is finalized.
    return;
  }

  if (!call.hubspot_contact_id && !call.hubspot_deal_id) {
    // No association target; keep data in our system only.
    return;
  }

  // HubSpot client may require an access token; delegate to shared helper using env configuration.
  const hs = await getHubSpotClient(
    process.env.HUBSPOT_PRIVATE_ACCESS_TOKEN || ""
  );

  // Idempotency: if we already created an engagement, no-op for now.
  if (call.hubspot_engagement_id) {
    return;
  }

  const occurredAt =
    call.ended_at || call.started_at || new Date().toISOString();

  const insights = call.insights_json || {};
  const keyPoints: string[] = (insights.keyPoints as string[]) || [];
  const actionItems: string[] = (insights.actionItems as string[]) || [];
  const competitorMentions: string[] = (insights.competitorMentions as string[]) || [];

  const lines: string[] = [];

  if (call.summary) {
    lines.push(`Summary: ${call.summary}`);
  }

  if (call.sentiment) {
    lines.push(`Sentiment: ${call.sentiment}`);
  }

  if (keyPoints.length) {
    lines.push("");
    lines.push("Key points:");
    for (const kp of keyPoints) lines.push(`- ${kp}`);
  }

  if (actionItems.length) {
    lines.push("");
    lines.push("Action items:");
    for (const ai of actionItems) lines.push(`- ${ai}`);
  }

  if (competitorMentions.length) {
    lines.push("");
    lines.push("Competitor mentions:");
    for (const c of competitorMentions) lines.push(`- ${c}`);
  }

  const transcriptLinkBase =
    process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (transcriptLinkBase) {
    lines.push("");
    lines.push(
      `View full transcript: ${transcriptLinkBase}/calls/${encodeURIComponent(
        call.telavox_call_id
      )}`
    );
  }

  const body = lines.join("\n");

  // Calculate call duration if we have both start and end times
  const durationSeconds = call.started_at && call.ended_at
    ? Math.floor(
        (new Date(call.ended_at).getTime() - new Date(call.started_at).getTime()) / 1000
      )
    : null;

  const createEngagement = async () => {
    // Optionally create CALL object if enabled (for better HubSpot timeline visibility)
    const createCallObject = process.env.HUBSPOT_CREATE_CALL_OBJECTS === "true";
    let callEngagementId: string | null = null;

    if (createCallObject) {
      try {
        // Create CALL object with transcript summary
        const callObject = await hs.crm.objects.calls.basicApi.create({
          properties: {
            hs_timestamp: occurredAt,
            hs_call_title: `AI Transcribed Telavox Call — ${new Date(occurredAt).toLocaleDateString()}`,
            hs_call_body: body,
            hs_call_duration: durationSeconds ? String(durationSeconds * 1000) : "", // milliseconds (empty string if not available)
            hs_call_status: "COMPLETED",
            hs_call_disposition: "f240bbac-87c9-4f6e-bf70-924b57d47db7", // Connected
          },
          associations: [
            ...(call.hubspot_contact_id
              ? [
                  {
                    to: { id: call.hubspot_contact_id },
                    types: [
                      {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        associationCategory: "HUBSPOT_DEFINED" as any,
                        associationTypeId: 194, // Call to Contact
                      },
                    ],
                  },
                ]
              : []),
            ...(call.hubspot_deal_id
              ? [
                  {
                    to: { id: call.hubspot_deal_id },
                    types: [
                      {
                        associationCategory: "HUBSPOT_DEFINED",
                        associationTypeId: 206, // Call to Deal
                      },
                    ],
                  },
                ]
              : []),
          ] as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        });

        callEngagementId = callObject.id;
        console.log(
          `[Telavox->HubSpot] Created CALL object ${callEngagementId} for call ${call.telavox_call_id}`
        );
      } catch (callError: unknown) {
        console.error(
          `[Telavox->HubSpot] Failed to create CALL object, falling back to note:`,
          (callError instanceof Error ? callError.message : String(callError))
        );
        // Continue with note creation as fallback
      }
    }

    // Always create note for detailed transcript (or as fallback if CALL creation failed)
    const note = await hs.crm.objects.basicApi.create("notes", {
      properties: {
        hs_note_body: body,
        hs_timestamp: occurredAt,
        hs_note_title: `AI Transcribed Telavox Call — ${occurredAt}`,
      },
    });

    // Associate note after creation to avoid type issues with the SDK's associations struct.
    const noteId = note.id;

    const batchInputs: Array<{
      from: { id: string };
      to: { id: string };
      type: string;
    }> = [];

    if (call.hubspot_contact_id) {
      batchInputs.push({
        from: { id: noteId },
        to: { id: call.hubspot_contact_id },
        type: "note_to_contact",
      });
    }

    if (call.hubspot_deal_id) {
      batchInputs.push({
        from: { id: noteId },
        to: { id: call.hubspot_deal_id },
        type: "note_to_deal",
      });
    }

    if (batchInputs.length) {
      // Use v4 batch associations with minimal typing friction.
      // We cast to any to align with the HubSpot SDK types without over-coupling.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const contactInputs: any[] = batchInputs
        .filter((b) => b.type === "note_to_contact")
        .map((b) => ({
          _from: { id: String(b.from.id) },
          to: { id: String(b.to.id) },
          types: [
            {
              associationCategory: "HUBSPOT_DEFINED",
              associationTypeId: 190,
            },
          ],
        }));

      if (contactInputs.length) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (hs.crm.associations.v4.batchApi as any).create(
          "notes",
          "contacts",
          { inputs: contactInputs }
        );
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dealInputs: any[] = batchInputs
        .filter((b) => b.type === "note_to_deal")
        .map((b) => ({
          _from: { id: String(b.from.id) },
          to: { id: String(b.to.id) },
          types: [
            {
              associationCategory: "HUBSPOT_DEFINED",
              associationTypeId: 214,
            },
          ],
        }));

      if (dealInputs.length) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (hs.crm.associations.v4.batchApi as any).create(
          "notes",
          "deals",
          { inputs: dealInputs }
        );
      }
    }

    // Return the CALL object ID if created, otherwise note ID
    return callEngagementId ? { id: callEngagementId } : note;
  };

  try {
    const engagement = await withRateLimitHandling(() => createEngagement());

    if (!engagement || !engagement.id) {
      console.error(
        "[Telavox->HubSpot] Engagement created but missing id",
        engagement
      );
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from("telavox_call_sessions")
      .update({ hubspot_engagement_id: String(engagement.id) })
      .eq("id", call.id);

    if (updateError) {
      console.error(
        "[Telavox->HubSpot] Failed to persist hubspot_engagement_id",
        updateError
      );
    }
  } catch (e: unknown) {
    console.error("[Telavox->HubSpot] Failed to create engagement", e);
  }
}
