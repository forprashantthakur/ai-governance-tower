import { NextRequest } from "next/server";
import { z } from "zod";
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
import { getCache, setCache, deleteCachePattern } from "@/lib/redis";

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
  metadata: z.record(z.unknown()).optional(),
});

// GET /api/models
export const GET = withAuth(async (req, { user }) => {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "20"));
    const search = searchParams.get("search") ?? "";
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const riskLevel = searchParams.get("riskLevel");

    const cacheKey = `models:${page}:${limit}:${search}:${type}:${status}:${riskLevel}`;
    const cached = await getCache(cacheKey);
    if (cached) return ok(cached as object);

    const where: Parameters<typeof prisma.aIModel.findMany>[0]["where"] = {
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
          riskAssessments: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { riskLevel: true, overallScore: true },
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
export const POST = withAuth(async (req, { user }) => {
  try {
    const body = await req.json();
    const parsed = CreateModelSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const data = parsed.data;

    const model = await prisma.aIModel.create({
      data: {
        ...data,
        ownerId: user.userId,
        endpoint: data.endpoint || null,
        metadata: data.metadata ?? undefined,
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
      },
    });

    // Auto-generate initial risk assessment
    const riskInputs = {
      dataSensitivity: (data.isPiiProcessing ? "PII" : "INTERNAL") as never,
      modelType: data.type,
      explainability: data.explainability,
      humanOversight: data.humanOversight,
      isPiiProcessing: data.isPiiProcessing,
      isFinancial: data.isFinancial,
      isCritical: data.isCritical,
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
      action: "CREATE",
      resource: "AIModel",
      resourceId: model.id,
      after: model,
      ipAddress: getClientIp(req),
    });

    await deleteCachePattern("models:*");

    return created(model);
  } catch (err) {
    return serverError(err);
  }
}, "RISK_OFFICER");
