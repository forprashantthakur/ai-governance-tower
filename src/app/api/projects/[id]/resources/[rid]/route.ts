import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, withRetry } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { findProjectInOrg } from "@/lib/tenant";
import { ok, badRequest, serverError, notFound } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const UpdateResourceSchema = z.object({
  role: z.enum(["LEAD", "CONTRIBUTOR", "REVIEWER", "STAKEHOLDER", "OBSERVER"]).optional(),
  allocationPct: z.number().min(0).max(100).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  hourlyRate: z.number().optional(),
});

export const PATCH = withAuth(async (req: NextRequest, { params, organizationId }) => {
  try {
    if (!(await findProjectInOrg(params!.id, organizationId))) return notFound("Project");
    const body = await req.json();
    const parsed = UpdateResourceSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const data: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.startDate) data.startDate = new Date(parsed.data.startDate);
    if (parsed.data.endDate) data.endDate = new Date(parsed.data.endDate);

    const resource = await withRetry(() =>
      prisma.projectResource.update({
        where: { id: params!.rid, projectId: params!.id },
        data,
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
      })
    );
    return ok(resource);
  } catch (err) {
    return serverError(err);
  }
}, "ADMIN");

export const DELETE = withAuth(async (_req: NextRequest, { params, organizationId }) => {
  try {
    if (!(await findProjectInOrg(params!.id, organizationId))) return notFound("Project");
    await prisma.projectResource.delete({ where: { id: params!.rid, projectId: params!.id } });
    return ok({ deleted: true });
  } catch (err) {
    return serverError(err);
  }
}, "ADMIN");
