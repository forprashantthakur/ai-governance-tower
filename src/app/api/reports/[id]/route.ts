import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, badRequest, notFound, noContent, serverError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const UpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  filters: z.record(z.unknown()).optional(),
  sections: z.array(z.string()).optional(),
});

export const GET = withAuth(async (_req: NextRequest, { params, organizationId }) => {
  try {
    const report = await prisma.report.findFirst({
      where: { id: params.id, organizationId },
      include: { creator: { select: { id: true, name: true } }, schedules: true },
    });
    if (!report) return notFound("Report");
    return ok(report);
  } catch (err) { return serverError(err); }
});

export const PATCH = withAuth(async (req: NextRequest, { params, organizationId }) => {
  try {
    const body = await req.json();
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());
    const existing = await prisma.report.findFirst({ where: { id: params.id, organizationId }, select: { id: true } });
    if (!existing) return notFound("Report");
    const report = await prisma.report.update({
      where: { id: existing.id },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: parsed.data as any,
      include: { creator: { select: { id: true, name: true } }, schedules: true },
    });
    return ok(report);
  } catch (err) { return serverError(err); }
}, "RISK_OFFICER");

export const DELETE = withAuth(async (_req: NextRequest, { params, organizationId }) => {
  try {
    const res = await prisma.report.deleteMany({ where: { id: params.id, organizationId } });
    if (res.count === 0) return notFound("Report");
    return noContent();
  } catch (err) { return serverError(err); }
}, "RISK_OFFICER");
