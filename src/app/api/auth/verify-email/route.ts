import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signJwt } from "@/lib/auth/jwt";
import { ok, badRequest } from "@/lib/api-response";

export const dynamic = "force-dynamic";

// GET /api/auth/verify-email?token=xxx
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return badRequest("Missing verification token");

  const user = await prisma.user.findUnique({
    where: { verificationToken: token },
    include: {
      memberships: {
        where: { isActive: true },
        include: { organization: true },
        orderBy: { joinedAt: "asc" },
        take: 1,
      },
    },
  });

  if (!user) {
    return NextResponse.json(
      { success: false, error: "Invalid or already used verification link." },
      { status: 400 }
    );
  }

  if (user.verificationTokenExpiresAt && user.verificationTokenExpiresAt < new Date()) {
    return NextResponse.json(
      { success: false, error: "Verification link has expired. Please register again or request a new link." },
      { status: 400 }
    );
  }

  if (user.emailVerified) {
    return NextResponse.json(
      { success: false, error: "Email already verified. Please sign in." },
      { status: 400 }
    );
  }

  // Mark verified, clear token
  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      verificationToken: null,
      verificationTokenExpiresAt: null,
    },
  });

  // Auto-login: issue JWT so user lands directly in dashboard
  const membership = user.memberships[0];
  if (!membership) {
    return ok({ verified: true, message: "Email verified. Please sign in." });
  }

  const jwt = await signJwt({
    userId: user.id,
    email: user.email,
    name: user.name,
    organizationId: membership.organizationId,
    orgRole: membership.role,
    plan: membership.organization.plan,
  });

  return ok({
    verified: true,
    token: jwt,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: membership.role,
      organizationId: membership.organizationId,
      organization: {
        id: membership.organization.id,
        name: membership.organization.name,
        slug: membership.organization.slug,
        plan: membership.organization.plan,
      },
    },
  });
}
