import type { OrgMemberRole, PlanTier } from "@prisma/client";
import { signJwt } from "./jwt";
import { sessionFingerprint } from "./fingerprint";

/** Signs a session token for a user in one organization (Node runtime only). */
export function signSessionToken(args: {
  user: { id: string; email: string; name: string; passwordHash: string };
  organizationId: string;
  orgRole: OrgMemberRole;
  plan: PlanTier;
}): Promise<string> {
  return signJwt({
    userId: args.user.id,
    email: args.user.email,
    name: args.user.name,
    organizationId: args.organizationId,
    orgRole: args.orgRole,
    plan: args.plan,
    sv: sessionFingerprint(args.user.passwordHash),
  });
}
