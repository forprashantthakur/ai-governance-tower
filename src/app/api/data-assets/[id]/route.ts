import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, badRequest, notFound, noContent, serverError } from "@/lib/api-response";
import { logAudit, getClientIp } from "@/lib/audit-logger";
import { findDataAssetInOrg } from "@/lib/tenant";

export const dynamic = "force-dynamic";

const UpdateAssetSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  source: z.string().min(1).optional(),
  dataType: z.string().optional(),
  sensitivity: z.enum(["PUBLIC", "INTERNAL", "CONFIDENTIAL", "RESTRICTED", "PII"]).optional(),
  hasPii: z.boolean().optional(),
  piiFields: z.array(z.string()).optional(),
  retentionDays: z.number().int().positive().nullable().optional(),
  location: z.string().optional(),
  format: z.string().optional(),
  owner: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

// GET /api/data-assets/:id
export const GET = withAuth(async (_req, { params, organizationId }) => {
  try {
    const asset = await prisma.dataAsset.findFirst({
      where: { id: params.id, organizationId },
      include: {
        models: {
          include: { model: { select: { id: true, name: true, type: true, status: true } } },
        },
        consentRecords: { orderBy: { createdAt: "desc" }, take: 10 },
        _count: { select: { consentRecords: true } },
      },
    });

    if (!asset) return notFound("DataAsset");
    return ok(asset);
  } catch (err) {
    return serverError(err);
  }
});

// PATCH /api/data-assets/:id
export const PATCH = withAuth(async (req, { params, user, organizationId }) => {
  try {
    const existing = await findDataAssetInOrg(params.id, organizationId);
    if (!existing) return notFound("DataAsset");

    const body = await req.json();
    const parsed = UpdateAssetSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const updated = await prisma.dataAsset.update({
      where: { id: existing.id },
      data: parsed.data,
    });

    await logAudit({
      userId: user.userId,
      organizationId,
      action: "UPDATE",
      resource: "DataAsset",
      resourceId: params.id,
      before: existing,
      after: updated,
      ipAddress: getClientIp(req),
    });

    return ok(updated);
  } catch (err) {
    return serverError(err);
  }
}, "RISK_OFFICER");

// DELETE /api/data-assets/:id
export const DELETE = withAuth(async (req, { params, user, organizationId }) => {
  try {
    const existing = await findDataAssetInOrg(params.id, organizationId);
    if (!existing) return notFound("DataAsset");

    await prisma.dataAsset.delete({ where: { id: existing.id } });

    await logAudit({
      userId: user.userId,
      organizationId,
      action: "DELETE",
      resource: "DataAsset",
      resourceId: params.id,
      before: existing,
      ipAddress: getClientIp(req),
    });

    return noContent();
  } catch (err) {
    return serverError(err);
  }
}, "ADMIN");
