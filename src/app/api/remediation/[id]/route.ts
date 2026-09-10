import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, badRequest, notFound, noContent, serverError } from "@/lib/api-response";
import { logAudit, getClientIp } from "@/lib/audit-logger";

export const dynamic = "force-dynamic";

const PRIORITIES = ["P1", "P2", "P3", "P4"] as const;
const STATUSES = ["NOT_STARTED", "IN_PROGRESS", "BLOCKED", "COMPLETED", "DEFERRED"] as const;
const HORIZONS = ["QUICK_WIN", "SHORT_TERM", "MEDIUM_TERM", "LONG_TERM"] as const;

const UpdateSchema = z.object({
  itemRef: z.string().min(1).max(50).optional(),
  title: z.string().min(1).max(300).optional(),
  description: z.string().max(4000).nullable().optional(),
  priority: z.enum(PRIORITIES).optional(),
  status: z.enum(STATUSES).optional(),
  horizon: z.enum(HORIZONS).optional(),
  workstream: z.string().max(100).nullable().optional(),
  framework: z.string().max(200).nullable().optional(),
  sourceRef: z.string().max(200).nullable().optional(),
  ownerRole: z.string().max(200).nullable().optional(),
  effortDays: z.coerce.number().int().min(0).max(3650).optional(),
  progressPct: z.coerce.number().int().min(0).max(100).optional(),
  startDate: z.coerce.date().nullable().optional(),
  targetDate: z.coerce.date().nullable().optional(),
  completedAt: z.coerce.date().nullable().optional(),
  dependencies: z.array(z.string()).optional(),
});

// PATCH /api/remediation/:id
export const PATCH = withAuth(async (req: NextRequest, { params, user, organizationId }) => {
  try {
    const existing = await prisma.remediationItem.findFirst({
      where: { id: params.id, organizationId },
    });
    if (!existing) return notFound("RemediationItem");

    const parsed = UpdateSchema.safeParse(await req.json());
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());
    const data = parsed.data;

    // Completing an item auto-fills progress + completion timestamp; leaving COMPLETED clears it
    const completionFields: { progressPct?: number; completedAt?: Date | null } = {};
    if (data.status === "COMPLETED" && existing.status !== "COMPLETED") {
      if (data.progressPct === undefined) completionFields.progressPct = 100;
      if (data.completedAt === undefined) completionFields.completedAt = new Date();
    } else if (data.status && data.status !== "COMPLETED" && existing.status === "COMPLETED") {
      if (data.completedAt === undefined) completionFields.completedAt = null;
    }

    const updated = await prisma.remediationItem.update({
      where: { id: params.id },
      data: { ...data, ...completionFields },
    });

    await logAudit({
      userId: user.userId,
      organizationId,
      action: "UPDATE",
      resource: "RemediationItem",
      resourceId: params.id,
      before: existing,
      after: updated,
      ipAddress: getClientIp(req),
    });

    return ok(updated);
  } catch (err) {
    return serverError(err);
  }
}, "RISK_OFFICER");

// DELETE /api/remediation/:id
export const DELETE = withAuth(async (req: NextRequest, { params, user, organizationId }) => {
  try {
    const existing = await prisma.remediationItem.findFirst({
      where: { id: params.id, organizationId },
    });
    if (!existing) return notFound("RemediationItem");

    await prisma.remediationItem.delete({ where: { id: params.id } });

    await logAudit({
      userId: user.userId,
      organizationId,
      action: "DELETE",
      resource: "RemediationItem",
      resourceId: params.id,
      before: existing,
      ipAddress: getClientIp(req),
    });

    return noContent();
  } catch (err) {
    return serverError(err);
  }
}, "ADMIN");
