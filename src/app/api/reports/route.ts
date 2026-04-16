import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, created, badRequest, serverError } from "@/lib/api-response";
import { logAudit, getClientIp } from "@/lib/audit-logger";

export const dynamic = "force-dynamic";

const CreateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  type: z.enum(["EXECUTIVE_SUMMARY","RISK_ASSESSMENT","COMPLIANCE_STATUS","AI_INVENTORY","ISO42005_ASSESSMENT"]),
  filters: z.record(z.unknown()).optional(),
  sections: z.array(z.string()).optional(),
});

export const GET = withAuth(async (_req, { organizationId }) => {
  try {
    const reports = await prisma.report.findMany({
      where: { organizationId },
      include: {
        creator: { select: { id: true, name: true } },
        schedules: { select: { id: true, isActive: true, frequency: true, recipients: true, nextRunAt: true } },
      },
      orderBy: { createdAt: "desc" },
    }).catch(() => []);
    return ok(reports);
  } catch (err) { return serverError(err); }
});

export const POST = withAuth(async (req: NextRequest, { user, organizationId }) => {
  try {
    const body = await req.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());
    const report = await prisma.report.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { ...parsed.data, organizationId, filters: (parsed.data.filters ?? {}) as any, sections: parsed.data.sections ?? [], createdBy: user.userId },
      include: { creator: { select: { id: true, name: true } }, schedules: true },
    });

    await logAudit({
      userId: user.userId,
      organizationId,
      action: "CREATE",
      resource: "Report",
      resourceId: report.id,
      after: { name: report.name, type: report.type },
      ipAddress: getClientIp(req),
    });

    return created(report);
  } catch (err) { return serverError(err); }
}, "RISK_OFFICER");
