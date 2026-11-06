import { NextRequest, NextResponse } from "next/server";
import { OrgMemberRole, PlanTier } from "@prisma/client";
import { verifyJwt, type JwtUserPayload } from "./auth/jwt";
import { getRequestToken, isCrossSiteRequest } from "./auth/session";
import { fingerprintMatches } from "./auth/fingerprint";
import { prisma } from "./prisma";
import { unauthorized, forbidden } from "./api-response";

export type RouteContext = {
  params: Record<string, string>;
  user: JwtUserPayload;
  organizationId: string;
};

type RouteHandler = (
  req: NextRequest,
  ctx: RouteContext
) => Promise<NextResponse>;

// Role hierarchy: higher number = more permissions
const ROLE_HIERARCHY: Record<OrgMemberRole, number> = {
  OWNER:        5,
  ADMIN:        4,
  RISK_OFFICER: 3,
  AUDITOR:      2,
  VIEWER:       1,
};

const PLAN_HIERARCHY: Record<PlanTier, number> = {
  ENTERPRISE:   4,
  PROFESSIONAL: 3,
  STARTER:      2,
  TRIAL:        1,
};

export interface WithAuthOptions {
  requiredRole?: OrgMemberRole;
  requiredPlan?: PlanTier;
}

/**
 * Verifies the caller's session (HttpOnly cookie, or a Bearer header for
 * non-browser clients) and re-reads their membership, so a removed or demoted
 * member, a deactivated user or organization, a plan change or a password
 * change takes effect on the next request rather than when the token expires.
 */
export async function authenticateRequest(
  req: NextRequest
): Promise<{ user: JwtUserPayload; error?: undefined } | { user?: undefined; error: NextResponse }> {
  const found = getRequestToken(req);
  if (!found) return { error: unauthorized("No token provided") };

  // A cookie is sent by the browser automatically, so a state-changing request
  // authenticated by cookie must come from our own pages (CSRF protection).
  if (found.source === "cookie" && isCrossSiteRequest(req)) {
    return { error: forbidden("Cross-site request refused") };
  }

  let user: JwtUserPayload;
  try {
    user = await verifyJwt(found.token);
  } catch {
    return { error: unauthorized("Invalid or expired token") };
  }

  // Tokens issued before the SaaS migration lack organizationId, and tokens
  // issued before session fingerprints lack sv — both must sign in again.
  if (!user.organizationId || !user.sv) {
    return { error: unauthorized("Session expired — please sign in again") };
  }

  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId: user.userId,
      organizationId: user.organizationId,
      isActive: true,
      user: { isActive: true },
      organization: { isActive: true },
    },
    select: {
      role: true,
      organization: { select: { plan: true } },
      user: { select: { passwordHash: true } },
    },
  });
  if (!membership) {
    return { error: unauthorized("Your access to this organization has ended — please sign in again") };
  }
  if (!membership.user?.passwordHash || !fingerprintMatches(user.sv, membership.user.passwordHash)) {
    return { error: unauthorized("Your password was changed — please sign in again") };
  }
  return { user: { ...user, orgRole: membership.role, plan: membership.organization.plan } };
}

export function withAuth(
  handler: RouteHandler,
  options?: WithAuthOptions | OrgMemberRole  // backward-compat: accept bare role string
) {
  // Normalise options — allow passing a bare role string as before
  const opts: WithAuthOptions =
    typeof options === "string"
      ? { requiredRole: options }
      : (options ?? {});

  return async (
    req: NextRequest,
    ctx: { params: Record<string, string> }
  ): Promise<NextResponse> => {
    const auth = await authenticateRequest(req);
    if (auth.error) return auth.error;
    const user = auth.user;

    // Role check
    if (opts.requiredRole) {
      const userLevel = ROLE_HIERARCHY[user.orgRole] ?? 0;
      const reqLevel  = ROLE_HIERARCHY[opts.requiredRole] ?? 0;
      if (userLevel < reqLevel) {
        return forbidden(`Requires ${opts.requiredRole} role or higher`);
      }
    }

    // Plan check (returns 402 Payment Required)
    if (opts.requiredPlan) {
      const userPlanLevel = PLAN_HIERARCHY[user.plan] ?? 0;
      const reqPlanLevel  = PLAN_HIERARCHY[opts.requiredPlan] ?? 0;
      if (userPlanLevel < reqPlanLevel) {
        return NextResponse.json(
          { success: false, error: `This feature requires ${opts.requiredPlan} plan or higher` },
          { status: 402 }
        );
      }
    }

    return handler(req, { ...ctx, user, organizationId: user.organizationId });
  };
}
