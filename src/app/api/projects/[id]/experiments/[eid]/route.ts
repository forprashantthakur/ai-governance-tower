import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, withRetry } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, badRequest, serverError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const UpdateExperimentSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  status: z.string().optional(),
  hyperparams: z.record(z.unknown()).optional(),
  metrics: z.record(z.number()).optional(),
  artifacts: z.array(z.object({ name: z.string(), type: z.string(), url: z.string() })).optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  modelRef: z.string().optional(),
});

export const GET = withAuth(async (_req: NextRequest, { params }) => {
  try {
    const experiment = await withRetry(() =>
      prisma.experiment.findUnique({
        where: { id: params!.eid },
        include: { runs: { orderBy: { runNumber: "asc" } } },
      })
    );
    if (!experiment) return ok(null);
    return ok(experiment);
  } catch (err) {
    return serverError(err);
  }
});

export const PATCH = withAuth(async (req: NextRequest, { params }) => {
  try {
    const body = await req.json();
    const parsed = UpdateExperimentSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const data: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.status === "completed") data.completedAt = new Date();

    const experiment = await withRetry(() =>
      prisma.experiment.update({
        where: { id: params!.eid },
        data,
        include: { runs: { orderBy: { runNumber: "asc" } } },
      })
    );
    return ok(experiment);
  } catch (err) {
    return serverError(err);
  }
});
