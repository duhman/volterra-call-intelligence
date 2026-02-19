import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Verify HubSpot webhook using Signature v3 scheme for Private Apps.
 *
 * Official recipe (simplified here):
 * - Use the Webhook Signing Secret as HMAC key.
 * - Create stringToSign: `${timestamp}${method}${path}${body}`
 * - Compute HMAC-SHA256 and hex encode.
 * - Compare against `X-HubSpot-Signature-v3` using timing safe comparison.
 *
 * References:
 * - https://developers.hubspot.com/docs/api/webhooks/webhooks-overview
 */
function verifyHubSpotSignatureV3(
  method: string,
  path: string,
  body: string,
  timestampHeader: string | null,
  signatureHeader: string | null
): boolean {
  if (!timestampHeader || !signatureHeader) return false;

  const secret = process.env.HUBSPOT_WEBHOOK_SECRET || "";
  if (!secret) {
    console.error(
      "HUBSPOT_WEBHOOK_SECRET is not set; cannot verify webhook signature"
    );
    return false;
  }

  // Basic timestamp freshness check (5 minutes)
  const timestamp = parseInt(timestampHeader, 10);
  if (!Number.isFinite(timestamp)) return false;
  const now = Date.now();
  if (Math.abs(now - timestamp) > 5 * 60 * 1000) return false;

  const stringToSign = `${timestampHeader}${method}${path}${body}`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(stringToSign)
    .digest("hex");

  // Timing-safe comparison
  const expectedBuf = Buffer.from(expected, "utf8");
  const actualBuf = Buffer.from(signatureHeader, "utf8");
  if (expectedBuf.length !== actualBuf.length) return false;

  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

export async function POST(request: NextRequest) {
  try {
    const method = request.method;
    const path = request.nextUrl.pathname;

    const signatureV3 = request.headers.get("X-HubSpot-Signature-v3");
    const timestamp = request.headers.get("X-HubSpot-Request-Timestamp");

    const body = await request.text();

    // Verify signature (v3)
    const isValid = verifyHubSpotSignatureV3(
      method,
      path,
      body,
      timestamp,
      signatureV3
    );

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid HubSpot webhook signature" },
        { status: 401 }
      );
    }

    const data = JSON.parse(body);

    if (!data || !Array.isArray(data)) {
      return NextResponse.json({ status: "ignored" });
    }

    const supabase = await createServiceClient();

    // Process each webhook event
    for (const event of data) {
      const { objectId, subscriptionType } = event;

      // subscriptionType examples from HubSpot docs:
      // - contact.creation
      // - contact.propertyChange
      // - deal.creation
      // - deal.propertyChange
      if (!subscriptionType || !objectId) continue;

      let hubspotObjectType: "contact" | "deal" | "other" = "other";
      if (subscriptionType.startsWith("contact.")) {
        hubspotObjectType = "contact";
      } else if (subscriptionType.startsWith("deal.")) {
        hubspotObjectType = "deal";
      }

      // For now, treat this as an audit log, not a real conversation association.
      const associationType = subscriptionType.endsWith(".creation")
        ? "created"
        : subscriptionType.endsWith(".propertyChange")
        ? "updated"
        : subscriptionType;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: logError } = await (supabase as any)
        .from("conversation_hubspot_associations")
        .insert({
          // Explicitly synthetic ID to avoid confusion with real conversations
          conversation_id: `hubspot-webhook-${hubspotObjectType}-${objectId}`,
          hubspot_object_type: hubspotObjectType,
          hubspot_object_id: objectId,
          association_type: associationType,
        });

      if (logError && !String(logError.message || "").includes("duplicate")) {
        console.error("Failed to log HubSpot webhook event:", logError);
      }
    }

    return NextResponse.json({ status: "received" });
  } catch (error) {
    console.error("HubSpot webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
