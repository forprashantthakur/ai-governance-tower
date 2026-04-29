/**
 * Unit tests — src/lib/audit-logger.ts
 * Tests logAudit() (with mocked Prisma) and getClientIp().
 */

// Mock Prisma BEFORE importing audit-logger
jest.mock("@/lib/prisma", () => require("@/__mocks__/prisma"));

import { logAudit, getClientIp } from "@/lib/audit-logger";
import { prisma } from "@/lib/prisma";

const mockCreate = prisma.auditLog.create as jest.MockedFunction<typeof prisma.auditLog.create>;

afterEach(() => {
  jest.clearAllMocks();
});

// ─── logAudit() ────────────────────────────────────────────────────────────
describe("logAudit()", () => {
  it("calls prisma.auditLog.create with correct fields", async () => {
    mockCreate.mockResolvedValueOnce({} as any);

    await logAudit({
      userId: "user-1",
      organizationId: "org-1",
      action: "CREATE",
      resource: "AIModel",
      resourceId: "model-1",
    });

    expect(mockCreate).toHaveBeenCalledTimes(1);
    const call = mockCreate.mock.calls[0][0];
    expect(call.data.userId).toBe("user-1");
    expect(call.data.organizationId).toBe("org-1");
    expect(call.data.action).toBe("CREATE");
    expect(call.data.resource).toBe("AIModel");
    expect(call.data.resourceId).toBe("model-1");
  });

  it("serialises before/after objects with JSON round-trip", async () => {
    mockCreate.mockResolvedValueOnce({} as any);
    const before = { status: "ACTIVE", score: 88 };
    const after = { status: "ARCHIVED", score: 88 };

    await logAudit({
      action: "UPDATE",
      resource: "AIModel",
      before,
      after,
    });

    const call = mockCreate.mock.calls[0][0];
    expect(call.data.before).toEqual(before);
    expect(call.data.after).toEqual(after);
  });

  it("sets before/after to undefined when not provided", async () => {
    mockCreate.mockResolvedValueOnce({} as any);

    await logAudit({ action: "DELETE", resource: "ConsentRecord" });

    const call = mockCreate.mock.calls[0][0];
    expect(call.data.before).toBeUndefined();
    expect(call.data.after).toBeUndefined();
  });

  it("does NOT throw when prisma.create rejects (silent failure)", async () => {
    mockCreate.mockRejectedValueOnce(new Error("DB connection lost"));

    await expect(
      logAudit({ action: "READ", resource: "Dashboard" })
    ).resolves.toBeUndefined();
  });

  it("logs an error to console when prisma.create rejects", async () => {
    mockCreate.mockRejectedValueOnce(new Error("DB connection lost"));
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    await logAudit({ action: "READ", resource: "Dashboard" });

    expect(consoleSpy).toHaveBeenCalledWith(
      "[AuditLogger] Failed to write audit log:",
      expect.any(Error)
    );
    consoleSpy.mockRestore();
  });

  it("handles circular reference in before/after gracefully", async () => {
    mockCreate.mockResolvedValueOnce({} as any);
    const circ: any = { a: 1 };
    circ.self = circ; // circular ref

    // JSON.parse(JSON.stringify(circ)) will throw — logAudit should not crash
    await expect(
      logAudit({ action: "UPDATE", resource: "AIModel", before: circ })
    ).resolves.toBeUndefined();
  });

  it("works with all optional fields provided", async () => {
    mockCreate.mockResolvedValueOnce({} as any);

    await logAudit({
      userId: "u1",
      organizationId: "o1",
      action: "UPDATE",
      resource: "ComplianceControl",
      resourceId: "cc-1",
      modelId: "model-1",
      before: { status: "PASS" },
      after: { status: "FAIL" },
      ipAddress: "1.2.3.4",
      userAgent: "Mozilla/5.0",
      metadata: { source: "api" },
    });

    expect(mockCreate).toHaveBeenCalledTimes(1);
  });
});

// ─── getClientIp() ─────────────────────────────────────────────────────────
describe("getClientIp()", () => {
  function makeReq(headers: Record<string, string>): Request {
    return new Request("http://localhost/api/test", { headers });
  }

  it("extracts first IP from x-forwarded-for", () => {
    const req = makeReq({ "x-forwarded-for": "203.0.113.1, 10.0.0.1" });
    expect(getClientIp(req)).toBe("203.0.113.1");
  });

  it("returns single x-forwarded-for IP without comma", () => {
    const req = makeReq({ "x-forwarded-for": "203.0.113.42" });
    expect(getClientIp(req)).toBe("203.0.113.42");
  });

  it("falls back to x-real-ip when x-forwarded-for is absent", () => {
    const req = makeReq({ "x-real-ip": "198.51.100.7" });
    expect(getClientIp(req)).toBe("198.51.100.7");
  });

  it("returns 'unknown' when no IP headers are present", () => {
    const req = makeReq({});
    expect(getClientIp(req)).toBe("unknown");
  });

  it("trims whitespace from x-forwarded-for entries", () => {
    const req = makeReq({ "x-forwarded-for": "  203.0.113.5  , 10.0.0.1" });
    expect(getClientIp(req)).toBe("203.0.113.5");
  });

  // Edge: spoofed headers with multiple IPs (still takes first)
  it("takes the leftmost (client) IP from multi-hop x-forwarded-for", () => {
    const req = makeReq({ "x-forwarded-for": "1.2.3.4, 5.6.7.8, 9.10.11.12" });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  // Edge: IPv6
  it("handles IPv6 address", () => {
    const req = makeReq({ "x-forwarded-for": "2001:db8::1" });
    expect(getClientIp(req)).toBe("2001:db8::1");
  });
});
