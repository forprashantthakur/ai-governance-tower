import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, badRequest, notFound, noContent, serverError } from "@/lib/api-response";
import { logAudit, getClientIp } from "@/lib/audit-logger";
import { deleteCachePattern } from "@/lib/redis";

export const dynamic = 'force-dynamic';

const UpdateModelSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  version: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "DEPRECATED", "UNDER_REVIEW", "SUSPENDED"]).optional(),
  department: z.string().optional(),
  vendor: z.string().optional(),
  framework: z.string().optional(),
  endpoint: z.string().url().optional().or(z.literal("")),
  tags: z.array(z.string()).optional(),
  isPiiProcessing: z.boolean().optional(),
  isFinancial: z.boolean().optional(),
  isCritical: z.boolean().optional(),
  humanOversight: z.boolean().optional(),
  explainability: z.number().min(0).max(100).optional(),
  metadata: z.record(z.unknown()).optional(),
  approverId: z.string().uuid().nullable().optional(),
  requiresReassessment: z.boolean().optional(),
  reassessmentReason: z.string().optional(),
});

// GET /api/models/:id
export const GET = withAuth(async (req, { params }) => {
  try {
    const model = await prisma.aIModel.findUnique({
      where: { id: params.id },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        riskAssessments: { orderBy: { createdAt: "desc" }, take: 5 },
        complianceControls: true,
        dataAssets: { include: { dataAsset: true } },
        agents: { select: { id: true, name: true, status: true } },
        _count: { select: { promptLogs: true, agents: true } },
      },
    });

    if (!model) return notFound("Model");
    return ok(model);
  } catch (err) {
    return serverError(err);
  }
});

// PATCH /api/models/:id
export const PATCH = withAuth(async (req, { params, user }) => {
  try {
    const existing = await prisma.aIModel.findUnique({ where: { id: params.id } });
    if (!existing) return notFound("Model");

    const body = await req.json();
    const parsed = UpdateModelSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const updated = await prisma.aIModel.update({
      where: { id: params.id },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { ...parsed.data, endpoint: parsed.data.endpoint || null } as any,
      include: {
        owner: { select: { id: true, name: true, email: true } },
        approver: { select: { id: true, name: true, email: true } },
      },
    });

    await logAudit({
      userId: user.userId,
      action: "UPDATE",
      resource: "AIModel",
      resourceId: params.id,
      before: existing,
      after: updated,
      ipAddress: getClientIp(req),
    });

    await deleteCachePattern("models:*");
    return ok(updated);
  } catch (err) {
    return serverError(err);
  }
}, "RISK_OFFICER");

// DELETE /api/models/:id
export const DELETE = withAuth(async (req, { params, user }) => {
  try {
    const existing = await prisma.aIModel.findUnique({ where: { id: params.id } });
    if (!existing) return notFound("Model");

    await prisma.aIModel.delete({ where: { id: params.id } });

    await logAudit({
      userId: user.userId,
      action: "DELETE",
      resource: "AIModel",
      resourceId: params.id,
      before: existing,
      ipAddress: getClientIp(req),
    });

    await deleteCachePattern("models:*");
    return noContent();
  } catch (err) {
    return serverError(err);
  }
}, "ADMIN");
