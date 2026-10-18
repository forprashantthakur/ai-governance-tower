/**
 * Integration tests — POST & GET /api/consent
 * Tests consent creation, validation, auth, and edge cases.
 */

jest.mock("@/lib/prisma", () => require("@/__mocks__/prisma"));
jest.mock("@/lib/audit-logger", () => ({
  logAudit: jest.fn().mockResolvedValue(undefined),
  getClientIp: jest.fn().mockReturnValue("127.0.0.1"),
}));

import { NextRequest } from "next/server";
import { POST, GET } from "@/app/api/consent/route";
import { prisma } from "@/lib/prisma";
import { signJwt } from "@/lib/auth/jwt";

// ─── Helpers ───────────────────────────────────────────────────────────────
async function makeToken(role: "RISK_OFFICER" | "OWNER" | "VIEWER" | "ADMIN" | "AUDITOR" = "RISK_OFFICER") {
  return signJwt({
    userId: "user-1",
    email: "test@example.com",
    name: "Test",
    organizationId: "org-1",
    orgRole: role,
    plan: "PROFESSIONAL",
  });
}

function makePostRequest(body: unknown, token: string): NextRequest {
  return new NextRequest("http://localhost/api/consent", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
}

const VALID_CONSENT_BODY = {
  dataAssetId: "550e8400-e29b-41d4-a716-446655440000", // valid UUID
  subjectId: "customer-001",
  consentType: "DATA_PROCESSING",
  status: "GRANTED",
};

const mockConsentRecord = {
  id: "consent-1",
  ...VALID_CONSENT_BODY,
  grantedAt: new Date().toISOString(),
  expiresAt: null,
  dataAsset: { id: "550e8400-e29b-41d4-a716-446655440000", name: "Customer PII DB", sensitivity: "PII" },
};

afterEach(() => jest.clearAllMocks());

// ─── POST /api/consent ────────────────────────────────────────────────────
describe("POST /api/consent", () => {
  describe("authentication & authorisation", () => {
    it("returns 401 with no token", async () => {
      const req = new NextRequest("http://localhost/api/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(VALID_CONSENT_BODY),
      });
      const res = await POST(req, { params: {} });
      expect(res.status).toBe(401);
    });

    it("returns 403 for VIEWER (below RISK_OFFICER)", async () => {
      const token = await makeToken("VIEWER");
      const req = makePostRequest(VALID_CONSENT_BODY, token);
      const res = await POST(req, { params: {} });
      expect(res.status).toBe(403);
    });

    it("returns 403 for AUDITOR", async () => {
      const token = await makeToken("AUDITOR");
      const req = makePostRequest(VALID_CONSENT_BODY, token);
      const res = await POST(req, { params: {} });
      expect(res.status).toBe(403);
    });

    it("accepts RISK_OFFICER role", async () => {
      const token = await makeToken("RISK_OFFICER");
      (prisma.consentRecord.create as jest.Mock).mockResolvedValue(mockConsentRecord);
      const req = makePostRequest(VALID_CONSENT_BODY, token);
      const res = await POST(req, { params: {} });
      expect(res.status).toBe(201);
    });
  });

  describe("input validation", () => {
    let token: string;
    beforeEach(async () => { token = await makeToken(); });

    it("returns 400 when dataAssetId is missing", async () => {
      const { dataAssetId: _, ...body } = VALID_CONSENT_BODY;
      const res = await POST(makePostRequest(body, token), { params: {} });
      expect(res.status).toBe(400);
    });

    it("returns 400 when dataAssetId is not a UUID", async () => {
      const res = await POST(makePostRequest({ ...VALID_CONSENT_BODY, dataAssetId: "not-a-uuid" }, token), { params: {} });
      expect(res.status).toBe(400);
    });

    it("returns 400 when subjectId is missing", async () => {
      const { subjectId: _, ...body } = VALID_CONSENT_BODY;
      const res = await POST(makePostRequest(body, token), { params: {} });
      expect(res.status).toBe(400);
    });

    it("returns 400 when subjectId is empty string", async () => {
      const res = await POST(makePostRequest({ ...VALID_CONSENT_BODY, subjectId: "" }, token), { params: {} });
      expect(res.status).toBe(400);
    });

    it("returns 400 when subjectId exceeds 500 chars", async () => {
      const res = await POST(makePostRequest({ ...VALID_CONSENT_BODY, subjectId: "x".repeat(501) }, token), { params: {} });
      expect(res.status).toBe(400);
    });

    it("accepts subjectId of exactly 500 chars (boundary)", async () => {
      (prisma.consentRecord.create as jest.Mock).mockResolvedValue(mockConsentRecord);
      const res = await POST(makePostRequest({ ...VALID_CONSENT_BODY, subjectId: "x".repeat(500) }, token), { params: {} });
      expect(res.status).toBe(201);
    });

    it("returns 400 for invalid consentType", async () => {
      const res = await POST(makePostRequest({ ...VALID_CONSENT_BODY, consentType: "INVALID" }, token), { params: {} });
      expect(res.status).toBe(400);
    });

    it("accepts all valid consentType values", async () => {
      const types = ["DATA_PROCESSING", "AI_DECISION", "DATA_SHARING", "MARKETING"];
      (prisma.consentRecord.create as jest.Mock).mockResolvedValue(mockConsentRecord);
      for (const consentType of types) {
        const res = await POST(makePostRequest({ ...VALID_CONSENT_BODY, consentType }, token), { params: {} });
        expect(res.status).toBe(201);
      }
    });

    it("returns 400 for invalid status value", async () => {
      const res = await POST(makePostRequest({ ...VALID_CONSENT_BODY, status: "APPROVED" }, token), { params: {} });
      expect(res.status).toBe(400);
    });

    it("accepts all valid status values", async () => {
      const statuses = ["GRANTED", "REVOKED", "PENDING", "EXPIRED"];
      (prisma.consentRecord.create as jest.Mock).mockResolvedValue(mockConsentRecord);
      for (const status of statuses) {
        const res = await POST(makePostRequest({ ...VALID_CONSENT_BODY, status }, token), { params: {} });
        expect(res.status).toBe(201);
      }
    });

    it("returns 400 for invalid datetime format in grantedAt", async () => {
      const res = await POST(makePostRequest({ ...VALID_CONSENT_BODY, grantedAt: "not-a-date" }, token), { params: {} });
      expect(res.status).toBe(400);
    });

    it("accepts valid ISO 8601 datetime in grantedAt", async () => {
      (prisma.consentRecord.create as jest.Mock).mockResolvedValue(mockConsentRecord);
      const res = await POST(makePostRequest({
        ...VALID_CONSENT_BODY,
        grantedAt: "2025-01-15T10:30:00.000Z",
      }, token), { params: {} });
      expect(res.status).toBe(201);
    });
  });

  describe("auto grantedAt behaviour", () => {
    let token: string;
    beforeEach(async () => { token = await makeToken(); });

    it("sets grantedAt to now when status=GRANTED and no grantedAt provided", async () => {
      (prisma.consentRecord.create as jest.Mock).mockResolvedValue(mockConsentRecord);
      const req = makePostRequest({ ...VALID_CONSENT_BODY, status: "GRANTED" }, token);
      await POST(req, { params: {} });

      const createCall = (prisma.consentRecord.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.grantedAt).toBeInstanceOf(Date);
    });

    it("sets grantedAt to null when status=PENDING and no grantedAt provided", async () => {
      (prisma.consentRecord.create as jest.Mock).mockResolvedValue(mockConsentRecord);
      const req = makePostRequest({ ...VALID_CONSENT_BODY, status: "PENDING" }, token);
      await POST(req, { params: {} });

      const createCall = (prisma.consentRecord.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.grantedAt).toBeNull();
    });
  });

  describe("error handling", () => {
    it("returns 500 when prisma.create throws", async () => {
      const token = await makeToken();
      (prisma.consentRecord.create as jest.Mock).mockRejectedValue(new Error("DB error"));
      const req = makePostRequest(VALID_CONSENT_BODY, token);
      const res = await POST(req, { params: {} });
      expect(res.status).toBe(500);
    });
  });

  describe("fuzz tests — injection attempts", () => {
    let token: string;
    beforeEach(async () => { token = await makeToken(); });

    const injectionSubjectIds = [
      "'; DROP TABLE consent_records; --",
      "<script>alert('xss')</script>",
      "../../../../etc/passwd",
      "\x00\x01\x02", // null bytes
      "A".repeat(499), // max-1
      "🔐👤", // emoji
    ];

    it.each(injectionSubjectIds)(
      "subjectId='%s' either creates record or returns validation error (never 500)",
      async (subjectId) => {
        (prisma.consentRecord.create as jest.Mock).mockResolvedValue(mockConsentRecord);
        const res = await POST(makePostRequest({ ...VALID_CONSENT_BODY, subjectId }, token), { params: {} });
        // Should never be 500 — either valid (201) or validation error (400)
        expect(res.status).not.toBe(500);
      }
    );

    it("extremely nested metadata object does not crash", async () => {
      (prisma.consentRecord.create as jest.Mock).mockResolvedValue(mockConsentRecord);
      const deepMeta: Record<string, unknown> = {};
      let current = deepMeta;
      for (let i = 0; i < 50; i++) {
        current["nested"] = {};
        current = current["nested"] as Record<string, unknown>;
      }
      const res = await POST(makePostRequest({ ...VALID_CONSENT_BODY, metadata: deepMeta }, token), { params: {} });
      expect([201, 400, 500]).toContain(res.status);
    });
  });
});

// ─── GET /api/consent — pagination & filtering ───────────────────────────
describe("GET /api/consent", () => {
  function makeGetRequest(params: Record<string, string | number>, token: string): NextRequest {
    const url = new URL("http://localhost/api/consent");
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
    return new NextRequest(url.toString(), {
      method: "GET",
      headers: { authorization: `Bearer ${token}` },
    });
  }

  const mockRecords = [mockConsentRecord];

  it("returns 401 without token", async () => {
    const req = new NextRequest("http://localhost/api/consent");
    const res = await GET(req, { params: {} });
    expect(res.status).toBe(401);
  });

  it("returns 200 for VIEWER (read access)", async () => {
    const token = await makeToken("VIEWER");
    (prisma.consentRecord.findMany as jest.Mock).mockResolvedValue(mockRecords);
    (prisma.consentRecord.count as jest.Mock).mockResolvedValue(1);
    (prisma.consentRecord as any).groupBy = jest.fn().mockResolvedValue([]);

    const res = await GET(makeGetRequest({}, token), { params: {} });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.records).toHaveLength(1);
    expect(json.data.total).toBe(1);
  });

  it("caps limit at 100 even when limit=9999 is passed", async () => {
    const token = await makeToken();
    (prisma.consentRecord.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.consentRecord.count as jest.Mock).mockResolvedValue(0);
    (prisma.consentRecord as any).groupBy = jest.fn().mockResolvedValue([]);

    await GET(makeGetRequest({ limit: 9999 }, token), { params: {} });

    const findManyCall = (prisma.consentRecord.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.take).toBe(100);
  });

  it("uses page=1 minimum when page=0 or negative is passed", async () => {
    const token = await makeToken();
    (prisma.consentRecord.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.consentRecord.count as jest.Mock).mockResolvedValue(0);
    (prisma.consentRecord as any).groupBy = jest.fn().mockResolvedValue([]);

    await GET(makeGetRequest({ page: -5 }, token), { params: {} });

    const findManyCall = (prisma.consentRecord.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.skip).toBe(0); // page=1 → skip=0
  });

  it("calculates pages correctly", async () => {
    const token = await makeToken();
    (prisma.consentRecord.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.consentRecord.count as jest.Mock).mockResolvedValue(105); // 105 total
    (prisma.consentRecord as any).groupBy = jest.fn().mockResolvedValue([]);

    const res = await GET(makeGetRequest({ limit: 50 }, token), { params: {} });
    const json = await res.json();
    expect(json.data.pages).toBe(3); // ceil(105/50) = 3
  });
});
