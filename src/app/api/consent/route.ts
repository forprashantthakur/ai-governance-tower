import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, created, badRequest, serverError } from "@/lib/api-response";
import { logAudit, getClientIp } from "@/lib/audit-logger";

export const dynamic = "force-dynamic";

const CreateConsentSchema = z.object({
  dataAssetId: z.string().uuid(),
  subjectId: z.string().min(1).max(500),
  consentType: z.enum(["DATA_PROCESSING", "AI_DECISION", "DATA_SHARING", "MARKETING"]),
  status: z.enum(["GRANTED", "REVOKED", "PENDING", "EXPIRED"]).default("GRANTED"),
  grantedAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
  ipAddress: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

// GET /api/consent
export const GET = withAuth(async (req) => {
  try {
    const { searchParams } = new URL(req.url);
    const status    = searchParams.get("status") ?? undefined;
    const type      = searchParams.get("type") ?? undefined;
    const assetId   = searchParams.get("assetId") ?? undefined;
    const page      = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit     = Math.min(100, parseInt(searchParams.get("limit") ?? "50"));
    const skip      = (page - 1) * limit;

    const where = {
      ...(status  && { status:      status  as "GRANTED"|"REVOKED"|"PENDING"|"EXPIRED" }),
      ...(type    && { consentType: type    as "DATA_PROCESSING"|"AI_DECISION"|"DATA_SHARING"|"MARKETING" }),
      ...(assetId && { dataAssetId: assetId }),
    };

    const [records, total] = await Promise.all([
      prisma.consentRecord.findMany({
        where,
        include: {
          dataAsset: { select: { id: true, name: true, sensitivity: true, hasPii: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.consentRecord.count({ where }),
    ]);

    // Summary counts (always across all records for the asset filter only)
    const [summary] = await Promise.all([
      prisma.consentRecord.groupBy({
        by: ["status"],
        where: assetId ? { dataAssetId: assetId } : {},
        _count: { _all: true },
      }),
    ]);

    const statusCounts = { GRANTED: 0, REVOKED: 0, PENDING: 0, EXPIRED: 0 };
    summary.forEach((s) => { statusCounts[s.status] = s._count._all; });

    return ok({
      records,
      total,
      page,
      pages: Math.ceil(total / limit),
      summary: statusCounts,
    });
  } catch (err) {
    return serverError(err);
  }
});

// POST /api/consent
export const POST = withAuth(async (req, { user }) => {
  try {
    const body = await req.json();
    const parsed = CreateConsentSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const { grantedAt, expiresAt, ...rest } = parsed.data;

    const record = await prisma.consentRecord.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: {
        ...rest,
        grantedAt: grantedAt ? new Date(grantedAt) : rest.status === "GRANTED" ? new Date() : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      } as any,
      include: {
        dataAsset: { select: { id: true, name: true, sensitivity: true } },
      },
    });

    await logAudit({
      userId: user.userId,
      action: "CREATE",
      resource: "ConsentRecord",
      resourceId: record.id,
      after: record,
      ipAddress: getClientIp(req),
    });

    return created(record);
  } catch (err) {
    return serverError(err);
  }
}, "RISK_OFFICER");
