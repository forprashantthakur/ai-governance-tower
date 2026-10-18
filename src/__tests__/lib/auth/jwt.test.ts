/**
 * Unit tests — src/lib/auth/jwt.ts
 * Tests signJwt, verifyJwt, and extractBearerToken.
 */

import { signJwt, verifyJwt, extractBearerToken } from "@/lib/auth/jwt";

const VALID_PAYLOAD = {
  userId: "user-123",
  email: "test@example.com",
  name: "Test User",
  organizationId: "org-456",
  orgRole: "RISK_OFFICER" as const,
  plan: "PROFESSIONAL" as const,
};

// ─── signJwt + verifyJwt round-trip ───────────────────────────────────────
describe("signJwt() + verifyJwt()", () => {
  it("signs and verifies a valid payload", async () => {
    const token = await signJwt(VALID_PAYLOAD);
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3); // JWT = header.payload.signature
  });

  it("verified payload contains all original fields", async () => {
    const token = await signJwt(VALID_PAYLOAD);
    const decoded = await verifyJwt(token);
    expect(decoded.userId).toBe(VALID_PAYLOAD.userId);
    expect(decoded.email).toBe(VALID_PAYLOAD.email);
    expect(decoded.name).toBe(VALID_PAYLOAD.name);
    expect(decoded.organizationId).toBe(VALID_PAYLOAD.organizationId);
    expect(decoded.orgRole).toBe(VALID_PAYLOAD.orgRole);
    expect(decoded.plan).toBe(VALID_PAYLOAD.plan);
  });

  it("token includes issuer and audience claims", async () => {
    const token = await signJwt(VALID_PAYLOAD);
    const decoded = await verifyJwt(token);
    expect(decoded.iss).toBe("ai-governance-tower");
    expect(decoded.aud).toBe("ai-governance-tower-client");
  });

  it("token has iat (issued-at) and exp (expiry) fields", async () => {
    const token = await signJwt(VALID_PAYLOAD);
    const decoded = await verifyJwt(token);
    expect(typeof decoded.iat).toBe("number");
    expect(typeof decoded.exp).toBe("number");
    expect(decoded.exp!).toBeGreaterThan(decoded.iat!);
  });

  it("rejects a tampered token", async () => {
    const token = await signJwt(VALID_PAYLOAD);
    const parts = token.split(".");
    // Corrupt the payload segment
    parts[1] = Buffer.from(JSON.stringify({ userId: "hacker" })).toString("base64url");
    const tampered = parts.join(".");
    await expect(verifyJwt(tampered)).rejects.toThrow();
  });

  it("rejects an empty string", async () => {
    await expect(verifyJwt("")).rejects.toThrow();
  });

  it("rejects a random string (not a JWT)", async () => {
    await expect(verifyJwt("not.a.jwt")).rejects.toThrow();
  });

  it("rejects a JWT signed with a different secret", async () => {
    // Manually create a token using a different secret via jose
    const { SignJWT } = await import("jose");
    const wrongSecret = new TextEncoder().encode("wrong-secret-!!!!!!!!!!!!!!!!!!");
    const badToken = await new SignJWT({ userId: "evil" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("1h")
      .setIssuer("ai-governance-tower")
      .setAudience("ai-governance-tower-client")
      .sign(wrongSecret);
    await expect(verifyJwt(badToken)).rejects.toThrow();
  });

  it("rejects a token with wrong issuer", async () => {
    const { SignJWT } = await import("jose");
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET ?? "fallback-dev-secret-min-32-chars-!!"
    );
    const wrongIssuerToken = await new SignJWT({ userId: "x" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("1h")
      .setIssuer("wrong-issuer")
      .setAudience("ai-governance-tower-client")
      .sign(secret);
    await expect(verifyJwt(wrongIssuerToken)).rejects.toThrow();
  });

  it("rejects a token with wrong audience", async () => {
    const { SignJWT } = await import("jose");
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET ?? "fallback-dev-secret-min-32-chars-!!"
    );
    const wrongAudienceToken = await new SignJWT({ userId: "x" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("1h")
      .setIssuer("ai-governance-tower")
      .setAudience("wrong-audience")
      .sign(secret);
    await expect(verifyJwt(wrongAudienceToken)).rejects.toThrow();
  });
});

// ─── extractBearerToken() ─────────────────────────────────────────────────
describe("extractBearerToken()", () => {
  it("extracts token from valid Bearer header", () => {
    const result = extractBearerToken("Bearer abc.def.ghi");
    expect(result).toBe("abc.def.ghi");
  });

  it("returns null for null header", () => {
    expect(extractBearerToken(null)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(extractBearerToken("")).toBeNull();
  });

  it("returns null when header does not start with 'Bearer '", () => {
    expect(extractBearerToken("Token abc.def.ghi")).toBeNull();
  });

  it("returns null for 'bearer' in lowercase (case-sensitive)", () => {
    expect(extractBearerToken("bearer abc.def.ghi")).toBeNull();
  });

  it("returns null for 'Bearer' without space", () => {
    expect(extractBearerToken("Bearerabc.def.ghi")).toBeNull();
  });

  it("handles 'Bearer ' with no token — returns empty string", () => {
    expect(extractBearerToken("Bearer ")).toBe("");
  });

  it("preserves whitespace in token if present", () => {
    // Unusual but shouldn't crash
    const result = extractBearerToken("Bearer   spaced");
    expect(result).toBe("  spaced");
  });

  it("works with real signed token", async () => {
    const token = await signJwt(VALID_PAYLOAD);
    const result = extractBearerToken(`Bearer ${token}`);
    expect(result).toBe(token);
  });
});
