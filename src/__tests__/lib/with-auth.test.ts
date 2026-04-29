/**
 * Unit tests — src/lib/with-auth.ts
 * Tests the withAuth HOC: token extraction, JWT verification,
 * role enforcement, plan enforcement, and backward-compat overloads.
 */

import { NextRequest } from "next/server";
import { withAuth } from "@/lib/with-auth";
import { signJwt } from "@/lib/auth/jwt";

// ─── Helpers ───────────────────────────────────────────────────────────────
function makeRequest(authHeader?: string): NextRequest {
  const headers = new Headers();
  if (authHeader) headers.set("authorization", authHeader);
  return new NextRequest("http://localhost/api/test", { method: "GET", headers });
}

async function makeToken(overrides: Partial<Parameters<typeof signJwt>[0]> = {}) {
  return signJwt({
    userId: "user-1",
    email: "user@example.com",
    name: "Test User",
    organizationId: "org-abc",
    orgRole: "RISK_OFFICER",
    plan: "PROFESSIONAL",
    ...overrides,
  });
}

const okHandler = jest.fn().mockResolvedValue(
  new Response(JSON.stringify({ ok: true }), { status: 200 })
);

afterEach(() => {
  jest.clearAllMocks();
});

// ─── No token ──────────────────────────────────────────────────────────────
describe("withAuth() — missing token", () => {
  it("returns 401 when no Authorization header", async () => {
    const route = withAuth(okHandler);
    const res = await route(makeRequest(), { params: {} });
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toMatch(/no token/i);
  });

  it("returns 401 for non-Bearer header", async () => {
    const route = withAuth(okHandler);
    const res = await route(makeRequest("Basic abc123"), { params: {} });
    expect(res.status).toBe(401);
  });

  it("does not call handler when token missing", async () => {
    const route = withAuth(okHandler);
    await route(makeRequest(), { params: {} });
    expect(okHandler).not.toHaveBeenCalled();
  });
});

// ─── Invalid token ─────────────────────────────────────────────────────────
describe("withAuth() — invalid token", () => {
  it("returns 401 for a random string token", async () => {
    const route = withAuth(okHandler);
    const res = await route(makeRequest("Bearer not.a.valid.jwt"), { params: {} });
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toMatch(/invalid|expired/i);
  });

  it("returns 401 for a tampered JWT", async () => {
    const token = await makeToken();
    const parts = token.split(".");
    parts[1] = Buffer.from(JSON.stringify({ userId: "hacker" })).toString("base64url");
    const tampered = parts.join(".");
    const route = withAuth(okHandler);
    const res = await route(makeRequest(`Bearer ${tampered}`), { params: {} });
    expect(res.status).toBe(401);
  });
});

// ─── Missing organizationId in token ──────────────────────────────────────
describe("withAuth() — legacy token without organizationId", () => {
  it("returns 401 with 'Session expired' message", async () => {
    // Sign a token without organizationId (simulate pre-migration token)
    const { SignJWT } = await import("jose");
    const secret = new TextEncoder().encode("fallback-dev-secret-min-32-chars-!!");
    const oldToken = await new SignJWT({ userId: "old-user", email: "a@b.com" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("1h")
      .setIssuer("ai-governance-tower")
      .setAudience("ai-governance-tower-client")
      .sign(secret);

    const route = withAuth(okHandler);
    const res = await route(makeRequest(`Bearer ${oldToken}`), { params: {} });
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toMatch(/session expired/i);
  });
});

// ─── Valid token — no role requirement ────────────────────────────────────
describe("withAuth() — valid token, no role requirement", () => {
  it("calls handler and injects user + organizationId into context", async () => {
    const token = await makeToken({ orgRole: "VIEWER" });
    const route = withAuth(okHandler);
    const res = await route(makeRequest(`Bearer ${token}`), { params: {} });
    expect(res.status).toBe(200);
    expect(okHandler).toHaveBeenCalledTimes(1);
    const ctx = okHandler.mock.calls[0][1];
    expect(ctx.user.userId).toBe("user-1");
    expect(ctx.organizationId).toBe("org-abc");
  });
});

// ─── Role enforcement ──────────────────────────────────────────────────────
describe("withAuth() — role enforcement", () => {
  const roleLevels = ["VIEWER", "AUDITOR", "RISK_OFFICER", "ADMIN", "OWNER"] as const;

  it.each([
    ["VIEWER", "AUDITOR", 403],
    ["VIEWER", "RISK_OFFICER", 403],
    ["AUDITOR", "RISK_OFFICER", 403],
    ["RISK_OFFICER", "ADMIN", 403],
    ["ADMIN", "OWNER", 403],
  ] as const)(
    "user=%s required=%s → 403",
    async (userRole, requiredRole, expectedStatus) => {
      const token = await makeToken({ orgRole: userRole });
      const route = withAuth(okHandler, requiredRole);
      const res = await route(makeRequest(`Bearer ${token}`), { params: {} });
      expect(res.status).toBe(expectedStatus);
    }
  );

  it.each([
    ["OWNER", "OWNER"],
    ["OWNER", "ADMIN"],
    ["OWNER", "RISK_OFFICER"],
    ["ADMIN", "ADMIN"],
    ["ADMIN", "RISK_OFFICER"],
    ["RISK_OFFICER", "RISK_OFFICER"],
    ["AUDITOR", "AUDITOR"],
    ["VIEWER", "VIEWER"],
  ] as const)(
    "user=%s required=%s → 200 (allowed)",
    async (userRole, requiredRole) => {
      const token = await makeToken({ orgRole: userRole });
      const route = withAuth(okHandler, requiredRole);
      const res = await route(makeRequest(`Bearer ${token}`), { params: {} });
      expect(res.status).toBe(200);
    }
  );

  it("forbidden message includes required role name", async () => {
    const token = await makeToken({ orgRole: "VIEWER" });
    const route = withAuth(okHandler, "RISK_OFFICER");
    const res = await route(makeRequest(`Bearer ${token}`), { params: {} });
    const json = await res.json();
    expect(json.error).toContain("RISK_OFFICER");
  });
});

// ─── Plan enforcement ──────────────────────────────────────────────────────
describe("withAuth() — plan enforcement", () => {
  it("returns 402 when user plan is below required plan", async () => {
    const token = await makeToken({ plan: "TRIAL" });
    const route = withAuth(okHandler, { requiredPlan: "PROFESSIONAL" });
    const res = await route(makeRequest(`Bearer ${token}`), { params: {} });
    expect(res.status).toBe(402);
    const json = await res.json();
    expect(json.error).toContain("PROFESSIONAL");
  });

  it("returns 200 when user plan meets required plan", async () => {
    const token = await makeToken({ plan: "ENTERPRISE" });
    const route = withAuth(okHandler, { requiredPlan: "PROFESSIONAL" });
    const res = await route(makeRequest(`Bearer ${token}`), { params: {} });
    expect(res.status).toBe(200);
  });

  it("returns 402 for STARTER plan requiring ENTERPRISE", async () => {
    const token = await makeToken({ plan: "STARTER" });
    const route = withAuth(okHandler, { requiredPlan: "ENTERPRISE" });
    const res = await route(makeRequest(`Bearer ${token}`), { params: {} });
    expect(res.status).toBe(402);
  });
});

// ─── Backward-compat: bare string role ─────────────────────────────────────
describe("withAuth() — backward-compat: bare role string", () => {
  it("accepts bare role string (old signature)", async () => {
    const token = await makeToken({ orgRole: "OWNER" });
    const route = withAuth(okHandler, "ADMIN"); // bare string
    const res = await route(makeRequest(`Bearer ${token}`), { params: {} });
    expect(res.status).toBe(200);
  });
});

// ─── Params forwarding ─────────────────────────────────────────────────────
describe("withAuth() — params forwarding", () => {
  it("passes route params through to handler", async () => {
    const token = await makeToken();
    const route = withAuth(okHandler);
    await route(makeRequest(`Bearer ${token}`), { params: { id: "model-99" } });
    const ctx = okHandler.mock.calls[0][1];
    expect(ctx.params).toEqual({ id: "model-99" });
  });
});
