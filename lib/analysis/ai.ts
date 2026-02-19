import { createServiceClient } from "@/lib/supabase/server";

export async function generateAISummary(
  callId: string,
  customPrompt?: string,
  previewOnly: boolean = false,
): Promise<{ summary?: string; error?: string }> {
  try {
    const supabase = await createServiceClient();

    // Fetch call/session details (try both tables)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: call } = await (supabase as any)
      .from("calls")
      .select(
        "id, from_number, to_number, direction, duration_seconds, agent_email",
      )
      .eq("id", callId)
      .maybeSingle();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: session } = await (supabase as any)
      .from("telavox_call_sessions")
      .select(
        "id, from_number, to_number, direction, agent_user_id, transcript, summary",
      )
      .eq("id", callId)
      .maybeSingle();

    if (!call && !session) return { error: "Call not found" };

    // Prefer session data if available (newer schema)
    const direction = session?.direction || call?.direction || "INBOUND";
    const fromNumber = session?.from_number || call?.from_number;
    const toNumber = session?.to_number || call?.to_number;
    const agentEmail = call?.agent_email || "Unknown";
    const durationSeconds = call?.duration_seconds || 0;

    // Get transcript
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: transcription } = await (supabase as any)
      .from("transcriptions")
      .select("full_text")
      .eq("call_id", callId)
      .maybeSingle();

    const fullText = transcription?.full_text || session?.transcript;

    if (!fullText) return { error: "Transcription not found" };

    // Get prompt
    let promptTemplate = customPrompt;
    if (!promptTemplate) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: promptSetting } = await (supabase as any)
        .from("settings")
        .select("value")
        .eq("key", "summary_prompt")
        .maybeSingle();
      promptTemplate = promptSetting?.value;
    }

    if (!promptTemplate) {
      // Default prompt if not set
      promptTemplate = `Summarize this call: {transcription}`;
    }

    const customerPhone =
      direction === "OUTBOUND" || direction === "outgoing"
        ? toNumber
        : fromNumber;
    const directionStr =
      direction === "OUTBOUND" || direction === "outgoing"
        ? "Outgoing"
        : "Incoming";

    const finalPrompt = promptTemplate
      .replace(/{agent_name}/g, agentEmail || "Agent")
      .replace(/{customer_phone}/g, customerPhone || "Unknown")
      .replace(/{call_direction}/g, directionStr)
      .replace(/{call_duration}/g, `${durationSeconds}s`)
      .replace(/{transcription}/g, fullText);

    // Call OpenAI API (fallback to heuristic if no API key)
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      const { analyzeConversation } =
        await import("@/lib/analysis/conversationAnalyzer");
      const analysis = await analyzeConversation(fullText);
      return { summary: analysis.summary + " (Heuristic)" };
    }

    const aiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: finalPrompt }],
        }),
      },
    );

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("OpenAI API error:", aiResponse.status, errorText);
      return { error: `OpenAI API error: ${aiResponse.status}` };
    }

    const aiData = await aiResponse.json();
    const summary = aiData.choices?.[0]?.message?.content?.trim();

    if (!summary) return { error: "No summary generated" };

    if (!previewOnly) {
      // Save summary
      // Try telavox_call_sessions first
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase as any)
        .from("telavox_call_sessions")
        .update({ summary, updated_at: new Date().toISOString() })
        .eq("id", callId);

      if (updateError) {
        // Try transcriptions table
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from("transcriptions")
          .update({ summary })
          .eq("call_id", callId);
      }
    }

    return { summary };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}
