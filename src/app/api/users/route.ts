import { NextRequest } from "next/server";
import { prisma, withRetry } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, serverError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

// GET /api/users — returns members of the caller's organization only
export const GET = withAuth(async (_req: NextRequest, { organizationId }) => {
  try {
    const members = await withRetry(() =>
      prisma.organizationMember.findMany({
        where: { organizationId, isActive: true },
        include: {
          user: {
            select: { id: true, name: true, email: true, department: true, lastLoginAt: true },
          },
        },
        orderBy: { user: { name: "asc" } },
      })
    );

    // Flatten to a user-friendly shape for the UI
    const users = members.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      department: m.user.department,
      role: m.role,
      joinedAt: m.joinedAt,
      lastLoginAt: m.user.lastLoginAt,
    }));

    return ok(users);
  } catch (err) {
    return serverError(err);
  }
});
