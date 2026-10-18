import { NextRequest } from "next/server";
import { z } from "zod";
import type { TrainingProgram } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, created, badRequest, serverError } from "@/lib/api-response";
import { logAudit, getClientIp } from "@/lib/audit-logger";

export const dynamic = "force-dynamic";

const AUDIENCES = ["BOARD", "EXECUTIVE", "RISK_COMPLIANCE", "TECHNOLOGY", "DATA_SCIENCE", "BUSINESS_UNIT", "ALL_STAFF"] as const;
const STATUSES = ["PLANNED", "SCHEDULED", "IN_PROGRESS", "COMPLETED"] as const;

const CreateSchema = z.object({
  code: z.string().min(1).max(50),
  title: z.string().min(1).max(300),
  description: z.string().max(4000).optional(),
  audience: z.enum(AUDIENCES).default("ALL_STAFF"),
  status: z.enum(STATUSES).default("PLANNED"),
  deliveryMode: z.string().min(1).max(50).default("INSTRUCTOR_LED"),
  durationHours: z.coerce.number().min(0).max(500).default(1),
  scheduledDate: z.coerce.date().optional(),
  completedDate: z.coerce.date().optional(),
  targetAttendees: z.coerce.number().int().min(0).default(0),
  actualAttendees: z.coerce.number().int().min(0).default(0),
  facilitator: z.string().max(200).optional(),
  materialsUrl: z.string().max(500).optional(),
  frameworkRefs: z.array(z.string()).default([]),
});

function emptyStats() {
  return { total: 0, completed: 0, scheduled: 0, peopleTrained: 0, completionRate: 0 };
}

function computeStats(programs: TrainingProgram[]) {
  const total = programs.length;
  if (total === 0) return emptyStats();
  const completedPrograms = programs.filter((p) => p.status === "COMPLETED");
  const completed = completedPrograms.length;
  const scheduled = programs.filter((p) => p.status === "SCHEDULED").length;
  const peopleTrained = completedPrograms.reduce((sum, p) => sum + p.actualAttendees, 0);
  const targetSum = completedPrograms.reduce((sum, p) => sum + p.targetAttendees, 0);
  const completionRate = targetSum > 0 ? Math.round((peopleTrained / targetSum) * 100) : 0;
  return { total, completed, scheduled, peopleTrained, completionRate };
}

// GET /api/training
export const GET = withAuth(async (req: NextRequest, { organizationId }) => {
  try {
    let programs: TrainingProgram[] = [];
    try {
      programs = await prisma.trainingProgram.findMany({
        where: { organizationId },
        orderBy: [{ scheduledDate: "asc" }, { createdAt: "desc" }],
      });
    } catch {
      // Table may not exist yet on a stale DB — degrade gracefully instead of 500
      return ok({ rows: [], stats: emptyStats() });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") ?? undefined;
    const audience = searchParams.get("audience") ?? undefined;
    const search = searchParams.get("search")?.toLowerCase() ?? undefined;

    const rows = programs.filter((p) => {
      if (status && p.status !== status) return false;
      if (audience && p.audience !== audience) return false;
      if (search) {
        const hay = `${p.code} ${p.title} ${p.description ?? ""} ${p.facilitator ?? ""}`.toLowerCase();
        if (!hay.includes(search)) return false;
      }
      return true;
    });

    return ok({ rows, stats: computeStats(programs) });
  } catch (err) {
    return serverError(err);
  }
});

// POST /api/training
export const POST = withAuth(async (req: NextRequest, { user, organizationId }) => {
  try {
    const parsed = CreateSchema.safeParse(await req.json());
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const existing = await prisma.trainingProgram.findFirst({
      where: { organizationId, code: parsed.data.code },
    });
    if (existing) return badRequest(`Programme code '${parsed.data.code}' already exists`);

    const row = await prisma.trainingProgram.create({
      data: { ...parsed.data, organizationId },
    });

    await logAudit({
      userId: user.userId,
      organizationId,
      action: "CREATE",
      resource: "TrainingProgram",
      resourceId: row.id,
      after: row,
      ipAddress: getClientIp(req),
    });

    return created(row);
  } catch (err) {
    return serverError(err);
  }
}, "RISK_OFFICER");
