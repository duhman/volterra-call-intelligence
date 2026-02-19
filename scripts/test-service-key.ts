/**
 * Test script to verify Supabase service role key
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { resolve } from "path";

// Load .env.local
dotenv.config({ path: resolve(__dirname, "../.env.local") });

async function testServiceKey() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log("Testing Supabase service role key...");
  console.log("URL:", supabaseUrl);
  console.log("Key present:", !!serviceRoleKey);
  console.log("Key length:", serviceRoleKey?.length || 0);
  console.log("Key prefix:", serviceRoleKey?.substring(0, 30) || "N/A");

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing required environment variables");
    process.exit(1);
  }

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      db: {
        schema: "call_intelligence",
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Test query
    console.log("\nTesting query to 'settings' table...");
    const { data, error } = await (supabase as any)
      .from("settings")
      .select("*")
      .limit(1);

    if (error) {
      console.error("❌ Query failed:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      console.error("Error hint:", error.hint);
      process.exit(1);
    }

    console.log("✅ Query successful!");
    console.log("Data:", data);
  } catch (error) {
    console.error("❌ Client creation or query failed:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    process.exit(1);
  }
}

testServiceKey();
