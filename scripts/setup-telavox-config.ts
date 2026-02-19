/**
 * Setup PBX Org Config Script
 * Run this to configure your PBX org in the database
 *
 * Usage:
 *   npx tsx scripts/setup-telavox-config.ts
 */

import { createClient } from "@supabase/supabase-js";

async function setupTelavoxConfig() {
  const orgId = process.env.TELAVOX_ORG_ID || "VOLTERRA_ORG";
  const hubspotPortalId = process.env.HUBSPOT_PORTAL_ID;
  const webhookSecret = process.env.TELAVOX_WEBHOOK_SECRET;
  const accessToken = process.env.TELAVOX_ACCESS_TOKEN;
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!hubspotPortalId) {
    console.error("Error: HUBSPOT_PORTAL_ID environment variable is required");
    process.exit(1);
  }

  if (!webhookSecret) {
    console.error(
      "Error: TELAVOX_WEBHOOK_SECRET environment variable is required",
    );
    process.exit(1);
  }

  if (!accessToken) {
    console.error(
      "Error: TELAVOX_ACCESS_TOKEN environment variable is required",
    );
    console.error("This is different from TELAVOX_WEBHOOK_SECRET");
    console.error(
      "Get your API access token from your PBX provider API settings",
    );
    process.exit(1);
  }

  if (!supabaseUrl || !supabaseKey) {
    console.error(
      "Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required",
    );
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase
    .from("telavox_org_configs")
    .upsert(
      {
        telavox_org_id: orgId,
        hubspot_portal_id: hubspotPortalId,
        webhook_secret: webhookSecret,
        access_token: accessToken,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "telavox_org_id",
      },
    )
    .select()
    .single();

  if (error) {
    console.error("Failed to setup PBX config:", error);
    process.exit(1);
  }

  console.log("PBX org config updated successfully!");
  console.log(`   Org ID: ${data.telavox_org_id}`);
  console.log(`   HubSpot Portal ID: ${data.hubspot_portal_id}`);
  console.log(
    `   Webhook Secret: ${data.webhook_secret ? "✅ Set" : "❌ Missing"}`,
  );
  console.log(
    `   Access Token: ${data.access_token ? "✅ Set" : "❌ Missing"}`,
  );
}

setupTelavoxConfig().catch(console.error);
