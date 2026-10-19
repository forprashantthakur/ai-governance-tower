/**
 * Security regression tests — tenant isolation, roles and approval rules.
 *
 * Two organizations (Acme and Globex) share one in-memory database. Every
 * test acts as a member of one org and checks that the other org's records
 * can't be read or changed, and that role and approval rules hold.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFakePrisma } from "./fake-prisma";

const fake = createFakePrisma(
  {
    organizationMember: {
      organization: { model: "organization", fk: "organizationId" },
      user: { model: "user", fk: "userId" },
    },
    user: { memberships: { model: "organizationMember", fk: "userId", many: true } },
    project: {
      tasks: { model: "projectTask", fk: "projectId", many: true },
      owner: { model: "user", fk: "ownerId" },
    },
    projectTask: {
      project: { model: "project", fk: "projectId" },
      assignee: { model: "user", fk: "assigneeId" },
    },
    report: { creator: { model: "user", fk: "createdBy" }, schedules: { model: "reportSchedule", fk: "reportId", many: true } },
    aIModel: { organization: { model: "organization", fk: "organizationId" } },
    approvalWorkflow: {
      model: { model: "aIModel", fk: "modelId" },
      requester: { model: "user", fk: "requestedBy" },
      steps: { model: "approvalStep", fk: "workflowId", many: true },
    },
    approvalStep: { workflow: { model: "approvalWorkflow", fk: "workflowId" }, assignee: { model: "user", fk: "assigneeId" } },
    misuseScenario: { model: { model: "aIModel", fk: "modelId" } },
    dataAsset: {},
    evidenceFile: {
      model: { model: "aIModel", fk: "modelId" },
      dataAsset: { model: "dataAsset", fk: "dataAssetId" },
      control: { model: "complianceControl", fk: "controlId" },
      risk: { model: "riskAssessment", fk: "riskId" },
    },
    complianceControl: { model: { model: "aIModel", fk: "modelId" } },
    riskAssessment: { model: { model: "aIModel", fk: "modelId" } },
    impactAssessment: { model: { model: "aIModel", fk: "modelId" } },
  },
  { organizationMember: { isActive: true, joinedAt: new Date() } }
);

jest.mock("@prisma/client", () => require("./prisma-client-stub"));
jest.mock("@/lib/prisma", () => ({ prisma: fake.prisma, withRetry: (fn: () => unknown) => fn() }));
jest.mock("@/lib/audit-logger", () => ({ logAudit: jest.fn().mockResolvedValue(undefined), getClientIp: () => "127.0.0.1" }));
jest.mock("@/lib/n8n-trigger", () => ({ fireWebhooks: jest.fn().mockResolvedValue(undefined), fireWebhookById: jest.fn() }));
jest.mock("@/lib/project-health", () => ({ recalcProjectHealth: jest.fn().mockResolvedValue(undefined) }));
jest.mock("@vercel/blob", () => ({ put: jest.fn(), del: jest.fn().mockResolvedValue(undefined) }));

import { NextRequest } from "next/server";
import { signJwt } from "@/lib/auth/jwt";

const ACME = "org-acme";
const GLOBEX = "org-globex";

function seed() {
  fake.reset();
  fake.seed("organization", [
    { id: ACME, name: "Acme", slug: "acme", plan: "PROFESSIONAL", isActive: true },
    { id: GLOBEX, name: "Globex", slug: "globex", plan: "PROFESSIONAL", isActive: true },
  ]);
  fake.seed("user", [
    { id: "u-acme-owner", email: "owner@acme.test", name: "Acme Owner", isActive: true },
    { id: "u-acme-ro", email: "ro@acme.test", name: "Acme Risk", isActive: true },
    { id: "u-acme-ro2", email: "ro2@acme.test", name: "Acme Risk 2", isActive: true },
    { id: "u-acme-viewer", email: "viewer@acme.test", name: "Acme Viewer", isActive: true },
    { id: "u-globex-owner", email: "owner@globex.test", name: "Globex Owner", isActive: true },
  ]);
  fake.seed("organizationMember", [
    { id: "m1", organizationId: ACME, userId: "u-acme-owner", role: "OWNER", isActive: true },
    { id: "m2", organizationId: ACME, userId: "u-acme-ro", role: "RISK_OFFICER", isActive: true },
    { id: "m3", organizationId: ACME, userId: "u-acme-ro2", role: "RISK_OFFICER", isActive: true },
    { id: "m4", organizationId: ACME, userId: "u-acme-viewer", role: "VIEWER", isActive: true },
    { id: "m5", organizationId: GLOBEX, userId: "u-globex-owner", role: "OWNER", isActive: true },
  ]);
  fake.seed("project", [
    { id: "p-acme", organizationId: ACME, name: "Acme project", status: "ACTIVE", currentPhase: "BUSINESS_CASE" },
    { id: "p-globex", organizationId: GLOBEX, name: "Globex secret project", status: "ACTIVE", currentPhase: "BUSINESS_CASE" },
  ]);
  fake.seed("projectTask", [
    { id: "t-acme", projectId: "p-acme", title: "Acme task", status: "TODO", phase: "BUSINESS_CASE" },
    { id: "t-globex", projectId: "p-globex", title: "Globex task", status: "TODO", phase: "BUSINESS_CASE" },
  ]);
  fake.seed("aIModel", [
    { id: "mdl-acme", organizationId: ACME, name: "Acme scorer", type: "ML", status: "ACTIVE" },
    { id: "mdl-globex", organizationId: GLOBEX, name: "Globex underwriting model", type: "ML", status: "ACTIVE" },
  ]);
  fake.seed("report", [
    { id: "r-acme", organizationId: ACME, name: "Acme inventory", type: "AI_INVENTORY", filters: {}, createdBy: "u-acme-owner" },
    { id: "r-globex", organizationId: GLOBEX, name: "Globex inventory", type: "AI_INVENTORY", filters: {}, createdBy: "u-globex-owner" },
  ]);
  fake.seed("dataAsset", [
    { id: "da-acme", organizationId: ACME, name: "Acme CRM" },
    { id: "da-globex", organizationId: GLOBEX, name: "Globex KYC store" },
  ]);
  fake.seed("misuseScenario", [
    { id: "ms-acme", modelId: "mdl-acme", title: "Acme scenario", severity: 3, likelihood: 3 },
    { id: "ms-globex", modelId: "mdl-globex", title: "Globex scenario", severity: 5, likelihood: 5 },
  ]);
  fake.seed("evidenceFile", [
    { id: "ev-globex", modelId: "mdl-globex", name: "globex.pdf", url: "https://blob.example/globex.pdf" },
  ]);
  fake.seed("approvalWorkflow", [
    // Model-less workflows created before organizationId was stored.
    { id: "wf-globex-legacy", organizationId: null, modelId: null, title: "Globex legacy", status: "PENDING", requestedBy: "u-globex-owner" },
    { id: "wf-acme", organizationId: ACME, modelId: "mdl-acme", title: "Acme release", status: "PENDING", requestedBy: "u-acme-ro" },
  ]);
  fake.seed("approvalStep", [
    { id: "s-globex-1", workflowId: "wf-globex-legacy", stepOrder: 1, status: "PENDING", stepType: "LEGAL", label: "Legal" },
    { id: "s-acme-1", workflowId: "wf-acme", stepOrder: 1, status: "PENDING", stepType: "LEGAL", label: "Legal" },
    { id: "s-acme-2", workflowId: "wf-acme", stepOrder: 2, status: "PENDING", stepType: "EXECUTIVE", label: "Exec" },
  ]);
}

async function as(userId: string, organizationId: string, orgRole: string) {
  const token = await signJwt({ userId, email: `${userId}@test`, name: userId, organizationId, orgRole: orgRole as any, plan: "PROFESSIONAL" });
  return { authorization: `Bearer ${token}`, "content-type": "application/json" };
}
const req = (url: string, init: { method?: string; headers: Record<string, string>; body?: unknown }) =>
  new NextRequest(`http://localhost${url}`, {
    method: init.method ?? "GET",
    headers: init.headers,
    ...(init.body !== undefined && { body: JSON.stringify(init.body) }),
  });

beforeEach(seed);

describe("projects", () => {
  it("another organization's project is not readable", async () => {
    const { GET } = await import("@/app/api/projects/[id]/route");
    const res = await GET(req("/api/projects/p-globex", { headers: await as("u-acme-owner", ACME, "OWNER") }), { params: { id: "p-globex" } });
    expect(res.status).toBe(404);
  });

  it("your own project is readable", async () => {
    const { GET } = await import("@/app/api/projects/[id]/route");
    const res = await GET(req("/api/projects/p-acme", { headers: await as("u-acme-viewer", ACME, "VIEWER") }), { params: { id: "p-acme" } });
    expect(res.status).toBe(200);
  });

  it("another organization's task can't be changed, even via your own project id", async () => {
    const { PATCH } = await import("@/app/api/projects/[id]/tasks/[taskId]/route");
    const headers = await as("u-acme-owner", ACME, "OWNER");
    for (const projectId of ["p-globex", "p-acme"]) {
      const res = await PATCH(
        req(`/api/projects/${projectId}/tasks/t-globex`, { method: "PATCH", headers, body: { title: "pwned" } }),
        { params: { id: projectId, taskId: "t-globex" } }
      );
      expect(res.status).toBe(404);
    }
    expect(fake.tables.projectTask.find((t) => t.id === "t-globex")!.title).toBe("Globex task");
  });

  it("a VIEWER can't change tasks", async () => {
    const { PATCH } = await import("@/app/api/projects/[id]/tasks/[taskId]/route");
    const res = await PATCH(
      req("/api/projects/p-acme/tasks/t-acme", { method: "PATCH", headers: await as("u-acme-viewer", ACME, "VIEWER"), body: { title: "x" } }),
      { params: { id: "p-acme", taskId: "t-acme" } }
    );
    expect(res.status).toBe(403);
  });

  it("a VIEWER can't cancel a project through PATCH", async () => {
    const { PATCH } = await import("@/app/api/projects/[id]/route");
    const res = await PATCH(
      req("/api/projects/p-acme", { method: "PATCH", headers: await as("u-acme-viewer", ACME, "VIEWER"), body: { status: "CANCELLED" } }),
      { params: { id: "p-acme" } }
    );
    expect(res.status).toBe(403);
  });

  it("tasks can't be assigned to people outside the organization", async () => {
    const { POST } = await import("@/app/api/projects/[id]/tasks/route");
    const res = await POST(
      req("/api/projects/p-acme/tasks", {
        method: "POST",
        headers: await as("u-acme-ro", ACME, "RISK_OFFICER"),
        body: { phase: "BUSINESS_CASE", title: "x", assigneeId: "u-globex-owner" },
      }),
      { params: { id: "p-acme" } }
    );
    expect(res.status).toBe(400);
  });
});

describe("reports", () => {
  it("another organization's report can't be generated", async () => {
    const { GET } = await import("@/app/api/reports/[id]/generate/route");
    const res = await GET(req("/api/reports/r-globex/generate", { headers: await as("u-acme-owner", ACME, "OWNER") }), { params: { id: "r-globex" } });
    expect(res.status).toBe(404);
  });

  it("a generated report contains only your organization's models", async () => {
    const { GET } = await import("@/app/api/reports/[id]/generate/route");
    const res = await GET(req("/api/reports/r-acme/generate", { headers: await as("u-acme-viewer", ACME, "VIEWER") }), { params: { id: "r-acme" } });
    expect(res.status).toBe(200);
    const names = (await res.json()).data.data.models.map((m: any) => m.name);
    expect(names).toEqual(["Acme scorer"]);
  });
});

describe("approvals", () => {
  it("the list doesn't include other organizations' model-less workflows", async () => {
    const { GET } = await import("@/app/api/approvals/route");
    const res = await GET(req("/api/approvals", { headers: await as("u-acme-owner", ACME, "OWNER") }), { params: {} });
    const ids = (await res.json()).data.map((w: any) => w.id);
    expect(ids).toContain("wf-acme");
    expect(ids).not.toContain("wf-globex-legacy");
  });

  it("legacy model-less workflows reappear for their organization once backfilled", async () => {
    const { GET } = await import("@/app/api/approvals/route");
    const headers = await as("u-globex-owner", GLOBEX, "OWNER");
    const before = (await (await GET(req("/api/approvals", { headers }), { params: {} })).json()).data;
    expect(before).toEqual([]); // hidden, not leaked, until scripts/security-backfill.sql runs
    fake.tables.approvalWorkflow.find((w) => w.id === "wf-globex-legacy")!.organizationId = GLOBEX;
    const after = (await (await GET(req("/api/approvals", { headers }), { params: {} })).json()).data;
    expect(after.map((w: any) => w.id)).toEqual(["wf-globex-legacy"]);
  });

  it("approval steps can only be assigned to people who can decide them", async () => {
    const { POST } = await import("@/app/api/approvals/route");
    const res = await POST(
      req("/api/approvals", {
        method: "POST",
        headers: await as("u-acme-ro", ACME, "RISK_OFFICER"),
        body: { title: "x", steps: [{ stepType: "LEGAL", label: "Legal", assigneeId: "00000000-0000-4000-8000-000000000000" }] },
      }),
      { params: {} }
    );
    expect(res.status).toBe(400);
  });

  it("another organization's step can't be decided", async () => {
    const { PATCH } = await import("@/app/api/approvals/[id]/steps/[stepId]/route");
    const res = await PATCH(
      req("/api/approvals/wf-globex-legacy/steps/s-globex-1", { method: "PATCH", headers: await as("u-acme-owner", ACME, "OWNER"), body: { status: "APPROVED" } }),
      { params: { id: "wf-globex-legacy", stepId: "s-globex-1" } }
    );
    expect(res.status).toBe(404);
    expect(fake.tables.approvalStep.find((s) => s.id === "s-globex-1")!.status).toBe("PENDING");
  });

  it("the requester can't approve their own workflow", async () => {
    const { PATCH } = await import("@/app/api/approvals/[id]/steps/[stepId]/route");
    const res = await PATCH(
      req("/api/approvals/wf-acme/steps/s-acme-1", { method: "PATCH", headers: await as("u-acme-ro", ACME, "RISK_OFFICER"), body: { status: "APPROVED" } }),
      { params: { id: "wf-acme", stepId: "s-acme-1" } }
    );
    expect(res.status).toBe(403);
  });

  it("steps must be decided in order and can't be re-decided", async () => {
    const { PATCH } = await import("@/app/api/approvals/[id]/steps/[stepId]/route");
    const headers = await as("u-acme-ro2", ACME, "RISK_OFFICER");
    const outOfOrder = await PATCH(
      req("/api/approvals/wf-acme/steps/s-acme-2", { method: "PATCH", headers, body: { status: "APPROVED" } }),
      { params: { id: "wf-acme", stepId: "s-acme-2" } }
    );
    expect(outOfOrder.status).toBe(409);

    const reject = await PATCH(
      req("/api/approvals/wf-acme/steps/s-acme-1", { method: "PATCH", headers, body: { status: "REJECTED" } }),
      { params: { id: "wf-acme", stepId: "s-acme-1" } }
    );
    expect(reject.status).toBe(200);
    expect(fake.tables.approvalWorkflow.find((w) => w.id === "wf-acme")!.status).toBe("REJECTED");

    const flip = await PATCH(
      req("/api/approvals/wf-acme/steps/s-acme-1", { method: "PATCH", headers, body: { status: "APPROVED" } }),
      { params: { id: "wf-acme", stepId: "s-acme-1" } }
    );
    expect(flip.status).toBe(409);
  });
});

describe("other modules", () => {
  it("another organization's data asset is not readable", async () => {
    const { GET } = await import("@/app/api/data-assets/[id]/route");
    const res = await GET(req("/api/data-assets/da-globex", { headers: await as("u-acme-owner", ACME, "OWNER") }), { params: { id: "da-globex" } });
    expect(res.status).toBe(404);
  });

  it("misuse scenarios list only your organization's", async () => {
    const { GET } = await import("@/app/api/misuse-scenarios/route");
    const res = await GET(req("/api/misuse-scenarios", { headers: await as("u-acme-owner", ACME, "OWNER") }), { params: {} });
    const titles = (await res.json()).data.map((m: any) => m.title);
    expect(titles).toEqual(["Acme scenario"]);
  });

  it("another organization's evidence file can't be deleted", async () => {
    const { DELETE } = await import("@/app/api/upload/route");
    const res = await DELETE(req("/api/upload?id=ev-globex", { method: "DELETE", headers: await as("u-acme-owner", ACME, "OWNER") }), { params: {} });
    expect(res.status).toBe(404);
    expect(fake.tables.evidenceFile).toHaveLength(1);
  });

  it("a removed member's token stops working immediately", async () => {
    const { GET } = await import("@/app/api/projects/[id]/route");
    const headers = await as("u-acme-viewer", ACME, "VIEWER");
    fake.tables.organizationMember.find((m) => m.id === "m4")!.isActive = false;
    const res = await GET(req("/api/projects/p-acme", { headers }), { params: { id: "p-acme" } });
    expect(res.status).toBe(401);
  });
});
