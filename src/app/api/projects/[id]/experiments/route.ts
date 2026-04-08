import { NextRequest } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma, withRetry } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, badRequest, serverError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const CreateExperimentSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  hyperparams: z.record(z.unknown()).optional(),
  metrics: z.record(z.number()).optional(),
  datasetRef: z.string().optional(),
  modelRef: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const GET = withAuth(async (_req: NextRequest, { params }) => {
  try {
    const experiments = await withRetry(() =>
      prisma.experiment.findMany({
        where: { projectId: params!.id },
        include: { runs: { orderBy: { runNumber: "asc" } } },
        orderBy: { createdAt: "desc" },
      })
    );
    return ok(experiments);
  } catch (err) {
    return serverError(err);
  }
});

export const POST = withAuth(async (req: NextRequest, { user, params }) => {
  try {
    const body = await req.json();
    const parsed = CreateExperimentSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const experiment = await withRetry(() =>
      prisma.experiment.create({
        data: {
          projectId: params!.id,
          name: parsed.data.name,
          description: parsed.data.description,
          hyperparams: (parsed.data.hyperparams ?? {}) as Prisma.InputJsonValue,
          metrics: (parsed.data.metrics ?? {}) as Prisma.InputJsonValue,
          datasetRef: parsed.data.datasetRef,
          modelRef: parsed.data.modelRef,
          notes: parsed.data.notes,
          tags: parsed.data.tags ?? [],
          createdBy: user.userId,
          status: "running",
        },
      })
    );
    return ok(experiment, undefined, 201);
  } catch (err) {
    return serverError(err);
  }
});
