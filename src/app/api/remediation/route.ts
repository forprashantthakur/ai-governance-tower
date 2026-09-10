import { NextRequest } from "next/server";
import { z } from "zod";
import type { RemediationItem } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, created, badRequest, serverError } from "@/lib/api-response";
import { logAudit, getClientIp } from "@/lib/audit-logger";

export const dynamic = "force-dynamic";

const PRIORITIES = ["P1", "P2", "P3", "P4"] as const;
const STATUSES = ["NOT_STARTED", "IN_PROGRESS", "BLOCKED", "COMPLETED", "DEFERRED"] as const;
const HORIZONS = ["QUICK_WIN", "SHORT_TERM", "MEDIUM_TERM", "LONG_TERM"] as const;

const CreateSchema = z.object({
  itemRef: z.string().min(1).max(50),
  title: z.string().min(1).max(300),
  description: z.string().max(4000).optional(),
  priority: z.enum(PRIORITIES).default("P3"),
  status: z.enum(STATUSES).default("NOT_STARTED"),
  horizon: z.enum(HORIZONS).default("SHORT_TERM"),
  workstream: z.string().max(100).optional(),
  framework: z.string().max(200).optional(),
  sourceRef: z.string().max(200).optional(),
  ownerRole: z.string().max(200).optional(),
  effortDays: z.coerce.number().int().min(0).max(3650).default(0),
  progressPct: z.coerce.number().int().min(0).max(100).default(0),
  startDate: z.coerce.date().optional(),
  targetDate: z.coerce.date().optional(),
  dependencies: z.array(z.string()).default([]),
});

function emptyStats() {
  return { total: 0, completed: 0, inProgress: 0, blocked: 0, overallProgress: 0, p1Open: 0 };
}

function computeStats(items: RemediationItem[]) {
  const total = items.length;
  if (total === 0) return emptyStats();
  const completed = items.filter((i) => i.status === "COMPLETED").length;
  const inProgress = items.filter((i) => i.status === "IN_PROGRESS").length;
  const blocked = items.filter((i) => i.status === "BLOCKED").length;
  const overallProgress = Math.round(items.reduce((sum, i) => sum + i.progressPct, 0) / total);
  const p1Open = items.filter((i) => i.priority === "P1" && i.status !== "COMPLETED").length;
  return { total, completed, inProgress, blocked, overallProgress, p1Open };
}

// GET /api/remediation
export const GET = withAuth(async (req: NextRequest, { organizationId }) => {
  try {
    let items: RemediationItem[] = [];
    try {
      items = await prisma.remediationItem.findMany({
        where: { organizationId },
        orderBy: [{ priority: "asc" }, { targetDate: "asc" }],
      });
    } catch {
      // Table may not exist yet on a stale DB — degrade gracefully instead of 500
      return ok({ rows: [], stats: emptyStats() });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") ?? undefined;
    const priority = searchParams.get("priority") ?? undefined;
    const workstream = searchParams.get("workstream") ?? undefined;
    const horizon = searchParams.get("horizon") ?? undefined;
    const search = searchParams.get("search")?.toLowerCase() ?? undefined;

    const rows = items.filter((i) => {
      if (status && i.status !== status) return false;
      if (priority && i.priority !== priority) return false;
      if (workstream && i.workstream !== workstream) return false;
      if (horizon && i.horizon !== horizon) return false;
      if (search) {
        const hay = `${i.itemRef} ${i.title} ${i.description ?? ""}`.toLowerCase();
        if (!hay.includes(search)) return false;
      }
      return true;
    });

    return ok({ rows, stats: computeStats(items) });
  } catch (err) {
    return serverError(err);
  }
});

// POST /api/remediation
export const POST = withAuth(async (req: NextRequest, { user, organizationId }) => {
  try {
    const parsed = CreateSchema.safeParse(await req.json());
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const existing = await prisma.remediationItem.findFirst({
      where: { organizationId, itemRef: parsed.data.itemRef },
    });
    if (existing) return badRequest(`Item reference '${parsed.data.itemRef}' already exists`);

    const row = await prisma.remediationItem.create({
      data: { ...parsed.data, organizationId },
    });

    await logAudit({
      userId: user.userId,
      organizationId,
      action: "CREATE",
      resource: "RemediationItem",
      resourceId: row.id,
      after: row,
      ipAddress: getClientIp(req),
    });

    return created(row);
  } catch (err) {
    return serverError(err);
  }
}, "RISK_OFFICER");
