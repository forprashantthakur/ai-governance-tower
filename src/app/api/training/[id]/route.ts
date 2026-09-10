import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, badRequest, notFound, noContent, serverError } from "@/lib/api-response";
import { logAudit, getClientIp } from "@/lib/audit-logger";

export const dynamic = "force-dynamic";

const AUDIENCES = ["BOARD", "EXECUTIVE", "RISK_COMPLIANCE", "TECHNOLOGY", "DATA_SCIENCE", "BUSINESS_UNIT", "ALL_STAFF"] as const;
const STATUSES = ["PLANNED", "SCHEDULED", "IN_PROGRESS", "COMPLETED"] as const;

const UpdateSchema = z.object({
  code: z.string().min(1).max(50).optional(),
  title: z.string().min(1).max(300).optional(),
  description: z.string().max(4000).nullable().optional(),
  audience: z.enum(AUDIENCES).optional(),
  status: z.enum(STATUSES).optional(),
  deliveryMode: z.string().min(1).max(50).optional(),
  durationHours: z.coerce.number().min(0).max(500).optional(),
  scheduledDate: z.coerce.date().nullable().optional(),
  completedDate: z.coerce.date().nullable().optional(),
  targetAttendees: z.coerce.number().int().min(0).optional(),
  actualAttendees: z.coerce.number().int().min(0).optional(),
  facilitator: z.string().max(200).nullable().optional(),
  materialsUrl: z.string().max(500).nullable().optional(),
  frameworkRefs: z.array(z.string()).optional(),
});

// PATCH /api/training/:id
export const PATCH = withAuth(async (req: NextRequest, { params, user, organizationId }) => {
  try {
    const existing = await prisma.trainingProgram.findFirst({
      where: { id: params.id, organizationId },
    });
    if (!existing) return notFound("TrainingProgram");

    const parsed = UpdateSchema.safeParse(await req.json());
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());
    const data = parsed.data;

    // Marking a programme COMPLETED without an explicit date stamps it today
    const completionFields: { completedDate?: Date } = {};
    if (data.status === "COMPLETED" && existing.status !== "COMPLETED" && data.completedDate === undefined) {
      completionFields.completedDate = new Date();
    }

    const updated = await prisma.trainingProgram.update({
      where: { id: params.id },
      data: { ...data, ...completionFields },
    });

    await logAudit({
      userId: user.userId,
      organizationId,
      action: "UPDATE",
      resource: "TrainingProgram",
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

// DELETE /api/training/:id
export const DELETE = withAuth(async (req: NextRequest, { params, user, organizationId }) => {
  try {
    const existing = await prisma.trainingProgram.findFirst({
      where: { id: params.id, organizationId },
    });
    if (!existing) return notFound("TrainingProgram");

    await prisma.trainingProgram.delete({ where: { id: params.id } });

    await logAudit({
      userId: user.userId,
      organizationId,
      action: "DELETE",
      resource: "TrainingProgram",
      resourceId: params.id,
      before: existing,
      ipAddress: getClientIp(req),
    });

    return noContent();
  } catch (err) {
    return serverError(err);
  }
}, "ADMIN");
