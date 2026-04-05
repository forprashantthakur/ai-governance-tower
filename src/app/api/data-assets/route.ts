import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, created, badRequest, serverError } from "@/lib/api-response";
import { logAudit, getClientIp } from "@/lib/audit-logger";

const CreateAssetSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  source: z.string().min(1),
  dataType: z.string().min(1),
  sensitivity: z.enum(["PUBLIC", "INTERNAL", "CONFIDENTIAL", "RESTRICTED", "PII"]),
  hasPii: z.boolean().default(false),
  piiFields: z.array(z.string()).default([]),
  retentionDays: z.number().int().positive().optional(),
  location: z.string().optional(),
  format: z.string().optional(),
  owner: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

// GET /api/data-assets
export const GET = withAuth(async (req) => {
  try {
    const assets = await prisma.dataAsset.findMany({
      include: {
        models: {
          include: { model: { select: { id: true, name: true, type: true } } },
        },
        _count: { select: { consentRecords: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return ok({ assets, total: assets.length });
  } catch (err) {
    return serverError(err);
  }
});

// POST /api/data-assets
export const POST = withAuth(async (req, { user }) => {
  try {
    const body = await req.json();
    const parsed = CreateAssetSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const asset = await prisma.dataAsset.create({ data: parsed.data });

    await logAudit({
      userId: user.userId,
      action: "CREATE",
      resource: "DataAsset",
      resourceId: asset.id,
      after: asset,
      ipAddress: getClientIp(req),
    });

    return created(asset);
  } catch (err) {
    return serverError(err);
  }
}, "RISK_OFFICER");
