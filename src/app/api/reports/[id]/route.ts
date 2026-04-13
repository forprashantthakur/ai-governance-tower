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

export const GET = withAuth(async (_req: NextRequest, { params }) => {
  try {
    const report = await prisma.report.findUnique({
      where: { id: params.id },
      include: { creator: { select: { id: true, name: true } }, schedules: true },
    }).catch(() => null);
    if (!report) return notFound("Report");
    return ok(report);
  } catch (err) { return serverError(err); }
});

export const PATCH = withAuth(async (req: NextRequest, { params }) => {
  try {
    const body = await req.json();
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());
    const report = await prisma.report.update({
      where: { id: params.id },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: parsed.data as any,
      include: { creator: { select: { id: true, name: true } }, schedules: true },
    });
    return ok(report);
  } catch (err) { return serverError(err); }
}, "RISK_OFFICER");

export const DELETE = withAuth(async (_req: NextRequest, { params }) => {
  try {
    await prisma.report.delete({ where: { id: params.id } }).catch(() => {});
    return noContent();
  } catch (err) { return serverError(err); }
}, "RISK_OFFICER");
