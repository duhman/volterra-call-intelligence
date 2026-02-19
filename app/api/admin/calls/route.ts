import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { authenticateAdmin } from "@/lib/auth/admin";

// GET /api/admin/calls - List calls with filtering and pagination
// Now reads from telavox_call_sessions (the active table for Telavox pipeline)
export async function GET(request: NextRequest) {
  const isAuthenticated = await authenticateAdmin(request);
  if (!isAuthenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const direction = searchParams.get("direction") || "";
  const hubspotContact = searchParams.get("hubspot_contact") || "";
  const order = searchParams.get("order") || "created_at.desc";

  try {
    const supabase = await createServiceClient();

    // Query telavox_call_sessions - the active table for Telavox pipeline
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from("telavox_call_sessions")
      .select("*", { count: "exact" });

    // Apply filters
    if (search) {
      query = query.or(
        `from_number.ilike.%${search}%,to_number.ilike.%${search}%`,
      );
    }

    if (status) {
      query = query.eq("transcription_status", status);
    }

    if (direction) {
      query = query.eq("direction", direction.toUpperCase());
    }

    if (hubspotContact === "true") {
      query = query.not("hubspot_contact_id", "is", null);
    } else if (hubspotContact === "false") {
      query = query.is("hubspot_contact_id", null);
    }

    // Apply ordering
    const [orderField, orderDirection] = order.split(".");
    query = query.order(orderField, { ascending: orderDirection === "asc" });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    // Transform data to match expected UI format
    const transformedData = (data || []).map(
      (session: Record<string, unknown>) => ({
        id: session.id,
        from_number: session.from_number,
        to_number: session.to_number,
        direction: (session.direction as string)?.toLowerCase(),
        transcription_status: session.transcription_status || "pending",
        status: session.transcription_status || "pending",
        created_at: session.created_at,
        webhook_timestamp: session.started_at || session.created_at,
        duration_seconds:
          session.started_at && session.ended_at
            ? Math.round(
                (new Date(session.ended_at as string).getTime() -
                  new Date(session.started_at as string).getTime()) /
                  1000,
              )
            : undefined,
        agent_user_id: session.agent_user_id,
        hubspot_contact_id: session.hubspot_contact_id,
        hubspot_synced_at: session.hubspot_engagement_id
          ? session.updated_at
          : null,
        is_hubspot_contact: !!session.hubspot_contact_id,
        // Include transcription data inline for UI
        transcriptions: session.summary
          ? [
              {
                id: session.id,
                summary: session.summary,
                created_at: session.updated_at,
              },
            ]
          : [],
        // Additional fields from telavox_call_sessions
        telavox_call_id: session.telavox_call_id,
        recording_url: session.recording_url,
        recording_status: session.recording_status,
        transcript: session.transcript,
        summary: session.summary,
        sentiment: session.sentiment,
        consent_status: session.consent_status,
      }),
    );

    return NextResponse.json({
      data: transformedData,
      count,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error fetching calls:", error);
    return NextResponse.json(
      { error: "Failed to fetch calls" },
      { status: 500 },
    );
  }
}
