import { createHash, timingSafeEqual } from "crypto";

/**
 * A short fingerprint of the user's password hash, stored in each session
 * token. Changing or resetting the password changes the fingerprint, so every
 * session issued before the change stops working on its next request.
 * (Node runtime only.)
 */
export function sessionFingerprint(passwordHash: string): string {
  return createHash("sha256").update(`session:${passwordHash}`).digest("base64url").slice(0, 22);
}

export function fingerprintMatches(tokenValue: unknown, passwordHash: string): boolean {
  if (typeof tokenValue !== "string" || tokenValue.length === 0) return false;
  const expected = Buffer.from(sessionFingerprint(passwordHash));
  const actual = Buffer.from(tokenValue);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
