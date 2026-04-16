import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, badRequest, serverError } from "@/lib/api-response";
import { logAudit, getClientIp } from "@/lib/audit-logger";

export const dynamic = "force-dynamic";

const UpdateOrgSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  billingEmail: z.string().email().optional(),
});

// GET /api/organizations — return caller's org details + usage stats
export const GET = withAuth(async (_req, { organizationId }) => {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        _count: {
          select: { members: true, invites: true },
        },
      },
    });

    if (!org) return badRequest("Organization not found");

    // Usage stats
    const [modelCount, projectCount] = await Promise.all([
      prisma.aIModel.count({ where: { organizationId } }),
      prisma.project.count({ where: { organizationId } }),
    ]);

    return ok({
      ...org,
      usage: {
        models: modelCount,
        maxModels: org.maxModels,
        members: org._count.members,
        maxUsers: org.maxUsers,
        projects: projectCount,
      },
    });
  } catch (err) {
    return serverError(err);
  }
});

// PATCH /api/organizations — update org settings (ADMIN+)
export const PATCH = withAuth(async (req, { user, organizationId }) => {
  try {
    const body = await req.json();
    const parsed = UpdateOrgSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const updated = await prisma.organization.update({
      where: { id: organizationId },
      data: parsed.data,
    });

    await logAudit({
      userId: user.userId,
      organizationId,
      action: "UPDATE",
      resource: "Organization",
      resourceId: organizationId,
      after: parsed.data,
      ipAddress: getClientIp(req),
    });

    return ok(updated);
  } catch (err) {
    return serverError(err);
  }
}, "ADMIN");
