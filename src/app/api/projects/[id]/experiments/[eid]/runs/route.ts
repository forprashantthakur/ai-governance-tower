import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, withRetry } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, badRequest, serverError } from "@/lib/api-response";
import { fireWebhooks } from "@/lib/n8n-trigger";

export const dynamic = "force-dynamic";

const LogRunSchema = z.object({
  hyperparams: z.record(z.unknown()).optional(),
  metrics: z.record(z.number()).optional(),
  artifacts: z.array(z.object({ name: z.string(), type: z.string(), url: z.string() })).optional(),
  status: z.string().optional(),
  duration: z.number().optional(),
  notes: z.string().optional(),
});

export const POST = withAuth(async (req: NextRequest, { params }) => {
  try {
    const body = await req.json();
    const parsed = LogRunSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const maxRun = await prisma.experimentRun.aggregate({
      where: { experimentId: params!.eid },
      _max: { runNumber: true },
    });

    const run = await withRetry(() =>
      prisma.experimentRun.create({
        data: {
          experimentId: params!.eid,
          runNumber: (maxRun._max.runNumber ?? 0) + 1,
          hyperparams: parsed.data.hyperparams ?? {},
          metrics: parsed.data.metrics ?? {},
          artifacts: parsed.data.artifacts ?? [],
          status: parsed.data.status ?? "completed",
          duration: parsed.data.duration,
          notes: parsed.data.notes,
        },
      })
    );

    fireWebhooks(params!.id, "EXPERIMENT_LOGGED", {
      experimentId: params!.eid,
      runNumber: run.runNumber,
      metrics: parsed.data.metrics,
    }).catch(() => {});

    return ok(run, undefined, 201);
  } catch (err) {
    return serverError(err);
  }
});
