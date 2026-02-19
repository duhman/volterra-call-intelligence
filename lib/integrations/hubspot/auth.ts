/**
 * HubSpot MCP Server - Auth Operations
 * Wrapper around existing auth functions for consistency and discoverability
 */

import { getHubSpotAccessToken } from "@/lib/hubspot/auth";
import { hasValidHubSpotAuth } from "@/lib/hubspot/tokenManager";
import type { AuthStatusResponse } from "./types";

/**
 * Simplified auth status leveraging a single private app access token.
 * Returns authenticated=true if the env token is present.
 */
export async function checkAuthStatus(
  userId: string
): Promise<AuthStatusResponse> {
  try {
    const envPresent = Boolean(process.env.HUBSPOT_PRIVATE_ACCESS_TOKEN);
    const legacyUserAuth = await hasValidHubSpotAuth(userId);
    return { isAuthenticated: envPresent && legacyUserAuth };
  } catch (error) {
    console.error("Failed to check auth status:", error);
    return { isAuthenticated: false };
  }
}

/**
 * Get access token (private app). Kept for parity with previous getAuthUrl/handleOAuthCallback usage.
 */
export function getAccessToken(): { access_token: string } {
  return { access_token: getHubSpotAccessToken() };
}

// Backwards compatibility exported no-op placeholders (will be removed in future major version)
export async function getAuthUrl() {
  throw new Error(
    "OAuth removed: direct authorization URL no longer available. Use private app token."
  );
}

export async function handleOAuthCallback() {
  throw new Error(
    "OAuth callback handling removed. Configure HUBSPOT_PRIVATE_ACCESS_TOKEN instead."
  );
}

export async function validateOAuthState() {
  return false;
}
