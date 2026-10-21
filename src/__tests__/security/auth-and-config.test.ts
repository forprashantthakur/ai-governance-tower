/**
 * Security regression tests — removed back doors, invites, demo org,
 * outbound URL checks.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { existsSync } from "fs";
import { join } from "path";
import bcrypt from "bcryptjs";
import { createFakePrisma } from "./fake-prisma";

const fake = createFakePrisma(
  {
    organizationMember: {
      organization: { model: "organization", fk: "organizationId" },
      user: { model: "user", fk: "userId" },
    },
    organization: { members: { model: "organizationMember", fk: "organizationId", many: true } },
    organizationInvite: { organization: { model: "organization", fk: "organizationId" } },
  },
  { organizationMember: { isActive: true, joinedAt: new Date() } }
);

jest.mock("@prisma/client", () => require("./prisma-client-stub"));
jest.mock("@/lib/prisma", () => ({ prisma: fake.prisma, withRetry: (fn: () => unknown) => fn() }));
jest.mock("@/lib/audit-logger", () => ({ logAudit: jest.fn().mockResolvedValue(undefined), getClientIp: () => "127.0.0.1" }));
jest.mock("@/lib/email", () => ({ sendVerificationEmail: jest.fn(), sendPasswordResetEmail: jest.fn() }));

import { NextRequest } from "next/server";
import { signJwt } from "@/lib/auth/jwt";
import { parseOutboundUrl, isBlockedAddress } from "@/lib/outbound-http";
import { isHttpUrl, escapeHtml } from "@/lib/safe-url";

async function headersFor(userId: string, organizationId: string, orgRole: string) {
  const token = await signJwt({ userId, email: `${userId}@test`, name: userId, organizationId, orgRole: orgRole as any, plan: "STARTER" });
  return { authorization: `Bearer ${token}`, "content-type": "application/json" };
}

beforeEach(async () => {
  fake.reset();
  fake.seed("organization", [
    { id: "org-a", name: "A", slug: "a", plan: "STARTER", isActive: true, maxUsers: 50 },
    { id: "org-b", name: "B", slug: "b", plan: "STARTER", isActive: true, maxUsers: 50 },
  ]);
  fake.seed("user", [
    { id: "u-admin-a", email: "admin@a.test", name: "Admin A", isActive: true, passwordHash: "x" },
    { id: "u-owner-b", email: "owner@b.test", name: "Owner B", isActive: true, passwordHash: await bcrypt.hash("Correct-Horse1!", 4) },
  ]);
  fake.seed("organizationMember", [
    { id: "m1", organizationId: "org-a", userId: "u-admin-a", role: "ADMIN", isActive: true },
    { id: "m2", organizationId: "org-b", userId: "u-owner-b", role: "OWNER", isActive: true },
  ]);
});

describe("removed back doors", () => {
  it.each([
    "admin/list-users", "admin/list-models", "admin/seed-demo", "admin/seed-agents", "admin/migrate-to-org",
    "seed", "seed/full", "seed/monitoring",
  ])("/api/%s no longer exists", (route) => {
    expect(existsSync(join(__dirname, "../../app/api", route, "route.ts"))).toBe(false);
  });
});

describe("invites", () => {
  it("an ADMIN can't create an OWNER invite", async () => {
    const { POST } = await import("@/app/api/organizations/[id]/invites/route");
    const res = await POST(
      new NextRequest("http://x/api/organizations/org-a/invites", {
        method: "POST",
        headers: await headersFor("u-admin-a", "org-a", "ADMIN"),
        body: JSON.stringify({ email: "new@a.test", role: "OWNER" }),
      }),
      { params: { id: "org-a" } }
    );
    expect(res.status).toBe(403);
  });

  it("an invite for an existing account can't be accepted without that account's password", async () => {
    fake.seed("organizationInvite", [
      { id: "inv", token: "11111111-1111-4111-8111-111111111111", organizationId: "org-a", email: "owner@b.test", role: "VIEWER", status: "PENDING", expiresAt: new Date(Date.now() + 86_400_000) },
    ]);
    const { POST } = await import("@/app/api/auth/register/route");
    const accept = (password: string) =>
      POST(new NextRequest("http://x/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ inviteToken: "11111111-1111-4111-8111-111111111111", name: "Whoever", password }),
      }));

    const wrong = await accept("Wrong-Pass1!");
    expect(wrong.status).toBe(401);
    expect(fake.tables.organizationMember.filter((m) => m.userId === "u-owner-b")).toHaveLength(1);

    const right = await accept("Correct-Horse1!");
    expect(right.status).toBe(201);
    expect((await right.json()).data.user.id).toBe("u-owner-b");
  });
});

describe("demo organization", () => {
  it("each user gets their own demo organization", async () => {
    const { POST } = await import("@/app/api/demo/seed/route");
    const r1 = await POST(new NextRequest("http://x/api/demo/seed", { method: "POST", headers: await headersFor("u-admin-a", "org-a", "ADMIN") }), { params: {} });
    const r2 = await POST(new NextRequest("http://x/api/demo/seed", { method: "POST", headers: await headersFor("u-owner-b", "org-b", "OWNER") }), { params: {} });
    const org1 = (await r1.json()).data.organizationId;
    const org2 = (await r2.json()).data.organizationId;
    expect(org1).toBeTruthy();
    expect(org1).not.toBe(org2);
    const members = (orgId: string) => fake.tables.organizationMember.filter((m) => m.organizationId === orgId).map((m) => m.userId);
    expect(members(org1)).toEqual(["u-admin-a"]);
    expect(members(org2)).toEqual(["u-owner-b"]);
  }, 20_000);
});

describe("URL safety helpers", () => {
  it("only http(s) links count as safe links", () => {
    expect(isHttpUrl("https://example.com/docs")).toBe(true);
    expect(isHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isHttpUrl("data:text/html,hi")).toBe(false);
  });

  it("escapes HTML special characters", () => {
    expect(escapeHtml(`<b a="1">'x' & y</b>`)).toBe("&lt;b a=&quot;1&quot;&gt;&#39;x&#39; &amp; y&lt;/b&gt;");
  });

  it("webhook targets must be public https URLs", () => {
    expect(() => parseOutboundUrl("http://example.com/hook")).toThrow(/https/);
    expect(() => parseOutboundUrl("https://localhost/hook")).toThrow(/private/);
    expect(() => parseOutboundUrl("https://10.1.2.3/hook")).toThrow(/private/);
    expect(parseOutboundUrl("https://n8n.example.com/webhook/abc").hostname).toBe("n8n.example.com");
  });

  it("recognises reserved address ranges", () => {
    for (const ip of ["127.0.0.1", "10.0.0.8", "172.20.1.1", "192.168.1.1", "169.254.1.1", "100.64.0.1", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1"]) {
      expect(isBlockedAddress(ip)).toBe(true);
    }
    for (const ip of ["93.184.216.34", "2606:4700::1111"]) {
      expect(isBlockedAddress(ip)).toBe(false);
    }
  });
});
