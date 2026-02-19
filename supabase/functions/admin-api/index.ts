import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-password",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    console.log("OPTIONS preflight request received for:", req.url);
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminPassword = Deno.env.get("ADMIN_PASSWORD")!;

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    db: { schema: "call_intelligence" },
  });

  try {
    // Verify admin password
    const providedPassword = req.headers.get("x-admin-password");

    if (!providedPassword) {
      console.log("[admin-api] No password provided");
      return new Response(
        JSON.stringify({ error: "Unauthorized - no password provided" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!adminPassword) {
      console.error("[admin-api] ADMIN_PASSWORD env var not set");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Use constant-time comparison to prevent timing attacks
    const passwordsMatch = providedPassword === adminPassword;

    if (!passwordsMatch) {
      console.log(
        `[admin-api] Password mismatch - provided length: ${providedPassword.length}, expected length: ${adminPassword.length}`,
      );
      return new Response(
        JSON.stringify({ error: "Unauthorized - invalid password" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const url = new URL(req.url);
    const path = url.pathname.replace("/admin-api", "");
    const method = req.method;

    console.log(`Admin API: ${method} ${path}`);

    // GET /calls - List all calls
    if (method === "GET" && (path === "/calls" || path === "")) {
      const page = parseInt(url.searchParams.get("page") || "1");
      const limit = parseInt(url.searchParams.get("limit") || "20");
      const search = url.searchParams.get("search") || "";
      const status = url.searchParams.get("status") || "";

      let query = supabase
        .from("calls")
        .select("*, transcriptions(*)", { count: "exact" })
        .order("webhook_timestamp", { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (search) {
        query = query.or(
          `from_number.ilike.%${search}%,to_number.ilike.%${search}%,agent_email.ilike.%${search}%`,
        );
      }

      if (status) {
        query = query.eq("status", status);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      return new Response(
        JSON.stringify({
          calls: data,
          total: count,
          page,
          limit,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // GET /calls/:id - Get single call with transcription
    if (method === "GET" && path.startsWith("/calls/")) {
      const callId = path.replace("/calls/", "");

      const { data, error } = await supabase
        .from("calls")
        .select("*, transcriptions(*)")
        .eq("id", callId)
        .single();

      if (error) throw error;

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /calls/bulk-reprocess - Reprocess all skipped calls
    if (method === "POST" && path === "/calls/bulk-reprocess") {
      // Get all skipped calls
      const { data: skippedCalls, error } = await supabase
        .from("calls")
        .select("id")
        .eq("status", "skipped");

      if (error) throw error;

      const count = skippedCalls?.length || 0;

      if (count === 0) {
        return new Response(JSON.stringify({ status: "complete", count: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Reset all to pending and clear skip data
      await supabase
        .from("calls")
        .update({
          status: "pending",
          error_message: null,
          skip_reason: null,
          is_hubspot_contact: null,
        })
        .eq("status", "skipped");

      // Trigger reprocessing for each call
      const processUrl = `${supabaseUrl}/functions/v1/process-call`;
      for (const call of skippedCalls || []) {
        fetch(processUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${supabaseServiceKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ callId: call.id }),
        }).catch((err) =>
          console.error("Failed to trigger reprocess for call", call.id, err),
        );
      }

      return new Response(JSON.stringify({ status: "reprocessing", count }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /calls/bulk-reprocess-failed - Reprocess all failed calls
    if (method === "POST" && path === "/calls/bulk-reprocess-failed") {
      // Get all failed calls
      const { data: failedCalls, error } = await supabase
        .from("calls")
        .select("id")
        .eq("status", "failed");

      if (error) throw error;

      const count = failedCalls?.length || 0;

      if (count === 0) {
        return new Response(JSON.stringify({ status: "complete", count: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Reset all to pending and clear error data
      await supabase
        .from("calls")
        .update({
          status: "pending",
          error_message: null,
          skip_reason: null,
          is_hubspot_contact: null,
        })
        .eq("status", "failed");

      // Trigger reprocessing for each call
      const processUrl = `${supabaseUrl}/functions/v1/process-call`;
      for (const call of failedCalls || []) {
        fetch(processUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${supabaseServiceKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ callId: call.id }),
        }).catch((err) =>
          console.error("Failed to trigger reprocess for call", call.id, err),
        );
      }

      return new Response(JSON.stringify({ status: "reprocessing", count }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /calls/bulk-regenerate-summaries - Regenerate summaries for all completed calls and resync to HubSpot
    if (method === "POST" && path === "/calls/bulk-regenerate-summaries") {
      // Get all completed calls first
      const { data: completedCalls, error } = await supabase
        .from("calls")
        .select("id")
        .eq("status", "completed");

      if (error) throw error;

      if (!completedCalls || completedCalls.length === 0) {
        return new Response(
          JSON.stringify({
            status: "complete",
            count: 0,
            message: "No completed calls found",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Now check which of these have transcriptions
      const { data: callsWithTranscriptions } = await supabase
        .from("transcriptions")
        .select("call_id")
        .in(
          "call_id",
          completedCalls.map((c) => c.id),
        );

      const callIds = callsWithTranscriptions?.map((t) => t.call_id) || [];
      const count = callIds.length;

      if (count === 0) {
        return new Response(
          JSON.stringify({
            status: "complete",
            count: 0,
            message: "No completed calls with transcriptions found",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      console.log(
        `Bulk regenerating summaries for ${count} completed calls with transcriptions`,
      );

      // Process sequentially with await to ensure completion
      for (const callId of callIds) {
        try {
          console.log(`Processing call ${callId}...`);

          // Step 1: Regenerate summary
          const summaryResp = await fetch(
            `${supabaseUrl}/functions/v1/generate-summary`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-admin-password": providedPassword,
              },
              body: JSON.stringify({ callId, previewOnly: false }),
            },
          );
          console.log(`Summary response for ${callId}: ${summaryResp.status}`);

          // Step 2: Sync to HubSpot
          const hubspotResp = await fetch(
            `${supabaseUrl}/functions/v1/hubspot-sync`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${supabaseServiceKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ callId, forceResync: true }),
            },
          );
          console.log(
            `HubSpot sync response for ${callId}: ${hubspotResp.status}`,
          );
        } catch (err) {
          console.error(`Failed to process call ${callId}:`, err);
        }
      }

      return new Response(
        JSON.stringify({
          status: "complete",
          count,
          message: `Regenerated summaries for ${count} calls and synced to HubSpot`,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // POST /calls/:id/reprocess - Reprocess a failed or skipped call
    // Optionally accepts { manualRecordingId: string } in body
    if (method === "POST" && path.match(/\/calls\/[^/]+\/reprocess/)) {
      const callId = path.replace("/calls/", "").replace("/reprocess", "");

      // Parse optional body for manual recording ID
      let manualRecordingId: string | null = null;
      try {
        const body = await req.json();
        manualRecordingId = body.manualRecordingId || null;
      } catch {
        // No body or invalid JSON - that's fine
      }

      // If manual recording ID provided, store it in telavox_recording_id field
      const updateData: Record<string, any> = {
        status: "pending",
        error_message: null,
        skip_reason: null,
        is_hubspot_contact: null,
      };

      if (manualRecordingId) {
        updateData.telavox_recording_id = manualRecordingId;
        console.log(`Manual recording ID provided: ${manualRecordingId}`);
      }

      await supabase.from("calls").update(updateData).eq("id", callId);

      // Trigger reprocessing
      const processUrl = `${supabaseUrl}/functions/v1/process-call`;
      await fetch(processUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${supabaseServiceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ callId, manualRecordingId }),
      });

      return new Response(
        JSON.stringify({ status: "reprocessing", callId, manualRecordingId }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // GET /logs - Get webhook logs
    if (method === "GET" && path === "/logs") {
      const page = parseInt(url.searchParams.get("page") || "1");
      const limit = parseInt(url.searchParams.get("limit") || "50");

      const { data, error, count } = await supabase
        .from("webhook_logs")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (error) throw error;

      return new Response(
        JSON.stringify({
          logs: data,
          total: count,
          page,
          limit,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // GET /stats - Get dashboard statistics (including HubSpot sync stats)
    if (method === "GET" && path === "/stats") {
      const [
        { count: totalCalls },
        { count: completedCalls },
        { count: pendingCalls },
        { count: failedCalls },
        { count: todayCalls },
        { count: hubspotSyncedCalls },
      ] = await Promise.all([
        supabase.from("calls").select("*", { count: "exact", head: true }),
        supabase
          .from("calls")
          .select("*", { count: "exact", head: true })
          .eq("status", "completed"),
        supabase
          .from("calls")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase
          .from("calls")
          .select("*", { count: "exact", head: true })
          .eq("status", "failed"),
        supabase
          .from("calls")
          .select("*", { count: "exact", head: true })
          .gte(
            "created_at",
            new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
          ),
        supabase
          .from("calls")
          .select("*", { count: "exact", head: true })
          .not("hubspot_call_id", "is", null),
      ]);

      return new Response(
        JSON.stringify({
          totalCalls: totalCalls || 0,
          completedCalls: completedCalls || 0,
          pendingCalls: pendingCalls || 0,
          failedCalls: failedCalls || 0,
          todayCalls: todayCalls || 0,
          hubspotSyncedCalls: hubspotSyncedCalls || 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // GET /webhook-url - Get the webhook URL for PBX setup
    if (method === "GET" && path === "/webhook-url") {
      const webhookUrl = `${supabaseUrl}/functions/v1/telavox-webhook`;

      return new Response(JSON.stringify({ webhookUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /debug/telavox - Debug PBX API connection and response
    if (method === "GET" && path === "/debug/telavox") {
      const telavoxApiKey = Deno.env.get("TELAVOX_API_KEY");

      if (!telavoxApiKey) {
        return new Response(
          JSON.stringify({ error: "TELAVOX_API_KEY not configured" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      console.log("Debug: Testing PBX API connection...");

      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const callHistoryUrl = new URL("https://api.telavox.se/calls");
      callHistoryUrl.searchParams.set("withRecordings", "true");
      callHistoryUrl.searchParams.set(
        "fromDate",
        yesterday.toISOString().split("T")[0],
      );
      callHistoryUrl.searchParams.set(
        "toDate",
        now.toISOString().split("T")[0],
      );

      try {
        const response = await fetch(callHistoryUrl.toString(), {
          headers: {
            Authorization: `Bearer ${telavoxApiKey}`,
            Accept: "application/json",
          },
        });

        const responseText = await response.text();
        let data: any;

        try {
          data = JSON.parse(responseText);
        } catch {
          return new Response(
            JSON.stringify({
              status: response.status,
              error: "Invalid JSON response",
              raw_response: responseText.slice(0, 1000),
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        // Analyze the response
        const incoming = data.incoming || [];
        const outgoing = data.outgoing || [];
        const missed = data.missed || [];
        const allCalls = [...incoming, ...outgoing, ...missed];

        const withRecordings = allCalls.filter(
          (c: any) => c.recordingId && c.recordingId !== "0",
        );
        const withoutRecordings = allCalls.filter(
          (c: any) => !c.recordingId || c.recordingId === "0",
        );

        // Get field names from first call of each type
        const sampleFields =
          allCalls.length > 0 ? Object.keys(allCalls[0]) : [];

        return new Response(
          JSON.stringify({
            api_status: response.status,
            api_ok: response.ok,
            date_range: {
              from: yesterday.toISOString().split("T")[0],
              to: now.toISOString().split("T")[0],
            },
            summary: {
              total_calls: allCalls.length,
              incoming_count: incoming.length,
              outgoing_count: outgoing.length,
              missed_count: missed.length,
              with_recording_id: withRecordings.length,
              without_recording_id: withoutRecordings.length,
            },
            available_fields: sampleFields,
            sample_calls_with_recording: withRecordings
              .slice(0, 3)
              .map((c: any) => ({
                number: c.number || c.numberE164,
                dateTime: c.dateTimeISO || c.datetimeISO || c.datetime,
                recordingId: c.recordingId,
                callId: c.callId,
                duration: c.duration || c.durationSeconds,
              })),
            sample_calls_without_recording: withoutRecordings
              .slice(0, 3)
              .map((c: any) => ({
                number: c.number || c.numberE164,
                dateTime: c.dateTimeISO || c.datetimeISO || c.datetime,
                recordingId: c.recordingId,
                callId: c.callId,
                duration: c.duration || c.durationSeconds,
                all_fields: c,
              })),
            raw_response: data,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      } catch (fetchError) {
        console.error("Debug: PBX API fetch error:", fetchError);
        return new Response(
          JSON.stringify({
            error: "Failed to fetch from PBX API",
            message:
              fetchError instanceof Error
                ? fetchError.message
                : "Unknown error",
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    // GET /debug/telavox-key/:email - Test a specific agent's PBX API key
    // This helps diagnose why recordings aren't being found for an agent
    if (method === "GET" && path.startsWith("/debug/telavox-key/")) {
      const email = decodeURIComponent(path.replace("/debug/telavox-key/", ""))
        .toLowerCase()
        .trim();

      console.log(`Debug: Testing PBX API key for agent: ${email}`);

      // Look up the agent's API key
      const { data: agentKey, error: keyError } = await supabase
        .from("telavox_api_keys")
        .select("api_key, agent_email, display_name, created_at")
        .eq("agent_email", email)
        .maybeSingle();

      if (keyError) {
        return new Response(
          JSON.stringify({
            error: "Database lookup failed",
            details: keyError.message,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      if (!agentKey) {
        return new Response(
          JSON.stringify({
            error: "No API key found",
            searched_email: email,
            suggestion:
              "Add an API key for this agent in Settings > Agent API Keys",
          }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Test the API key by fetching recent calls
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const callHistoryUrl = new URL("https://api.telavox.se/calls");
      callHistoryUrl.searchParams.set("withRecordings", "true");
      callHistoryUrl.searchParams.set(
        "fromDate",
        yesterday.toISOString().split("T")[0],
      );
      callHistoryUrl.searchParams.set(
        "toDate",
        now.toISOString().split("T")[0],
      );

      try {
        const response = await fetch(callHistoryUrl.toString(), {
          headers: {
            Authorization: `Bearer ${agentKey.api_key}`,
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          return new Response(
            JSON.stringify({
              agent_email: agentKey.agent_email,
              display_name: agentKey.display_name,
              key_created_at: agentKey.created_at,
              api_status: response.status,
              api_ok: false,
              error: "API key is invalid or expired",
              details: errorText.slice(0, 500),
              suggestion:
                "Create a new API token for this user in your PBX provider: My Account > Username and Password > Manage tokens",
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        const data = await response.json();

        const incoming = data.incoming || [];
        const outgoing = data.outgoing || [];
        const missed = data.missed || [];
        const allCalls = [...incoming, ...outgoing, ...missed];
        const withRecordings = allCalls.filter(
          (c: any) => c.recordingId && c.recordingId !== "0",
        );

        return new Response(
          JSON.stringify({
            agent_email: agentKey.agent_email,
            display_name: agentKey.display_name,
            key_created_at: agentKey.created_at,
            api_status: response.status,
            api_ok: true,
            date_range: {
              from: yesterday.toISOString().split("T")[0],
              to: now.toISOString().split("T")[0],
            },
            summary: {
              total_calls: allCalls.length,
              incoming_count: incoming.length,
              outgoing_count: outgoing.length,
              missed_count: missed.length,
              with_recording_id: withRecordings.length,
            },
            sample_calls: allCalls.slice(0, 5).map((c: any) => ({
              number: c.number || c.numberE164,
              dateTime: c.dateTimeISO || c.datetimeISO || c.datetime,
              recordingId: c.recordingId || null,
              direction: c.callDirection || "unknown",
            })),
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      } catch (fetchError) {
        return new Response(
          JSON.stringify({
            agent_email: agentKey.agent_email,
            error: "Failed to connect to PBX API",
            details:
              fetchError instanceof Error
                ? fetchError.message
                : "Unknown error",
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    // POST /verify - Verify admin password (for login)
    if (method === "POST" && path === "/verify") {
      return new Response(JSON.stringify({ valid: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /calls/:id/hubspot-sync - Manually sync call to HubSpot
    if (method === "POST" && path.match(/\/calls\/[^/]+\/hubspot-sync/)) {
      const callId = path.replace("/calls/", "").replace("/hubspot-sync", "");

      // Trigger HubSpot sync (always force resync for manual triggers)
      const hubspotSyncUrl = `${supabaseUrl}/functions/v1/hubspot-sync`;
      const syncResponse = await fetch(hubspotSyncUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${supabaseServiceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ callId, forceResync: true }),
      });

      const syncResult = await syncResponse.json();

      return new Response(JSON.stringify(syncResult), {
        status: syncResponse.ok ? 200 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /blocked-numbers - Get all blocked numbers
    if (method === "GET" && path === "/blocked-numbers") {
      const { data, error } = await supabase
        .from("blocked_numbers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return new Response(JSON.stringify({ blockedNumbers: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /blocked-numbers - Add a blocked number
    if (method === "POST" && path === "/blocked-numbers") {
      const body = await req.json();
      const { phoneNumber, reason } = body;

      if (!phoneNumber) {
        return new Response(
          JSON.stringify({ error: "Phone number is required" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Normalize the phone number
      const normalized = phoneNumber.replace(/[^0-9+]/g, "");

      const { data, error } = await supabase
        .from("blocked_numbers")
        .insert({ phone_number: normalized, reason: reason || null })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          // Unique violation
          return new Response(
            JSON.stringify({ error: "Number already blocked" }),
            {
              status: 409,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }
        throw error;
      }

      return new Response(JSON.stringify(data), {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // DELETE /blocked-numbers/:id - Remove a blocked number
    if (method === "DELETE" && path.startsWith("/blocked-numbers/")) {
      const id = path.replace("/blocked-numbers/", "");

      const { error } = await supabase
        .from("blocked_numbers")
        .delete()
        .eq("id", id);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /telavox-keys - List all agent API keys (masked)
    if (method === "GET" && path === "/telavox-keys") {
      const { data, error } = await supabase
        .from("telavox_api_keys")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Mask API keys for security
      const maskedKeys = (data || []).map((k: any) => ({
        ...k,
        api_key: k.api_key
          ? `${k.api_key.slice(0, 4)}...${k.api_key.slice(-4)}`
          : "",
      }));

      return new Response(JSON.stringify({ keys: maskedKeys }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /telavox-keys - Add new agent API key
    if (method === "POST" && path === "/telavox-keys") {
      const body = await req.json();
      const { agentEmail, apiKey, displayName, hubspotUserId } = body;

      if (!agentEmail || !apiKey) {
        return new Response(
          JSON.stringify({ error: "agentEmail and apiKey are required" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const { data, error } = await supabase
        .from("telavox_api_keys")
        .insert({
          agent_email: agentEmail.toLowerCase().trim(),
          api_key: apiKey.trim(),
          display_name: displayName?.trim() || null,
          hubspot_user_id: hubspotUserId?.trim() || null,
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          return new Response(
            JSON.stringify({
              error: "Agent already has an API key configured",
            }),
            {
              status: 409,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }
        throw error;
      }

      return new Response(
        JSON.stringify({
          ...data,
          api_key: `${data.api_key.slice(0, 4)}...${data.api_key.slice(-4)}`,
        }),
        {
          status: 201,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // PUT /telavox-keys/:id - Update agent API key
    if (method === "PUT" && path.match(/^\/telavox-keys\/[^/]+$/)) {
      const id = path.replace("/telavox-keys/", "");
      const body = await req.json();
      const { apiKey, displayName, hubspotUserId } = body;

      const updateData: Record<string, any> = {};
      if (apiKey) updateData.api_key = apiKey.trim();
      if (displayName !== undefined)
        updateData.display_name = displayName?.trim() || null;
      if (hubspotUserId !== undefined)
        updateData.hubspot_user_id = hubspotUserId?.trim() || null;

      if (Object.keys(updateData).length === 0) {
        return new Response(JSON.stringify({ error: "No fields to update" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data, error } = await supabase
        .from("telavox_api_keys")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({
          ...data,
          api_key: `${data.api_key.slice(0, 4)}...${data.api_key.slice(-4)}`,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // DELETE /telavox-keys/:id - Remove agent API key
    if (method === "DELETE" && path.match(/^\/telavox-keys\/[^/]+$/)) {
      const id = path.replace("/telavox-keys/", "");

      const { error } = await supabase
        .from("telavox_api_keys")
        .delete()
        .eq("id", id);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /settings/:key - Get a setting value
    if (method === "GET" && path.startsWith("/settings/")) {
      const key = path.replace("/settings/", "");

      const { data, error } = await supabase
        .from("settings")
        .select("value")
        .eq("key", key)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      return new Response(JSON.stringify({ key, value: data?.value || null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // PUT /settings/:key - Update a setting value
    if (method === "PUT" && path.startsWith("/settings/")) {
      const key = path.replace("/settings/", "");
      const body = await req.json();
      const { value } = body;

      const { error } = await supabase
        .from("settings")
        .upsert({ key, value }, { onConflict: "key" });

      if (error) throw error;

      return new Response(JSON.stringify({ key, value, success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Admin API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
