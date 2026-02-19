import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { authenticateAdmin } from "@/lib/auth/admin";

// PUT /api/admin/slack-mappings/[id] - Update agent Slack mapping
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const isAuthenticated = await authenticateAdmin(request);
  if (!isAuthenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
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
      .update({
        agent_user_id,
        slack_user_id,
        slack_display_name: slack_display_name || null,
        is_active: is_active !== false,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error updating Slack mapping:", error);
    return NextResponse.json(
      { error: "Failed to update Slack mapping" },
      { status: 500 },
    );
  }
}

// DELETE /api/admin/slack-mappings/[id] - Delete agent Slack mapping
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const isAuthenticated = await authenticateAdmin(request);
  if (!isAuthenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const supabase = await createServiceClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("agent_slack_mappings")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting Slack mapping:", error);
    return NextResponse.json(
      { error: "Failed to delete Slack mapping" },
      { status: 500 },
    );
  }
}
