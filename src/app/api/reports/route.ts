import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, created, badRequest, serverError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const CreateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  type: z.enum(["EXECUTIVE_SUMMARY","RISK_ASSESSMENT","COMPLIANCE_STATUS","AI_INVENTORY","ISO42005_ASSESSMENT"]),
  filters: z.record(z.unknown()).optional(),
  sections: z.array(z.string()).optional(),
});

export const GET = withAuth(async () => {
  try {
    const reports = await prisma.report.findMany({
      include: {
        creator: { select: { id: true, name: true } },
        schedules: { select: { id: true, isActive: true, frequency: true, recipients: true, nextRunAt: true } },
      },
      orderBy: { createdAt: "desc" },
    }).catch(() => []);
    return ok(reports);
  } catch (err) { return serverError(err); }
});

export const POST = withAuth(async (req: NextRequest, { user }) => {
  try {
    const body = await req.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());
    const report = await prisma.report.create({
      data: { ...parsed.data, filters: parsed.data.filters ?? {}, sections: parsed.data.sections ?? [], createdBy: user.userId },
      include: { creator: { select: { id: true, name: true } }, schedules: true },
    });
    return created(report);
  } catch (err) { return serverError(err); }
}, "RISK_OFFICER");
