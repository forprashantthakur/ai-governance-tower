import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, badRequest, notFound, noContent, serverError } from "@/lib/api-response";
import { logAudit, getClientIp } from "@/lib/audit-logger";

export const dynamic = "force-dynamic";

const UpdateConsentSchema = z.object({
  status: z.enum(["GRANTED", "REVOKED", "PENDING", "EXPIRED"]).optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
});

// GET /api/consent/:id
export const GET = withAuth(async (_req, { params }) => {
  try {
    const record = await prisma.consentRecord.findUnique({
      where: { id: params.id },
      include: {
        dataAsset: { select: { id: true, name: true, sensitivity: true, hasPii: true, piiFields: true } },
      },
    });
    if (!record) return notFound("ConsentRecord");
    return ok(record);
  } catch (err) {
    return serverError(err);
  }
});

// PATCH /api/consent/:id  (revoke, re-grant, expire)
export const PATCH = withAuth(async (req, { params, user }) => {
  try {
    const existing = await prisma.consentRecord.findUnique({ where: { id: params.id } });
    if (!existing) return notFound("ConsentRecord");

    const body = await req.json();
    const parsed = UpdateConsentSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const { status, expiresAt, metadata } = parsed.data;

    // Auto-set revokedAt / grantedAt timestamps when status changes
    const timestamps: Record<string, Date | null> = {};
    if (status === "REVOKED" && existing.status !== "REVOKED") {
      timestamps.revokedAt = new Date();
    }
    if (status === "GRANTED" && existing.status !== "GRANTED") {
      timestamps.grantedAt = new Date();
      timestamps.revokedAt = null;
    }

    const updated = await prisma.consentRecord.update({
      where: { id: params.id },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: {
        ...(status    !== undefined && { status }),
        ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
        ...(metadata  !== undefined && { metadata }),
        ...timestamps,
      } as any,
      include: {
        dataAsset: { select: { id: true, name: true } },
      },
    });

    await logAudit({
      userId: user.userId,
      action: "UPDATE",
      resource: "ConsentRecord",
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

// DELETE /api/consent/:id
export const DELETE = withAuth(async (req, { params, user }) => {
  try {
    const existing = await prisma.consentRecord.findUnique({ where: { id: params.id } });
    if (!existing) return notFound("ConsentRecord");

    await prisma.consentRecord.delete({ where: { id: params.id } });

    await logAudit({
      userId: user.userId,
      action: "DELETE",
      resource: "ConsentRecord",
      resourceId: params.id,
      before: existing,
      ipAddress: getClientIp(req),
    });

    return noContent();
  } catch (err) {
    return serverError(err);
  }
}, "ADMIN");
