import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, created, badRequest, serverError } from "@/lib/api-response";
import { logAudit, getClientIp } from "@/lib/audit-logger";

const CreateControlSchema = z.object({
  modelId: z.string().uuid(),
  framework: z.enum(["DPDP", "ISO42001", "ISO42005", "GDPR", "SOC2"]),
  controlId: z.string().min(1),
  controlName: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(["PASS", "FAIL", "PARTIAL", "NOT_APPLICABLE", "PENDING_REVIEW"]).default("PENDING_REVIEW"),
  evidence: z.string().optional(),
  notes: z.string().optional(),
});

// GET /api/compliance — list controls, optionally filtered
export const GET = withAuth(async (req) => {
  try {
    const { searchParams } = new URL(req.url);
    const modelId = searchParams.get("modelId");
    const framework = searchParams.get("framework");
    const status = searchParams.get("status");

    const controls = await prisma.complianceControl.findMany({
      where: {
        ...(modelId && { modelId }),
        ...(framework && { framework }),
        ...(status && { status: status as never }),
      },
      include: {
        model: { select: { id: true, name: true, type: true } },
      },
      orderBy: [{ framework: "asc" }, { controlId: "asc" }],
    });

    // Summary stats
    const summary = controls.reduce(
      (acc, ctrl) => {
        acc[ctrl.status] = (acc[ctrl.status] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return ok({ controls, summary, total: controls.length });
  } catch (err) {
    return serverError(err);
  }
});

// POST /api/compliance
export const POST = withAuth(async (req, { user }) => {
  try {
    const body = await req.json();
    const parsed = CreateControlSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const control = await prisma.complianceControl.upsert({
      where: {
        modelId_framework_controlId: {
          modelId: parsed.data.modelId,
          framework: parsed.data.framework,
          controlId: parsed.data.controlId,
        },
      },
      create: {
        ...parsed.data,
        reviewedBy: user.userId,
        reviewedAt: new Date(),
      },
      update: {
        status: parsed.data.status,
        evidence: parsed.data.evidence,
        notes: parsed.data.notes,
        reviewedBy: user.userId,
        reviewedAt: new Date(),
      },
    });

    await logAudit({
      userId: user.userId,
      action: "UPDATE",
      resource: "ComplianceControl",
      resourceId: control.id,
      after: control,
      ipAddress: getClientIp(req),
    });

    return created(control);
  } catch (err) {
    return serverError(err);
  }
}, "RISK_OFFICER");
