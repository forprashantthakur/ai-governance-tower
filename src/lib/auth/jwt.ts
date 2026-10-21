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

// Only ever used outside production (local dev and tests). Any deployed
// build runs with NODE_ENV=production and must provide JWT_SECRET.
const DEV_ONLY_SECRET = "dev-only-insecure-jwt-secret-do-not-deploy";
const MIN_SECRET_LENGTH = 32;

let cachedKey: Uint8Array | null = null;

function getSigningKey(): Uint8Array {
  if (cachedKey) return cachedKey;
  const configured = process.env.JWT_SECRET;
  if (configured && configured.length >= MIN_SECRET_LENGTH) {
    cachedKey = new TextEncoder().encode(configured);
    return cachedKey;
  }
  // Any deployed environment (production build, or any Vercel deployment) must configure it.
  if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
    // Fail closed: never sign or accept tokens with a guessable key.
    throw new Error(
      `JWT_SECRET must be set to at least ${MIN_SECRET_LENGTH} characters in production`
    );
  }
  cachedKey = new TextEncoder().encode(configured || DEV_ONLY_SECRET);
  return cachedKey;
}

const ALGORITHM = "HS256";
const DEFAULT_EXPIRY = "24h";

export async function signJwt(payload: Omit<JwtUserPayload, keyof JWTPayload>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_EXPIRES_IN ?? DEFAULT_EXPIRY)
    .setIssuer("ai-governance-tower")
    .setAudience("ai-governance-tower-client")
    .sign(getSigningKey());
}

export async function verifyJwt(token: string): Promise<JwtUserPayload> {
  const { payload } = await jwtVerify(token, getSigningKey(), {
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
