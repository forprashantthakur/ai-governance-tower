import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma, withRetry } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { signJwt } from "@/lib/auth/jwt";
import { ok, badRequest, unauthorized, serverError } from "@/lib/api-response";
import { logAudit, getClientIp } from "@/lib/audit-logger";

export const dynamic = "force-dynamic";

const LoginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
  // Optional: if user belongs to multiple orgs, client sends which one to log into
  organizationId: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const { email, password, organizationId: preferredOrgId } = parsed.data;

    const user = await withRetry(() =>
      prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        select: {
          id: true,
          email: true,
          name: true,
          passwordHash: true,
          isActive: true,
          memberships: {
            where: { isActive: true },
            include: {
              organization: {
                select: { id: true, name: true, slug: true, plan: true, isActive: true },
              },
            },
            orderBy: { joinedAt: "asc" },
          },
        },
      })
    );

    if (!user || !user.isActive) return unauthorized("Invalid credentials");

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) return unauthorized("Invalid credentials");

    // Resolve which org membership to use for this session
    const activeMemberships = user.memberships.filter((m) => m.organization.isActive);

    if (activeMemberships.length === 0) {
      // Edge case: user exists but has no active org (legacy user pre-migration)
      // Return a list-orgs:[] signal so the client can prompt org creation
      return ok({
        token: null,
        user: { id: user.id, email: user.email, name: user.name },
        requiresOrgSetup: true,
        organizations: [],
      });
    }

    // If user is in multiple orgs and a preference was provided, honour it
    let membership = activeMemberships[0];
    if (preferredOrgId) {
      const preferred = activeMemberships.find((m) => m.organizationId === preferredOrgId);
      if (preferred) membership = preferred;
    }

    // If user is in multiple orgs and no preference given, ask client to pick
    if (activeMemberships.length > 1 && !preferredOrgId) {
      return ok({
        token: null,
        requiresOrgPicker: true,
        user: { id: user.id, email: user.email, name: user.name },
        organizations: activeMemberships.map((m) => ({
          id: m.organizationId,
          name: m.organization.name,
          slug: m.organization.slug,
          plan: m.organization.plan,
          role: m.role,
        })),
      });
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = await signJwt({
      userId: user.id,
      email: user.email,
      name: user.name,
      organizationId: membership.organizationId,
      orgRole: membership.role,
      plan: membership.organization.plan,
    });

    await logAudit({
      userId: user.id,
      action: "LOGIN",
      resource: "User",
      resourceId: user.id,
      ipAddress: getClientIp(req),
      userAgent: req.headers.get("user-agent") ?? undefined,
    });

    return ok({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: membership.role,         // orgRole used as "role" for UI compat
        organizationId: membership.organizationId,
        organization: {
          id: membership.organizationId,
          name: membership.organization.name,
          slug: membership.organization.slug,
          plan: membership.organization.plan,
        },
      },
    });
  } catch (err) {
    return serverError(err);
  }
}
