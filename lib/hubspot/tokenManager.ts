/**
 * Deprecated OAuth Token Manager (stub)
 *
 * The system now uses a single private app access token supplied via the
 * HUBSPOT_PRIVATE_ACCESS_TOKEN environment variable. All per-user OAuth
 * token storage & refresh logic has been removed. These helpers provide a
 * backwards-compatible interface for existing imports while delegating to
 * the environment variable.
 */

export interface HubSpotTokenData {
  access_token: string;
  refresh_token: string;
  expires_at: string;
}

// Distant future timestamp used to satisfy legacy "is expired" checks
const FAR_FUTURE_ISO = "2999-12-31T23:59:59.000Z";

/**
 * Return a pseudo token record using the private app access token.
 * User ID is ignored; retained only for signature compatibility.
 * 
 * Returns null if token is missing (for graceful degradation in non-critical operations).
 * Throws error if required (for critical operations that need the token).
 */
export async function getValidHubSpotToken(
   
  _userId: string,
  options?: { required?: boolean }
): Promise<HubSpotTokenData | null> {
  const token = process.env.HUBSPOT_PRIVATE_ACCESS_TOKEN;
  if (!token) {
    if (options?.required !== false) {
      throw new Error(
        "Missing HUBSPOT_PRIVATE_ACCESS_TOKEN env variable. " +
        "For Developer Platform apps: Get 'Auth Static token' from Apps > Your App > Auth tab. " +
        "For legacy private apps: Get access token from Settings > Integrations > Private Apps > Your App > Auth tab."
      );
    }
    return null;
  }
  return {
    access_token: token,
    refresh_token: "",
    expires_at: FAR_FUTURE_ISO,
  };
}

/**
 * Always returns true if the private token is present.
 */
export async function hasValidHubSpotAuth(
   
  _userId: string
): Promise<boolean> {
  return Boolean(process.env.HUBSPOT_PRIVATE_ACCESS_TOKEN);
}

// Legacy functions retained as no-ops (for safety if imported elsewhere)
export async function revokeHubSpotToken(
   
  _userId: string
): Promise<void> {
  // No-op: private app token cannot be revoked programmatically here
}

export async function refreshHubSpotToken(
   
  _userId: string,
   
  _refreshToken: string
): Promise<HubSpotTokenData> {
  const token = await getValidHubSpotToken(_userId);
  if (!token) {
    throw new Error("Cannot refresh token: HUBSPOT_PRIVATE_ACCESS_TOKEN not configured");
  }
  return token;
}

export function isTokenExpired(
   
  _expiresAt: string
): boolean {
  return false;
}
