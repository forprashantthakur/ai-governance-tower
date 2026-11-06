/**
 * Runs once when a server instance starts. A deployment without a strong
 * JWT_SECRET must not serve requests at all.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" || process.env.NEXT_RUNTIME === "edge") {
    const { assertJwtSecretConfigured } = await import("./lib/auth/jwt");
    assertJwtSecretConfigured();
  }
}
