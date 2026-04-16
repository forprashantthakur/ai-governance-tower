import { NextRequest } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import {
  ok,
  created,
  badRequest,
  serverError,
} from "@/lib/api-response";
import { logAudit, getClientIp } from "@/lib/audit-logger";
import { calculateRiskScore } from "@/lib/risk-scoring";
import { getCache, setCache, deleteCachePattern, orgKey } from "@/lib/redis";

export const dynamic = 'force-dynamic';

const CreateModelSchema = z.object({
  name: z.string().min(1).max(200),
  version: z.string().default("1.0.0"),
  description: z.string().optional(),
  type: z.enum(["LLM", "ML", "AGENT", "COMPUTER_VISION", "NLP", "RECOMMENDATION"]),
  status: z.enum(["ACTIVE", "INACTIVE", "DEPRECATED", "UNDER_REVIEW", "SUSPENDED"]).default("ACTIVE"),
  department: z.string().optional(),
  vendor: z.string().optional(),
  framework: z.string().optional(),
  endpoint: z.string().url().optional().or(z.literal("")),
  tags: z.array(z.string()).default([]),
  isPiiProcessing: z.boolean().default(false),
  isFinancial: z.boolean().default(false),
  isCritical: z.boolean().default(false),
  humanOversight: z.boolean().default(true),
  explainability: z.number().min(0).max(100).default(50),
  trainingDataset: z.string().optional(),
  accuracyScore: z.number().min(0).max(1).optional(),
  metadata: z.record(z.unknown()).optional(),
});

// GET /api/models
export const GET = withAuth(async (req, { user, organizationId }) => {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "20"));
    const search = searchParams.get("search") ?? "";
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const riskLevel = searchParams.get("riskLevel");

    const cacheKey = orgKey(organizationId, `models:${page}:${limit}:${search}:${type}:${status}:${riskLevel}`);
    const cached = await getCache(cacheKey);
    if (cached) return ok(cached as object);

    const where: Prisma.AIModelWhereInput = {
      organizationId,
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ],
      }),
      ...(type && { type: type as never }),
      ...(status && { status: status as never }),
    };

    const [models, total] = await Promise.all([
      prisma.aIModel.findMany({
        where,
        include: {
          owner: { select: { id: true, name: true, email: true } },
          approver: { select: { id: true, name: true, email: true } },
          riskAssessments: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              riskLevel: true,
              overallScore: true,
              dataSensitivityScore: true,
              modelComplexityScore: true,
              explainabilityScore: true,
              humanOversightScore: true,
              regulatoryExposureScore: true,
            },
          },
          _count: { select: { agents: true, promptLogs: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.aIModel.count({ where }),
    ]);

    // Filter by riskLevel if provided (comes from latest assessment)
    const filtered = riskLevel
      ? models.filter(
          (m) => m.riskAssessments[0]?.riskLevel === riskLevel
        )
      : models;

    const result = {
      models: filtered,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };

    await setCache(cacheKey, result, 60);
    return ok(result);
  } catch (err) {
    return serverError(err);
  }
});

// POST /api/models
export const POST = withAuth(async (req, { user, organizationId }) => {
  try {
    const body = await req.json();
    const parsed = CreateModelSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const model = await prisma.aIModel.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { ...parsed.data, organizationId, ownerId: user.userId, endpoint: parsed.data.endpoint || null } as any,
      include: {
        owner: { select: { id: true, name: true, email: true } },
      },
    });

    // Auto-generate initial risk assessment
    const riskInputs = {
      dataSensitivity: (parsed.data.isPiiProcessing ? "PII" : "INTERNAL") as never,
      modelType: parsed.data.type,
      explainability: parsed.data.explainability,
      humanOversight: parsed.data.humanOversight,
      isPiiProcessing: parsed.data.isPiiProcessing,
      isFinancial: parsed.data.isFinancial,
      isCritical: parsed.data.isCritical,
    };

    const scores = calculateRiskScore(riskInputs);

    await prisma.riskAssessment.create({
      data: {
        modelId: model.id,
        assessorId: user.userId,
        riskLevel: scores.riskLevel,
        overallScore: scores.overallScore,
        dataSensitivityScore: scores.dataSensitivityScore,
        modelComplexityScore: scores.modelComplexityScore,
        explainabilityScore: scores.explainabilityScore,
        humanOversightScore: scores.humanOversightScore,
        regulatoryExposureScore: scores.regulatoryExposureScore,
        findings: "Auto-generated initial assessment",
        nextReviewDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      },
    });

    await logAudit({
      userId: user.userId,
      organizationId,
      action: "CREATE",
      resource: "AIModel",
      resourceId: model.id,
      after: model,
      ipAddress: getClientIp(req),
    });

    await deleteCachePattern(orgKey(organizationId, "models:*"));

    return created(model);
  } catch (err) {
    return serverError(err);
  }
}, "RISK_OFFICER");
