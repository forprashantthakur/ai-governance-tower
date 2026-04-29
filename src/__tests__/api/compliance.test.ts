/**
 * Integration tests — POST /api/compliance
 * Tests the upsert route with mocked Prisma and real JWT auth.
 */

jest.mock("@/lib/prisma", () => require("@/__mocks__/prisma"));
jest.mock("@/lib/audit-logger", () => ({
  logAudit: jest.fn().mockResolvedValue(undefined),
  getClientIp: jest.fn().mockReturnValue("127.0.0.1"),
}));

import { NextRequest } from "next/server";
import { POST, GET } from "@/app/api/compliance/route";
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

function makePostRequest(body: unknown, authHeader: string): NextRequest {
  return new NextRequest("http://localhost/api/compliance", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      authorization: authHeader,
    },
    body: JSON.stringify(body),
  });
}

function makeGetRequest(params: Record<string, string>, authHeader: string): NextRequest {
  const url = new URL("http://localhost/api/compliance");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString(), {
    method: "GET",
    headers: { authorization: authHeader },
  });
}

const VALID_BODY = {
  modelId: "m-credit-abc12345",
  framework: "ISO42001",
  controlId: "ISO42001-6.1",
  controlName: "AI Incident Response Plan",
  status: "FAIL",
  notes: "No playbook defined",
};

const mockModel = { id: "m-credit-abc12345", name: "Credit Risk Scorer", organizationId: "org-1" };
const mockControl = { id: "ctrl-1", ...VALID_BODY, reviewedBy: "user-1", reviewedAt: new Date() };

afterEach(() => jest.clearAllMocks());

// ─── POST /api/compliance ─────────────────────────────────────────────────
describe("POST /api/compliance", () => {
  describe("authentication & authorisation", () => {
    it("returns 401 with no token", async () => {
      const req = makePostRequest(VALID_BODY, "");
      const res = await POST(req, { params: {} });
      expect(res.status).toBe(401);
    });

    it("returns 403 for VIEWER role (< RISK_OFFICER)", async () => {
      const token = await makeToken("VIEWER");
      (prisma.aIModel.findFirst as jest.Mock).mockResolvedValue(mockModel);
      (prisma.complianceControl.upsert as jest.Mock).mockResolvedValue(mockControl);
      const req = makePostRequest(VALID_BODY, `Bearer ${token}`);
      const res = await POST(req, { params: {} });
      expect(res.status).toBe(403);
    });

    it("returns 403 for AUDITOR role (read-only)", async () => {
      const token = await makeToken("AUDITOR");
      const req = makePostRequest(VALID_BODY, `Bearer ${token}`);
      const res = await POST(req, { params: {} });
      expect(res.status).toBe(403);
    });

    it("accepts RISK_OFFICER role", async () => {
      const token = await makeToken("RISK_OFFICER");
      (prisma.aIModel.findFirst as jest.Mock).mockResolvedValue(mockModel);
      (prisma.complianceControl.upsert as jest.Mock).mockResolvedValue(mockControl);
      const req = makePostRequest(VALID_BODY, `Bearer ${token}`);
      const res = await POST(req, { params: {} });
      expect(res.status).toBe(201);
    });

    it("accepts OWNER role (highest privilege)", async () => {
      const token = await makeToken("OWNER");
      (prisma.aIModel.findFirst as jest.Mock).mockResolvedValue(mockModel);
      (prisma.complianceControl.upsert as jest.Mock).mockResolvedValue(mockControl);
      const req = makePostRequest(VALID_BODY, `Bearer ${token}`);
      const res = await POST(req, { params: {} });
      expect(res.status).toBe(201);
    });
  });

  describe("input validation", () => {
    beforeEach(async () => {
      // Give valid auth for all validation tests
      const token = await makeToken("RISK_OFFICER");
      // Store token globally — not great but sufficient for this test
      (global as any).__token = token;
    });

    async function postWith(body: unknown) {
      const token = (global as any).__token;
      const req = makePostRequest(body, `Bearer ${token}`);
      return POST(req, { params: {} });
    }

    it("returns 400 when modelId is missing", async () => {
      const { modelId: _, ...body } = VALID_BODY;
      const res = await postWith(body);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/modelId/i);
    });

    it("returns 400 when modelId is empty string", async () => {
      const res = await postWith({ ...VALID_BODY, modelId: "" });
      expect(res.status).toBe(400);
    });

    it("returns 400 when framework is missing", async () => {
      const { framework: _, ...body } = VALID_BODY;
      const res = await postWith(body);
      expect(res.status).toBe(400);
    });

    it("returns 400 when framework exceeds 50 chars", async () => {
      const res = await postWith({ ...VALID_BODY, framework: "x".repeat(51) });
      expect(res.status).toBe(400);
    });

    it("returns 400 when controlId is missing", async () => {
      const { controlId: _, ...body } = VALID_BODY;
      const res = await postWith(body);
      expect(res.status).toBe(400);
    });

    it("returns 400 when controlName is missing", async () => {
      const { controlName: _, ...body } = VALID_BODY;
      const res = await postWith(body);
      expect(res.status).toBe(400);
    });

    it("returns 400 for invalid status value", async () => {
      const res = await postWith({ ...VALID_BODY, status: "INVALID_STATUS" });
      expect(res.status).toBe(400);
    });

    it("accepts all valid status values", async () => {
      const statuses = ["PASS", "FAIL", "PARTIAL", "NOT_APPLICABLE", "PENDING_REVIEW"] as const;
      (prisma.aIModel.findFirst as jest.Mock).mockResolvedValue(mockModel);
      (prisma.complianceControl.upsert as jest.Mock).mockResolvedValue(mockControl);

      for (const status of statuses) {
        const res = await postWith({ ...VALID_BODY, status });
        expect(res.status).toBe(201);
      }
    });

    it("accepts DPDP, ISO42001, EU_AI_ACT, RBI as framework values", async () => {
      const frameworks = ["DPDP", "ISO42001", "EU_AI_ACT", "RBI"];
      (prisma.aIModel.findFirst as jest.Mock).mockResolvedValue(mockModel);
      (prisma.complianceControl.upsert as jest.Mock).mockResolvedValue(mockControl);

      for (const framework of frameworks) {
        const res = await postWith({ ...VALID_BODY, framework });
        expect(res.status).toBe(201);
      }
    });

    it("accepts non-UUID modelId (seed data format)", async () => {
      (prisma.aIModel.findFirst as jest.Mock).mockResolvedValue(mockModel);
      (prisma.complianceControl.upsert as jest.Mock).mockResolvedValue(mockControl);
      const res = await postWith({ ...VALID_BODY, modelId: "m-credit-abc12345" });
      expect(res.status).toBe(201);
    });

    it("returns 400 when model is not found in this org", async () => {
      (prisma.aIModel.findFirst as jest.Mock).mockResolvedValue(null); // not found
      const res = await postWith(VALID_BODY);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/model not found/i);
    });

    it("returns 400 for empty request body", async () => {
      const token = (global as any).__token;
      const req = new NextRequest("http://localhost/api/compliance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: "{}",
      });
      const res = await POST(req, { params: {} });
      expect(res.status).toBe(400);
    });

    it("returns 400 for non-JSON body (parse error → server error)", async () => {
      const token = (global as any).__token;
      const req = new NextRequest("http://localhost/api/compliance", {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
        body: "not json",
      });
      // Should not return 200 — either 400 or 500
      const res = await POST(req, { params: {} });
      expect([400, 500]).toContain(res.status);
    });
  });

  describe("successful upsert", () => {
    it("returns 201 with control data on create", async () => {
      const token = await makeToken();
      (prisma.aIModel.findFirst as jest.Mock).mockResolvedValue(mockModel);
      (prisma.complianceControl.upsert as jest.Mock).mockResolvedValue(mockControl);

      const req = makePostRequest(VALID_BODY, `Bearer ${token}`);
      const res = await POST(req, { params: {} });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.controlId).toBe("ISO42001-6.1");
    });

    it("calls upsert with correct unique key", async () => {
      const token = await makeToken();
      (prisma.aIModel.findFirst as jest.Mock).mockResolvedValue(mockModel);
      (prisma.complianceControl.upsert as jest.Mock).mockResolvedValue(mockControl);

      const req = makePostRequest(VALID_BODY, `Bearer ${token}`);
      await POST(req, { params: {} });

      const upsertCall = (prisma.complianceControl.upsert as jest.Mock).mock.calls[0][0];
      expect(upsertCall.where).toEqual({
        modelId_framework_controlId: {
          modelId: "m-credit-abc12345",
          framework: "ISO42001",
          controlId: "ISO42001-6.1",
        },
      });
    });

    it("sets reviewedBy to authenticated user id", async () => {
      const token = await makeToken();
      (prisma.aIModel.findFirst as jest.Mock).mockResolvedValue(mockModel);
      (prisma.complianceControl.upsert as jest.Mock).mockResolvedValue(mockControl);

      const req = makePostRequest(VALID_BODY, `Bearer ${token}`);
      await POST(req, { params: {} });

      const upsertCall = (prisma.complianceControl.upsert as jest.Mock).mock.calls[0][0];
      expect(upsertCall.create.reviewedBy).toBe("user-1");
    });
  });

  describe("database errors", () => {
    it("returns 500 when prisma.upsert throws", async () => {
      const token = await makeToken();
      (prisma.aIModel.findFirst as jest.Mock).mockResolvedValue(mockModel);
      (prisma.complianceControl.upsert as jest.Mock).mockRejectedValue(new Error("DB error"));

      const req = makePostRequest(VALID_BODY, `Bearer ${token}`);
      const res = await POST(req, { params: {} });
      expect(res.status).toBe(500);
    });
  });
});

// ─── GET /api/compliance ──────────────────────────────────────────────────
describe("GET /api/compliance", () => {
  const mockControls = [
    {
      id: "c1",
      modelId: "m1",
      framework: "ISO42001",
      controlId: "ISO42001-6.1",
      status: "FAIL",
      model: { id: "m1", name: "Model A", type: "ML" },
    },
    {
      id: "c2",
      modelId: "m1",
      framework: "DPDP",
      controlId: "DPDP-3.1",
      status: "PASS",
      model: { id: "m1", name: "Model A", type: "ML" },
    },
  ];

  it("returns 401 without auth", async () => {
    const req = makeGetRequest({}, "");
    const res = await GET(req, { params: {} });
    expect(res.status).toBe(401);
  });

  it("returns 200 with controls and summary for VIEWER", async () => {
    const token = await makeToken("VIEWER"); // GET is open to all roles
    (prisma.complianceControl.findMany as jest.Mock).mockResolvedValue(mockControls);

    const req = makeGetRequest({}, `Bearer ${token}`);
    const res = await GET(req, { params: {} });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.controls).toHaveLength(2);
    expect(json.data.total).toBe(2);
    expect(json.data.summary).toHaveProperty("FAIL");
    expect(json.data.summary).toHaveProperty("PASS");
  });

  it("filters by modelId query param", async () => {
    const token = await makeToken();
    (prisma.complianceControl.findMany as jest.Mock).mockResolvedValue([mockControls[0]]);

    const req = makeGetRequest({ modelId: "m1" }, `Bearer ${token}`);
    await GET(req, { params: {} });

    const findManyCall = (prisma.complianceControl.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.where).toMatchObject({ modelId: "m1" });
  });

  it("filters by framework query param", async () => {
    const token = await makeToken();
    (prisma.complianceControl.findMany as jest.Mock).mockResolvedValue([mockControls[1]]);

    const req = makeGetRequest({ framework: "DPDP" }, `Bearer ${token}`);
    await GET(req, { params: {} });

    const findManyCall = (prisma.complianceControl.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyCall.where).toMatchObject({ framework: "DPDP" });
  });

  it("returns 500 when database throws", async () => {
    const token = await makeToken();
    (prisma.complianceControl.findMany as jest.Mock).mockRejectedValue(new Error("DB down"));

    const req = makeGetRequest({}, `Bearer ${token}`);
    const res = await GET(req, { params: {} });
    expect(res.status).toBe(500);
  });

  it("summary correctly aggregates status counts", async () => {
    const token = await makeToken();
    const controls = [
      { ...mockControls[0], status: "FAIL" },
      { ...mockControls[0], status: "FAIL" },
      { ...mockControls[1], status: "PASS" },
    ];
    (prisma.complianceControl.findMany as jest.Mock).mockResolvedValue(controls);

    const req = makeGetRequest({}, `Bearer ${token}`);
    const res = await GET(req, { params: {} });
    const json = await res.json();
    expect(json.data.summary.FAIL).toBe(2);
    expect(json.data.summary.PASS).toBe(1);
  });
});
