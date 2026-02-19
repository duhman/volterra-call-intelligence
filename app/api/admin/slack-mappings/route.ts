import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { authenticateAdmin } from "@/lib/auth/admin";

// GET /api/admin/slack-mappings - Get all agent Slack mappings
export async function GET(request: NextRequest) {
  const isAuthenticated = await authenticateAdmin(request);
  if (!isAuthenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = await createServiceClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("agent_slack_mappings")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching Slack mappings:", error);
    return NextResponse.json(
      { error: "Failed to fetch Slack mappings" },
      { status: 500 },
    );
  }
}

// POST /api/admin/slack-mappings - Create new agent Slack mapping
export async function POST(request: NextRequest) {
  const isAuthenticated = await authenticateAdmin(request);
  if (!isAuthenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { agent_user_id, slack_user_id, slack_display_name, is_active } =
      await request.json();

    if (!agent_user_id || !slack_user_id) {
      return NextResponse.json(
        { error: "agent_user_id and slack_user_id are required" },
        { status: 400 },
      );
    }

    const supabase = await createServiceClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("agent_slack_mappings")
      .insert({
        agent_user_id,
        slack_user_id,
        slack_display_name: slack_display_name || null,
        is_active: is_active !== false,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error creating Slack mapping:", error);
    return NextResponse.json(
      { error: "Failed to create Slack mapping" },
      { status: 500 },
    );
  }
}
