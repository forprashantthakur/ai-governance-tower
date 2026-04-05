import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, created, badRequest, notFound, serverError } from "@/lib/api-response";
import { calculateRiskScore } from "@/lib/risk-scoring";
import { logAudit, getClientIp } from "@/lib/audit-logger";

const AssessmentSchema = z.object({
  dataSensitivity: z.enum(["PUBLIC", "INTERNAL", "CONFIDENTIAL", "RESTRICTED", "PII"]),
  explainability: z.number().min(0).max(100),
  humanOversight: z.boolean(),
  isPiiProcessing: z.boolean(),
  isFinancial: z.boolean(),
  isCritical: z.boolean(),
  findings: z.string().optional(),
  mitigations: z.string().optional(),
  nextReviewDate: z.string().datetime().optional(),
});

// GET /api/risk/:modelId — latest assessment + history
export const GET = withAuth(async (_req, { params }) => {
  try {
    const model = await prisma.aIModel.findUnique({ where: { id: params.modelId } });
    if (!model) return notFound("Model");

    const assessments = await prisma.riskAssessment.findMany({
      where: { modelId: params.modelId },
      include: { assessor: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return ok({ model, assessments });
  } catch (err) {
    return serverError(err);
  }
});

// POST /api/risk/:modelId — create new assessment
export const POST = withAuth(async (req, { params, user }) => {
  try {
    const model = await prisma.aIModel.findUnique({ where: { id: params.modelId } });
    if (!model) return notFound("Model");

    const body = await req.json();
    const parsed = AssessmentSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const { dataSensitivity, explainability, humanOversight, isPiiProcessing, isFinancial, isCritical, findings, mitigations, nextReviewDate } = parsed.data;

    const scores = calculateRiskScore({
      dataSensitivity,
      modelType: model.type,
      explainability,
      humanOversight,
      isPiiProcessing,
      isFinancial,
      isCritical,
    });

    const assessment = await prisma.riskAssessment.create({
      data: {
        modelId: params.modelId,
        assessorId: user.userId,
        riskLevel: scores.riskLevel,
        overallScore: scores.overallScore,
        dataSensitivityScore: scores.dataSensitivityScore,
        modelComplexityScore: scores.modelComplexityScore,
        explainabilityScore: scores.explainabilityScore,
        humanOversightScore: scores.humanOversightScore,
        regulatoryExposureScore: scores.regulatoryExposureScore,
        findings,
        mitigations,
        reviewedAt: new Date(),
        nextReviewDate: nextReviewDate ? new Date(nextReviewDate) : undefined,
      },
      include: { assessor: { select: { id: true, name: true } } },
    });

    // Sync model flags
    await prisma.aIModel.update({
      where: { id: params.modelId },
      data: { isPiiProcessing, isFinancial, isCritical, humanOversight, explainability },
    });

    await logAudit({
      userId: user.userId,
      action: "CREATE",
      resource: "RiskAssessment",
      resourceId: assessment.id,
      modelId: params.modelId,
      after: assessment,
      ipAddress: getClientIp(req),
    });

    return created({ assessment, scores });
  } catch (err) {
    return serverError(err);
  }
}, "RISK_OFFICER");
