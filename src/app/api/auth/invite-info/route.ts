import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, badRequest, notFound, serverError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

// GET /api/auth/invite-info?token=<uuid>
// Public endpoint — returns invite metadata for the accept-invite page
export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token");
    if (!token) return badRequest("token is required");

    const invite = await prisma.organizationInvite.findUnique({
      where: { token },
      include: { organization: { select: { name: true, plan: true } } },
    });

    if (!invite) return notFound("Invite");
    if (invite.status !== "PENDING") return badRequest("This invite has already been used or revoked");
    if (invite.expiresAt < new Date()) return badRequest("This invite has expired");

    return ok({
      email: invite.email,
      role: invite.role,
      organization: { name: invite.organization.name, plan: invite.organization.plan },
      expiresAt: invite.expiresAt,
      status: invite.status,
    });
  } catch (err) {
    return serverError(err);
  }
}
