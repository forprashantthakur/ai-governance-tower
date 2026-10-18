import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { created, badRequest, notFound, serverError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const CreateFindingSchema = z.object({
  requirementRef: z.string().min(1).max(100),
  requirementTitle: z.string().min(1).max(500),
  currentState: z.string().optional(),
  desiredState: z.string().optional(),
  gapDescription: z.string().optional(),
  severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).default("MEDIUM"),
  maturityCurrent: z.number().int().min(0).max(5).default(0),
  maturityTarget: z.number().int().min(0).max(5).default(3),
  recommendation: z.string().optional(),
  ownerRole: z.string().optional(),
  targetDate: z.string().datetime().optional(),
});

// Recompute the parent assessment's overallScore as the average maturity closure % across findings.
async function recomputeAssessmentScore(assessmentId: string) {
  const findings = await prisma.gapFinding.findMany({
    where: { assessmentId },
    select: { maturityCurrent: true, maturityTarget: true },
  });

  const overallScore = findings.length
    ? Math.round(
        findings.reduce((sum, f) => {
          const pct = f.maturityTarget === 0 ? 100 : (f.maturityCurrent / f.maturityTarget) * 100;
          return sum + Math.min(100, Math.max(0, pct));
        }, 0) / findings.length
      )
    : 0;

  await prisma.gapAssessment.update({ where: { id: assessmentId }, data: { overallScore } });
  return overallScore;
}

// POST /api/gap-assessment/:id/findings
export const POST = withAuth(async (req: NextRequest, { params, organizationId }) => {
  try {
    // Scope through the parent assessment's organizationId
    const assessment = await prisma.gapAssessment.findFirst({
      where: { id: params.id, organizationId },
    });
    if (!assessment) return notFound("GapAssessment");

    const parsed = CreateFindingSchema.safeParse(await req.json());
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());
    const { targetDate, ...rest } = parsed.data;

    const finding = await prisma.gapFinding.create({
      data: {
        ...rest,
        assessmentId: params.id,
        targetDate: targetDate ? new Date(targetDate) : null,
      },
    });

    const overallScore = await recomputeAssessmentScore(params.id);

    return created({ ...finding, overallScore });
  } catch (err) {
    return serverError(err);
  }
}, "RISK_OFFICER");
