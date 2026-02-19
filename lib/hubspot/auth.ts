/**
 * Deprecated OAuth helpers (replaced by private app access token)
 *
 * This module now exposes a single helper to retrieve the HubSpot private
 * app access token from the environment. Former OAuth-related exports have
 * been removed. Any attempt to call deprecated functions should be updated
 * to use the private token model.
 */

/**
 * Retrieve the HubSpot private app access token from the environment.
 * Throws if missing to surface misconfiguration early.
 * 
 * For HubSpot Developer Platform apps: Get the "Auth Static token" from Apps > Your App > Auth tab
 * For legacy private apps: Get the access token from Settings > Integrations > Private Apps > Your App > Auth tab
 */
export function getHubSpotAccessToken(): string {
  const token = process.env.HUBSPOT_PRIVATE_ACCESS_TOKEN;
  if (!token) {
    throw new Error(
      "Missing HUBSPOT_PRIVATE_ACCESS_TOKEN env variable. " +
      "For Developer Platform apps: Get 'Auth Static token' from Apps > Your App > Auth tab. " +
      "For legacy private apps: Get access token from Settings > Integrations > Private Apps > Your App > Auth tab."
    );
  }
  return token;
}

// Backwards compatibility stubs (in case lingering imports exist)
export function getHubSpotAuthUrl(): string {
  throw new Error(
    "OAuth flow deprecated: use private app access token (HUBSPOT_PRIVATE_ACCESS_TOKEN)"
  );
}

export async function exchangeCodeForToken(): Promise<never> {
  throw new Error("OAuth token exchange no longer supported");
}

export async function refreshAccessToken(): Promise<never> {
  throw new Error("OAuth token refresh no longer supported");
}

export async function storeOAuthState(): Promise<void> {
  // No-op; states are not used anymore
}

export async function validateAndDeleteOAuthState(): Promise<boolean> {
  return false;
}
