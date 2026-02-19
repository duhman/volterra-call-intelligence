import { NextRequest } from "next/server";
import crypto from "crypto";

/**
 * Constant-time string comparison to prevent timing attacks
 */
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still do a comparison to maintain constant time even on length mismatch
    crypto.timingSafeEqual(Buffer.from(a), Buffer.from(a));
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Authenticate admin request using Bearer token
 * Returns true if authenticated, null if not
 */
export async function authenticateAdmin(
  request: NextRequest,
): Promise<boolean | null> {
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.substring(7);
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return null;
  }

  if (!safeCompare(token, adminPassword)) {
    return null;
  }

  return true;
}

/**
 * Validate admin password directly
 * Used for login endpoint
 */
export function validateAdminPassword(password: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    console.error("ADMIN_PASSWORD environment variable is not set");
    return false;
  }

  return safeCompare(password, adminPassword);
}
