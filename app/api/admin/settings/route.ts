import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { authenticateAdmin } from "@/lib/auth/admin";

// GET /api/admin/settings - Get all settings
export async function GET(request: NextRequest) {
  const isAuthenticated = await authenticateAdmin(request);
  if (!isAuthenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = await createServiceClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("settings")
      .select("*");

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 },
    );
  }
}

// POST /api/admin/settings - Update a single setting
export async function POST(request: NextRequest) {
  const isAuthenticated = await authenticateAdmin(request);
  if (!isAuthenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { key, value } = await request.json();

    if (!key) {
      return NextResponse.json(
        { error: "Setting key is required" },
        { status: 400 },
      );
    }

    // Verify environment variables are loaded
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("[Admin Settings] Missing env vars:", {
        urlPresent: !!supabaseUrl,
        keyPresent: !!serviceRoleKey,
      });
      return NextResponse.json(
        {
          error: "Server configuration error",
          message: "Missing Supabase configuration",
        },
        { status: 500 },
      );
    }

    const supabase = await createServiceClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("settings")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .upsert({ key, value: String(value) } as any, { onConflict: "key" })
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, key, value });
  } catch (error) {
    console.error("Error updating setting:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails =
      error instanceof Error && "hint" in error
        ? (error as any).hint
        : undefined;
    return NextResponse.json(
      {
        error: "Failed to update setting",
        message: errorMessage,
        hint: errorDetails,
      },
      { status: 500 },
    );
  }
}

// PUT /api/admin/settings - Update multiple settings
export async function PUT(request: NextRequest) {
  const isAuthenticated = await authenticateAdmin(request);
  if (!isAuthenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { settings } = await request.json();
    const supabase = await createServiceClient();

    // Update each setting
    for (const [key, value] of Object.entries(settings)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("settings")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .upsert({ key, value: String(value) } as any, { onConflict: "key" })
        .select();

      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 },
    );
  }
}
