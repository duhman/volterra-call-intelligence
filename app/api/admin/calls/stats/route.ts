import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { authenticateAdmin } from "@/lib/auth/admin";

interface CallSession {
  transcription_status: string | null;
  recording_status: string | null;
  consent_status: string | null;
}

// GET /api/admin/calls/stats - Get call statistics
// Now reads from telavox_call_sessions (the active table for Telavox pipeline)
export async function GET(request: NextRequest) {
  const isAuthenticated = await authenticateAdmin(request);
  if (!isAuthenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = await createServiceClient();

    // Query telavox_call_sessions - the active table for Telavox pipeline
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("telavox_call_sessions")
      .select("transcription_status, recording_status, consent_status");

    if (error) throw error;

    const sessions = (data || []) as CallSession[];

    // Calculate stats based on telavox_call_sessions status fields
    const stats = {
      total: sessions.length,
      // Completed = transcription completed successfully
      completed: sessions.filter((s) => s.transcription_status === "completed")
        .length,
      // Processing = transcription in progress OR consent pending/approved but not yet transcribed
      processing: sessions.filter(
        (s) =>
          s.transcription_status === "in_progress" ||
          (s.consent_status === "approved" &&
            s.transcription_status === "pending"),
      ).length,
      // Pending = waiting for consent or recording
      pending: sessions.filter(
        (s) =>
          s.consent_status === "pending" ||
          (s.recording_status === "pending" &&
            s.transcription_status === "pending"),
      ).length,
      // Skipped = consent declined OR recording not found
      skipped: sessions.filter(
        (s) =>
          s.consent_status === "declined" ||
          s.recording_status === "not_found" ||
          s.transcription_status === "failed",
      ).length,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching call stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch call statistics" },
      { status: 500 },
    );
  }
}
