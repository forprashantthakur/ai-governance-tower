import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { verifyJwt, extractBearerToken, type JwtUserPayload } from "./auth/jwt";
import { unauthorized, forbidden } from "./api-response";

type RouteHandler = (
  req: NextRequest,
  ctx: { params: Record<string, string>; user: JwtUserPayload }
) => Promise<NextResponse>;

const ROLE_HIERARCHY: Record<UserRole, number> = {
  ADMIN: 4,
  RISK_OFFICER: 3,
  AUDITOR: 2,
  VIEWER: 1,
};

export function withAuth(
  handler: RouteHandler,
  requiredRole?: UserRole
) {
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

    if (
      requiredRole &&
      ROLE_HIERARCHY[user.role] < ROLE_HIERARCHY[requiredRole]
    ) {
      return forbidden(`Requires ${requiredRole} role or higher`);
    }

    return handler(req, { ...ctx, user });
  };
}
