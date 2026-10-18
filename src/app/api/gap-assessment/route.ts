import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, created, badRequest, serverError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

type GapAssessmentStatusLiteral = "DRAFT" | "IN_PROGRESS" | "COMPLETED" | "SIGNED_OFF";

const CreateAssessmentSchema = z.object({
  name: z.string().min(1).max(300),
  framework: z.string().min(1).max(200),
  scope: z.string().optional(),
  assessorName: z.string().optional(),
  status: z.enum(["DRAFT", "IN_PROGRESS", "COMPLETED", "SIGNED_OFF"]).default("DRAFT"),
  startedAt: z.string().datetime().optional(),
});

// GET /api/gap-assessment
export const GET = withAuth(async (req: NextRequest, { organizationId }) => {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") ?? undefined;
    const framework = searchParams.get("framework") ?? undefined;

    const where = {
      organizationId, // ← org isolation
      ...(status && { status: status as GapAssessmentStatusLiteral }),
      ...(framework && { framework }),
    };

    try {
      const assessments = await prisma.gapAssessment.findMany({
        where,
        include: { _count: { select: { findings: true } } },
        orderBy: { createdAt: "desc" },
      });

      const stats = {
        total: assessments.length,
        draft: assessments.filter((a) => a.status === "DRAFT").length,
        inProgress: assessments.filter((a) => a.status === "IN_PROGRESS").length,
        completed: assessments.filter((a) => a.status === "COMPLETED").length,
        signedOff: assessments.filter((a) => a.status === "SIGNED_OFF").length,
        avgScore: assessments.length
          ? Math.round(assessments.reduce((sum, a) => sum + a.overallScore, 0) / assessments.length)
          : 0,
      };

      return ok({ assessments, stats });
    } catch (dbErr) {
      // New table may not exist yet on a stale DB — return empty gracefully
      const msg = dbErr instanceof Error ? dbErr.message : "";
      if (msg.includes("does not exist") || msg.includes("P2021") || msg.includes("relation")) {
        return ok({
          assessments: [],
          stats: { total: 0, draft: 0, inProgress: 0, completed: 0, signedOff: 0, avgScore: 0 },
        });
      }
      throw dbErr;
    }
  } catch (err) {
    return serverError(err);
  }
});

// POST /api/gap-assessment
export const POST = withAuth(async (req: NextRequest, { organizationId }) => {
  try {
    const parsed = CreateAssessmentSchema.safeParse(await req.json());
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const { startedAt, ...rest } = parsed.data;

    const assessment = await prisma.gapAssessment.create({
      data: {
        ...rest,
        organizationId, // ← org isolation
        startedAt: startedAt ? new Date(startedAt) : new Date(),
      },
      include: { _count: { select: { findings: true } } },
    });

    return created(assessment);
  } catch (err) {
    return serverError(err);
  }
}, "RISK_OFFICER");
