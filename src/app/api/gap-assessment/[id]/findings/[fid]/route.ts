import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, badRequest, notFound, serverError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const UpdateFindingSchema = z.object({
  requirementRef: z.string().min(1).max(100).optional(),
  requirementTitle: z.string().min(1).max(500).optional(),
  currentState: z.string().nullable().optional(),
  desiredState: z.string().nullable().optional(),
  gapDescription: z.string().nullable().optional(),
  severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).optional(),
  maturityCurrent: z.number().int().min(0).max(5).optional(),
  maturityTarget: z.number().int().min(0).max(5).optional(),
  recommendation: z.string().nullable().optional(),
  ownerRole: z.string().nullable().optional(),
  targetDate: z.string().datetime().nullable().optional(),
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

// PATCH /api/gap-assessment/:id/findings/:fid
export const PATCH = withAuth(async (req: NextRequest, { params, organizationId }) => {
  try {
    // Scope through the parent assessment's organizationId
    const assessment = await prisma.gapAssessment.findFirst({
      where: { id: params.id, organizationId },
    });
    if (!assessment) return notFound("GapAssessment");

    const existing = await prisma.gapFinding.findFirst({
      where: { id: params.fid, assessmentId: params.id },
    });
    if (!existing) return notFound("GapFinding");

    const parsed = UpdateFindingSchema.safeParse(await req.json());
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());
    const { targetDate, ...rest } = parsed.data;

    const finding = await prisma.gapFinding.update({
      where: { id: params.fid },
      data: {
        ...rest,
        ...(targetDate !== undefined && { targetDate: targetDate ? new Date(targetDate) : null }),
      },
    });

    const overallScore = await recomputeAssessmentScore(params.id);

    return ok({ ...finding, overallScore });
  } catch (err) {
    return serverError(err);
  }
}, "RISK_OFFICER");

// DELETE /api/gap-assessment/:id/findings/:fid
export const DELETE = withAuth(async (_req: NextRequest, { params, organizationId }) => {
  try {
    // Scope through the parent assessment's organizationId
    const assessment = await prisma.gapAssessment.findFirst({
      where: { id: params.id, organizationId },
    });
    if (!assessment) return notFound("GapAssessment");

    const existing = await prisma.gapFinding.findFirst({
      where: { id: params.fid, assessmentId: params.id },
    });
    if (!existing) return notFound("GapFinding");

    await prisma.gapFinding.delete({ where: { id: params.fid } });

    const overallScore = await recomputeAssessmentScore(params.id);

    return ok({ deleted: true, overallScore });
  } catch (err) {
    return serverError(err);
  }
}, "RISK_OFFICER");
