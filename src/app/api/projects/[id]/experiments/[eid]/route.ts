import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, withRetry } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { httpUrl } from "@/lib/safe-url";
import { findProjectInOrg } from "@/lib/tenant";
import { ok, badRequest, serverError, notFound } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const UpdateExperimentSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  status: z.string().optional(),
  hyperparams: z.record(z.unknown()).optional(),
  metrics: z.record(z.number()).optional(),
  artifacts: z.array(z.object({ name: z.string(), type: z.string(), url: httpUrl() })).optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  modelRef: z.string().optional(),
});

export const GET = withAuth(async (_req: NextRequest, { params, organizationId }) => {
  try {
    if (!(await findProjectInOrg(params!.id, organizationId))) return notFound("Project");
    const experiment = await withRetry(() =>
      prisma.experiment.findFirst({
        where: { id: params!.eid, projectId: params!.id },
        include: { runs: { orderBy: { runNumber: "asc" } } },
      })
    );
    if (!experiment) return notFound("Experiment");
    return ok(experiment);
  } catch (err) {
    return serverError(err);
  }
});

export const PATCH = withAuth(async (req: NextRequest, { params, organizationId }) => {
  try {
    if (!(await findProjectInOrg(params!.id, organizationId))) return notFound("Project");
    const body = await req.json();
    const parsed = UpdateExperimentSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const data: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.status === "completed") data.completedAt = new Date();

    const experiment = await withRetry(() =>
      prisma.experiment.update({
        where: { id: params!.eid, projectId: params!.id },
        data,
        include: { runs: { orderBy: { runNumber: "asc" } } },
      })
    );
    return ok(experiment);
  } catch (err) {
    return serverError(err);
  }
}, "RISK_OFFICER");
