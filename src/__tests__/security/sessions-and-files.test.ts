/**
 * Security regression tests — HttpOnly sessions, sign-in limits, private files.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import bcrypt from "bcryptjs";

const mockPrisma = {
  user: { findUnique: jest.fn(), update: jest.fn().mockResolvedValue({}) },
  passwordResetToken: { findUnique: jest.fn(), update: jest.fn().mockResolvedValue({}) },
  $transaction: jest.fn().mockResolvedValue([]),
  organizationMember: { findFirst: jest.fn() },
  evidenceFile: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), delete: jest.fn() },
  complianceControl: { count: jest.fn().mockResolvedValue(1) },
  riskAssessment: { count: jest.fn().mockResolvedValue(1) },
  aIModel: { count: jest.fn().mockResolvedValue(1) },
  dataAsset: { count: jest.fn().mockResolvedValue(1) },
};
const mockBlob = { put: jest.fn(), get: jest.fn(), del: jest.fn() };

jest.mock("@prisma/client", () => require("./prisma-client-stub"));
jest.mock("@/lib/prisma", () => ({ prisma: mockPrisma, withRetry: (fn: () => unknown) => fn() }));
jest.mock("@/lib/audit-logger", () => ({ logAudit: jest.fn().mockResolvedValue(undefined), getClientIp: () => "203.0.113.9" }));
jest.mock("@vercel/blob", () => mockBlob);

import { NextRequest } from "next/server";
import { signJwt } from "@/lib/auth/jwt";
import { sessionFingerprint } from "@/lib/auth/fingerprint";
import { _resetMemoryLimits } from "@/lib/rate-limit";

const PASSWORD = "Correct-Horse-9!";
let passwordHash = "";

beforeAll(async () => {
  passwordHash = await bcrypt.hash(PASSWORD, 4);
});

beforeEach(() => {
  jest.clearAllMocks();
  _resetMemoryLimits();
  mockPrisma.user.update.mockResolvedValue({});
  process.env.PRIVATE_BLOB_READ_WRITE_TOKEN = "test-private-token";
});

function userRecord(email: string) {
  return {
    id: "u-1",
    email,
    name: "Asha",
    passwordHash,
    isActive: true,
    emailVerified: true,
    verificationToken: null,
    memberships: [
      {
        organizationId: "org-a",
        role: "ADMIN",
        organization: { id: "org-a", name: "Acme", slug: "acme", plan: "STARTER", isActive: true },
      },
    ],
  };
}

const login = (email: string, password: string, headers: Record<string, string> = {}) =>
  new NextRequest("http://app.example/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify({ email, password }),
  });

describe("sign-in issues an HttpOnly session cookie", () => {
  it("sets the cookie and never returns the token to page scripts", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(userRecord("asha@acme.test"));
    const { POST } = await import("@/app/api/auth/login/route");
    const res = await POST(login("asha@acme.test", PASSWORD));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.authenticated).toBe(true);
    expect(json.data).not.toHaveProperty("token");
    expect(JSON.stringify(json)).not.toMatch(/eyJ[A-Za-z0-9_-]+\.eyJ/); // no JWT anywhere in the body

    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toMatch(/^auth_token=eyJ/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=lax/i);
    expect(cookie).toMatch(/Path=\//i);
  });

  it("locks an account after 10 failed attempts, even for the right password", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(userRecord("lock@acme.test"));
    const { POST } = await import("@/app/api/auth/login/route");
    for (let i = 0; i < 10; i++) {
      expect((await POST(login("lock@acme.test", "wrong-password"))).status).toBe(401);
    }
    const blocked = await POST(login("lock@acme.test", PASSWORD));
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("retry-after")).toBeTruthy();
  });

  it("limits failed sign-ins per client address (one address trying many accounts)", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    const { POST } = await import("@/app/api/auth/login/route");
    const statuses: number[] = [];
    for (let i = 0; i < 51; i++) statuses.push((await POST(login(`nobody${i}@acme.test`, "x"))).status);
    expect(statuses.slice(0, 50).every((s) => s === 401)).toBe(true);
    expect(statuses[50]).toBe(429);
  });

  it("successful sign-ins from one office address don't use up a limit", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(userRecord("office@acme.test"));
    const { POST } = await import("@/app/api/auth/login/route");
    for (let i = 0; i < 60; i++) {
      expect((await POST(login("office@acme.test", PASSWORD))).status).toBe(200);
    }
  });

  it("parallel guesses can't get past the per-account limit", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(userRecord("race@acme.test"));
    const bcryptCompare = jest.spyOn(bcrypt, "compare");
    const { POST } = await import("@/app/api/auth/login/route");
    const results = await Promise.all(Array.from({ length: 25 }, () => POST(login("race@acme.test", "wrong"))));
    const statuses = results.map((r) => r.status);
    expect(statuses.filter((s) => s === 401).length).toBe(10);
    expect(statuses.filter((s) => s === 429).length).toBe(15);
    expect(bcryptCompare.mock.calls.length).toBeLessThanOrEqual(10);
    bcryptCompare.mockRestore();
  });

  it("a password reset lifts the lockout", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(userRecord("reset@acme.test"));
    const login$ = (await import("@/app/api/auth/login/route")).POST;
    for (let i = 0; i < 10; i++) await login$(login("reset@acme.test", "wrong"));
    expect((await login$(login("reset@acme.test", PASSWORD))).status).toBe(429);

    mockPrisma.passwordResetToken.findUnique.mockResolvedValue({
      id: "t-1", userId: "u-1", usedAt: null, expiresAt: new Date(Date.now() + 60_000),
      user: { id: "u-1", email: "reset@acme.test" },
    });
    const reset$ = (await import("@/app/api/auth/reset-password/route")).POST;
    const reset = await reset$(
      new NextRequest("http://app.example/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: "a".repeat(64), password: "New-Passw0rd!xyz" }),
      })
    );
    expect(reset.status).toBe(200);
    expect((await login$(login("reset@acme.test", PASSWORD))).status).toBe(200);
  });

  it("sign-out clears the cookie", async () => {
    const { POST } = await import("@/app/api/auth/logout/route");
    const res = await POST(new NextRequest("http://app.example/api/auth/logout", { method: "POST" }));
    expect(res.headers.get("set-cookie")).toMatch(/auth_token=;.*Max-Age=0/i);
  });
});

describe("other sites can't sign a visitor in or out (login CSRF)", () => {
  it("refuses a cross-site sign-in and sets no cookie", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(userRecord("csrf@acme.test"));
    const { POST } = await import("@/app/api/auth/login/route");
    const res = await POST(login("csrf@acme.test", PASSWORD, { "sec-fetch-site": "cross-site", origin: "https://evil.example" }));
    expect(res.status).toBe(403);
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("refuses a sign-in posted as a plain form body", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(userRecord("form@acme.test"));
    const { POST } = await import("@/app/api/auth/login/route");
    const res = await POST(
      new NextRequest("http://app.example/api/auth/login", {
        method: "POST",
        headers: { "content-type": "text/plain" },
        body: JSON.stringify({ email: "form@acme.test", password: PASSWORD }),
      })
    );
    expect(res.status).toBe(415);
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("refuses an email-verification link followed from another site", async () => {
    const { GET } = await import("@/app/api/auth/verify-email/route");
    const res = await GET(
      new NextRequest("http://app.example/api/auth/verify-email?token=abc", {
        headers: { "sec-fetch-site": "cross-site", "sec-fetch-mode": "navigate" },
      })
    );
    expect(res.status).toBe(403);
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("refuses a cross-site sign-out", async () => {
    const { POST } = await import("@/app/api/auth/logout/route");
    const res = await POST(
      new NextRequest("http://app.example/api/auth/logout", { method: "POST", headers: { origin: "https://evil.example", host: "app.example" } })
    );
    expect(res.status).toBe(403);
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("refuses cross-site sign-up and invite acceptance", async () => {
    const { POST } = await import("@/app/api/auth/register/route");
    const res = await POST(
      new NextRequest("http://app.example/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json", "sec-fetch-site": "cross-site" },
        body: JSON.stringify({ inviteToken: "11111111-1111-4111-8111-111111111111", name: "X", password: "y" }),
      })
    );
    expect(res.status).toBe(403);
  });
});

// ─── Evidence files ─────────────────────────────────────────────────────────
async function sessionCookie(organizationId: string) {
  mockPrisma.organizationMember.findFirst.mockResolvedValue({
    role: "RISK_OFFICER",
    organization: { plan: "STARTER" },
    user: { passwordHash: "h" },
  });
  const token = await signJwt({
    userId: "u-1", email: "a@x", name: "A", organizationId, orgRole: "RISK_OFFICER", plan: "STARTER",
    sv: sessionFingerprint("h"),
  });
  return `auth_token=${token}`;
}

const PRIVATE_URL = "https://store.private.blob.vercel-storage.com/evidence/org-a/kyc-sample-AbC123.pdf";

describe("evidence files are private", () => {
  beforeEach(() => {
    // Only org-a's file exists, and only when the query is scoped to org-a.
    mockPrisma.evidenceFile.findFirst.mockImplementation(async ({ where }: any) =>
      where.id === "ev-a" && JSON.stringify(where).includes('"organizationId":"org-a"')
        ? { url: PRIVATE_URL, name: "kyc-sample.pdf", mimeType: "application/pdf" }
        : null
    );
  });

  it("uploads go to private storage and the storage URL is not returned", async () => {
    mockBlob.put.mockResolvedValue({ url: PRIVATE_URL });
    mockPrisma.evidenceFile.create.mockImplementation(async ({ data }: any) => ({ id: "ev-a", ...data }));
    const form = new FormData();
    form.append("file", new File(["%PDF-1.4"], "kyc-sample.pdf", { type: "application/pdf" }));
    form.append("modelId", "m-1");
    const { POST } = await import("@/app/api/upload/route");
    const res = await POST(
      new NextRequest("http://app.example/api/upload", {
        method: "POST",
        headers: { cookie: await sessionCookie("org-a"), "sec-fetch-site": "same-origin" },
        body: form,
      }),
      { params: {} }
    );
    expect(res.status).toBe(200);
    expect(mockBlob.put).toHaveBeenCalledWith(
      expect.stringMatching(/^evidence\/org-a\//),
      expect.anything(),
      expect.objectContaining({ access: "private", token: "test-private-token", addRandomSuffix: true })
    );
    const json = await res.json();
    expect(json.data.downloadUrl).toBe("/api/upload/ev-a");
    expect(json.data).not.toHaveProperty("url");
    expect(JSON.stringify(json)).not.toContain("blob.vercel-storage.com");
  });

  it("uploads are refused (503) until private storage is configured", async () => {
    delete process.env.PRIVATE_BLOB_READ_WRITE_TOKEN;
    const form = new FormData();
    form.append("file", new File(["x"], "a.pdf", { type: "application/pdf" }));
    form.append("modelId", "m-1");
    const { POST } = await import("@/app/api/upload/route");
    const res = await POST(
      new NextRequest("http://app.example/api/upload", {
        method: "POST",
        headers: { cookie: await sessionCookie("org-a"), "sec-fetch-site": "same-origin" },
        body: form,
      }),
      { params: {} }
    );
    expect(res.status).toBe(503);
    expect(mockBlob.put).not.toHaveBeenCalled();
  });

  it("members of the owning organization can download through the checked route", async () => {
    mockBlob.get.mockResolvedValue({
      statusCode: 200,
      stream: new Blob(["%PDF-1.4"]).stream(),
      blob: { contentType: "application/pdf" },
    });
    const { GET } = await import("@/app/api/upload/[id]/route");
    const res = await GET(
      new NextRequest("http://app.example/api/upload/ev-a", { headers: { cookie: await sessionCookie("org-a") } }),
      { params: { id: "ev-a" } }
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-disposition")).toMatch(/^attachment;/);
    expect(res.headers.get("cache-control")).toMatch(/no-store/);
    expect(mockBlob.get).toHaveBeenCalledWith(PRIVATE_URL, expect.objectContaining({ access: "private", token: "test-private-token" }));
    expect(await res.text()).toBe("%PDF-1.4");
  });

  it("another organization gets a 404 and nothing is read from storage", async () => {
    const { GET } = await import("@/app/api/upload/[id]/route");
    const res = await GET(
      new NextRequest("http://app.example/api/upload/ev-a", { headers: { cookie: await sessionCookie("org-b") } }),
      { params: { id: "ev-a" } }
    );
    expect(res.status).toBe(404);
    expect(mockBlob.get).not.toHaveBeenCalled();
  });

  it("listing returns download routes, never storage URLs", async () => {
    mockPrisma.evidenceFile.findMany.mockResolvedValue([{ id: "ev-a", name: "kyc-sample.pdf", url: PRIVATE_URL }]);
    const { GET } = await import("@/app/api/upload/route");
    const res = await GET(
      new NextRequest("http://app.example/api/upload?modelId=m-1", { headers: { cookie: await sessionCookie("org-a") } }),
      { params: {} }
    );
    const json = await res.json();
    expect(json.data.files[0]).toEqual(expect.objectContaining({ id: "ev-a", downloadUrl: "/api/upload/ev-a" }));
    expect(JSON.stringify(json)).not.toContain("blob.vercel-storage.com");
  });
});
