import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { OrgMemberRole, PlanTier } from "@prisma/client";

export interface JwtUserPayload extends JWTPayload {
  userId: string;
  email: string;
  name: string;
  organizationId: string;
  orgRole: OrgMemberRole;
  plan: PlanTier;
}

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "fallback-dev-secret-min-32-chars-!!"
);

const ALGORITHM = "HS256";
const DEFAULT_EXPIRY = "24h";

export async function signJwt(payload: Omit<JwtUserPayload, keyof JWTPayload>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_EXPIRES_IN ?? DEFAULT_EXPIRY)
    .setIssuer("ai-governance-tower")
    .setAudience("ai-governance-tower-client")
    .sign(secret);
}

export async function verifyJwt(token: string): Promise<JwtUserPayload> {
  const { payload } = await jwtVerify(token, secret, {
    issuer: "ai-governance-tower",
    audience: "ai-governance-tower-client",
    algorithms: [ALGORITHM],
  });
  return payload as JwtUserPayload;
}

export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}
