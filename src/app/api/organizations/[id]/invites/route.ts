import { NextRequest } from "next/server";
import { z } from "zod";
import { OrgMemberRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/with-auth";
import { ok, created, badRequest, forbidden, serverError } from "@/lib/api-response";
import { logAudit, getClientIp } from "@/lib/audit-logger";

export const dynamic = "force-dynamic";

const InviteSchema = z.object({
  email: z.string().email(),
  role: z.nativeEnum(OrgMemberRole).default("VIEWER"),
});

// POST /api/organizations/[id]/invites — send an invite (ADMIN+ only)
export const POST = withAuth(async (req: NextRequest, { params, user, organizationId }) => {
  try {
    // Only allow inviting to the caller's own org
    if (params.id !== organizationId) {
      return forbidden("Cannot invite to another organization");
    }

    const body = await req.json();
    const parsed = InviteSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const { email, role } = parsed.data;

    // Check org user limit
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: { _count: { select: { members: true } } },
    });
    if (!org) return badRequest("Organization not found");

    if (org._count.members >= org.maxUsers) {
      return badRequest(`User limit reached (${org.maxUsers}). Upgrade your plan to invite more users.`);
    }

    // Check if already a member
    const existingUser = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existingUser) {
      const existingMember = await prisma.organizationMember.findUnique({
        where: { organizationId_userId: { organizationId, userId: existingUser.id } },
      });
      if (existingMember) return badRequest("This user is already a member of the organization");
    }

    // Check for existing pending invite
    const existingInvite = await prisma.organizationInvite.findFirst({
      where: { organizationId, email: email.toLowerCase(), status: "PENDING" },
    });
    if (existingInvite) return badRequest("A pending invite already exists for this email");

    // Create invite (expires in 7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invite = await prisma.organizationInvite.create({
      data: {
        organizationId,
        email: email.toLowerCase(),
        role,
        invitedBy: user.userId,
        expiresAt,
      },
    });

    await logAudit({
      userId: user.userId,
      organizationId,
      action: "CREATE",
      resource: "OrganizationInvite",
      resourceId: invite.id,
      after: { email, role },
      ipAddress: getClientIp(req),
    });

    // TODO Phase 2: Send invite email via Resend
    // await sendInviteEmail({ to: email, inviteToken: invite.token, orgName: org.name, role });

    return created({
      invite: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        token: invite.token,
        expiresAt: invite.expiresAt,
        status: invite.status,
      },
      message: "Invite created. Share the invite link with the user.",
      inviteUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/invite/${invite.token}`,
    });
  } catch (err) {
    return serverError(err);
  }
}, "ADMIN");

// GET /api/organizations/[id]/invites — list invites (ADMIN+)
export const GET = withAuth(async (_req: NextRequest, { params, organizationId }) => {
  try {
    if (params.id !== organizationId) {
      return forbidden("Cannot view invites for another organization");
    }

    const invites = await prisma.organizationInvite.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
    });

    return ok(invites);
  } catch (err) {
    return serverError(err);
  }
}, "ADMIN");
