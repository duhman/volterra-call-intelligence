import { NextRequest, NextResponse } from "next/server";
import { authenticateAdmin } from "@/lib/auth/admin";

// GET /api/admin/debug/supabase-key - Diagnostic endpoint to check key status
export async function GET(request: NextRequest) {
  const isAuthenticated = await authenticateAdmin(request);
  if (!isAuthenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return NextResponse.json({
    url: supabaseUrl || "MISSING",
    urlPresent: !!supabaseUrl,
    serviceRoleKeyPresent: !!serviceRoleKey,
    serviceRoleKeyLength: serviceRoleKey?.length || 0,
    serviceRoleKeyPrefix: serviceRoleKey
      ? serviceRoleKey.substring(0, 30) + "..."
      : "MISSING",
    anonKeyPresent: !!anonKey,
    anonKeyLength: anonKey?.length || 0,
    note: "If serviceRoleKey is present but queries fail, the key is likely invalid or expired. Get a fresh key from: https://supabase.com/dashboard/project/your-supabase-project-id/settings/api",
  });
}
