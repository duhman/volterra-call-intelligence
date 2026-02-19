import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { authenticateAdmin } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

interface TelavoxCall {
  datetimeISO?: string;
  datetime?: string;
  number?: string;
  recordingId?: string;
  id?: string;
  duration?: number;
}

export async function GET(request: NextRequest) {
  const isAuthenticated = await authenticateAdmin(request);
  if (!isAuthenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = await createServiceClient();

    // First try org config, then fall back to first agent API key
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let accessToken: string | null = null;
    let tokenSource: string = "";

    // Try org config first
    const { data: orgConfig } = await (supabase as any)
      .from("telavox_org_configs")
      .select("telavox_org_id, access_token")
      .limit(1)
      .single();

    if (orgConfig?.access_token) {
      accessToken = orgConfig.access_token;
      tokenSource = `org:${orgConfig.telavox_org_id}`;
    } else {
      // Fall back to first available agent API key
      const { data: agentKey } = await (supabase as any)
        .from("telavox_api_keys")
        .select("agent_email, api_key")
        .limit(1)
        .single();

      if (agentKey?.api_key) {
        accessToken = agentKey.api_key;
        tokenSource = `agent:${agentKey.agent_email}`;
      }
    }

    if (!accessToken) {
      return NextResponse.json(
        {
          error: "Configuration not found",
          details:
            "No Telavox configuration found. Add an org config or agent API key.",
        },
        { status: 404 },
      );
    }

    const apiBase = "https://api.telavox.se";

    // Fetch calls from Telavox API
    const response = await fetch(`${apiBase}/calls?withRecordings=true`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          error: "Telavox API Error",
          status: response.status,
          details: errorText,
        },
        { status: response.status },
      );
    }

    const data = await response.json();

    // Process data for summary
    const incoming: TelavoxCall[] = data.incoming || [];
    const outgoing: TelavoxCall[] = data.outgoing || [];
    const allCalls = [...incoming, ...outgoing];

    const withRecording = allCalls.filter((c) => !!c.recordingId);
    const withoutRecording = allCalls.filter((c) => !c.recordingId);

    // Format response matching the UI expectations
    const result = {
      token_source: tokenSource,
      summary: {
        total_calls: allCalls.length,
        outgoing_count: outgoing.length,
        incoming_count: incoming.length,
        with_recording_id: withRecording.length,
        without_recording_id: withoutRecording.length,
      },
      date_range: {
        from: new Date().toLocaleDateString(), // API returns recent calls, usually today/yesterday
        to: new Date().toLocaleDateString(),
      },
      sample_calls_with_recording: withRecording.slice(0, 5).map((c) => ({
        number: c.number,
        dateTime: c.datetimeISO || c.datetime,
        recordingId: c.recordingId,
        callId: c.id || "unknown",
      })),
      sample_calls_without_recording: withoutRecording.slice(0, 5).map((c) => ({
        number: c.number,
        dateTime: c.datetimeISO || c.datetime,
        recordingId: null,
        callId: c.id || "unknown",
      })),
      available_fields: allCalls.length > 0 ? Object.keys(allCalls[0]) : [],
      raw_response: data,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Debug endpoint error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
