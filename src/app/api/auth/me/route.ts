import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/with-auth";
import { ok, unauthorized, serverError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

// GET /api/auth/me — the signed-in user and organization for the current session.
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (auth.error) return auth.error;

    const [user, organization] = await Promise.all([
      prisma.user.findUnique({
        where: { id: auth.user.userId },
        select: {
          id: true,
          email: true,
          name: true,
          department: true,
          avatarUrl: true,
          lastLoginAt: true,
          createdAt: true,
        },
      }),
      prisma.organization.findUnique({
        where: { id: auth.user.organizationId },
        select: { id: true, name: true, slug: true, plan: true },
      }),
    ]);
    if (!user || !organization) return unauthorized("User not found");

    return ok({
      ...user,
      role: auth.user.orgRole,
      organizationId: organization.id,
      organization,
    });
  } catch (err) {
    return serverError(err);
  }
}
