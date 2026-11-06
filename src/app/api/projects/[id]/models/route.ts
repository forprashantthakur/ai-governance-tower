import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, withRetry } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { findProjectInOrg, findModelInOrg } from "@/lib/tenant";
import { ok, badRequest, serverError, notFound } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (_req: NextRequest, { params, organizationId }) => {
  try {
    if (!(await findProjectInOrg(params!.id, organizationId))) return notFound("Project");
    const links = await withRetry(() =>
      prisma.projectAIModel.findMany({
        where: { projectId: params!.id },
        include: { model: { select: { id: true, name: true, type: true, status: true, version: true } } },
      })
    );
    return ok(links);
  } catch (err) {
    return serverError(err);
  }
});

export const POST = withAuth(async (req: NextRequest, { params, organizationId }) => {
  try {
    if (!(await findProjectInOrg(params!.id, organizationId))) return notFound("Project");
    const body = await req.json();
    const parsed = z.object({ modelId: z.string(), role: z.string().optional(), notes: z.string().optional() }).safeParse(body);
    if (!parsed.success) return badRequest("Validation failed");
    if (!(await findModelInOrg(parsed.data.modelId, organizationId))) return notFound("Model");

    const link = await withRetry(() =>
      prisma.projectAIModel.upsert({
        where: { projectId_modelId: { projectId: params!.id, modelId: parsed.data.modelId } },
        update: { role: parsed.data.role ?? "output", notes: parsed.data.notes },
        create: { projectId: params!.id, modelId: parsed.data.modelId, role: parsed.data.role ?? "output", notes: parsed.data.notes },
      })
    );
    return ok(link, undefined, 201);
  } catch (err) {
    return serverError(err);
  }
}, "RISK_OFFICER");
