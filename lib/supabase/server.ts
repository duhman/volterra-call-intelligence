import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { Database } from "./types";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set(name, value, options);
          } catch {}
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set(name, "", { ...options, maxAge: 0 });
          } catch {}
        },
      },
      db: {
        schema: "call_intelligence" as any, // Type assertion needed for custom schema
      },
    },
  );
}

export async function createServiceClient() {
  // Service role operations should use createClient from @supabase/supabase-js
  // directly, not createServerClient which is for user sessions
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    const missing = [];
    if (!supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
    if (!serviceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }

  // Log key presence (but not the actual key) for debugging
  if (process.env.DEBUG_SUPABASE_CLIENT === "true") {
    console.log("[Supabase] Creating service client:", {
      url: supabaseUrl,
      keyPresent: !!serviceRoleKey,
      keyLength: serviceRoleKey?.length || 0,
      keyPrefix: serviceRoleKey?.substring(0, 20) + "..." || "missing",
    });
  }

  return createSupabaseClient<Database>(supabaseUrl, serviceRoleKey, {
    db: {
      schema: "call_intelligence" as any, // Type assertion needed for custom schema
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
