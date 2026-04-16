import { NextRequest, NextResponse } from "next/server";
import { OrgMemberRole, PlanTier } from "@prisma/client";
import { verifyJwt, extractBearerToken, type JwtUserPayload } from "./auth/jwt";
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
    const token = extractBearerToken(req.headers.get("authorization"));
    if (!token) return unauthorized("No token provided");

    let user: JwtUserPayload;
    try {
      user = await verifyJwt(token);
    } catch {
      return unauthorized("Invalid or expired token");
    }

    // Every valid JWT must carry organizationId (new tokens after SaaS migration)
    // Tokens issued before migration lack this field — reject them so users re-login.
    if (!user.organizationId) {
      return unauthorized("Session expired — please sign in again");
    }

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
