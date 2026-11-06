import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signSessionToken } from "@/lib/auth/issue-session";
import { rejectCrossSiteAuthRequest, setSessionCookie } from "@/lib/auth/session";
import { limitByIp } from "@/lib/rate-limit";
import { ok, badRequest } from "@/lib/api-response";

export const dynamic = "force-dynamic";

// GET /api/auth/verify-email?token=xxx
export async function GET(req: NextRequest) {
  // Called by our /verify-email page. A direct link from another site must not
  // be able to sign the visitor into whichever account the token belongs to.
  const refused = rejectCrossSiteAuthRequest(req);
  if (refused) return refused;
  const limited = await limitByIp(req, "verify-email", 30, 60 * 60);
  if (limited) return limited;

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

  const jwt = await signSessionToken({
    user,
    organizationId: membership.organizationId,
    orgRole: membership.role,
    plan: membership.organization.plan,
  });

  const res = ok({
    verified: true,
    authenticated: true,
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
  return setSessionCookie(res, jwt);
}
