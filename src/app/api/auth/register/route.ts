import { NextRequest } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { signJwt } from "@/lib/auth/jwt";
import { created, badRequest, conflict, notFound, serverError } from "@/lib/api-response";
import { logAudit, getClientIp } from "@/lib/audit-logger";
import { sendVerificationEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

// Org slug: lowercase alphanumeric + hyphens
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = base;
  let i = 0;
  while (await prisma.organization.findUnique({ where: { slug } })) {
    slug = `${base}-${++i}`;
  }
  return slug;
}

// ── Path 1: New org self-registration ─────────────────────────────────────────

const NewOrgSchema = z.object({
  name:         z.string().min(2).max(100),
  email:        z.string().email(),
  password:     z.string()
                  .min(8)
                  .regex(
                    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
                    "Password must contain uppercase, lowercase, number and special character"
                  ),
  department:   z.string().optional(),
  orgName:      z.string().min(2).max(200),
});

// ── Path 2: Accept an invite and join existing org ────────────────────────────

const AcceptInviteSchema = z.object({
  inviteToken:  z.string().uuid(),
  name:         z.string().min(2).max(100),
  password:     z.string()
                  .min(8)
                  .regex(
                    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
                    "Password must contain uppercase, lowercase, number and special character"
                  ),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // ── Invite-based registration ──────────────────────────────────────────────
    if (body.inviteToken) {
      const parsed = AcceptInviteSchema.safeParse(body);
      if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

      const { inviteToken, name, password } = parsed.data;

      // Validate invite
      const invite = await prisma.organizationInvite.findUnique({
        where: { token: inviteToken },
        include: { organization: true },
      });

      if (!invite) return notFound("Invite");
      if (invite.status !== "PENDING") return badRequest("This invite has already been used or expired");
      if (invite.expiresAt < new Date()) {
        await prisma.organizationInvite.update({ where: { token: inviteToken }, data: { status: "EXPIRED" } });
        return badRequest("This invite has expired");
      }

      // Check if user already exists (existing user joining new org)
      let user = await prisma.user.findUnique({ where: { email: invite.email.toLowerCase() } });

      if (!user) {
        // New user — create account
        const passwordHash = await hashPassword(password);
        user = await prisma.user.create({
          data: {
            name,
            email: invite.email.toLowerCase(),
            passwordHash,
            emailVerified: true, // invite email = email verified
          },
        });
      }

      // Check not already a member
      const existing = await prisma.organizationMember.findUnique({
        where: { organizationId_userId: { organizationId: invite.organizationId, userId: user.id } },
      });
      if (existing) return conflict("Already a member of this organization");

      // Create membership + mark invite accepted
      const [membership] = await prisma.$transaction([
        prisma.organizationMember.create({
          data: { organizationId: invite.organizationId, userId: user.id, role: invite.role },
        }),
        prisma.organizationInvite.update({
          where: { token: inviteToken },
          data: { status: "ACCEPTED", acceptedAt: new Date() },
        }),
      ]);

      const token = await signJwt({
        userId: user.id,
        email: user.email,
        name: user.name,
        organizationId: membership.organizationId,
        orgRole: membership.role,
        plan: invite.organization.plan,
      });

      await logAudit({
        userId: user.id,
        action: "CREATE",
        resource: "OrganizationMember",
        resourceId: membership.id,
        ipAddress: getClientIp(req),
      });

      return created({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: membership.role,
          organizationId: membership.organizationId,
          organization: {
            id: invite.organizationId,
            name: invite.organization.name,
            slug: invite.organization.slug,
            plan: invite.organization.plan,
          },
        },
      });
    }

    // ── New org self-registration ─────────────────────────────────────────────
    const parsed = NewOrgSchema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const { name, email, password, department, orgName } = parsed.data;

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (existingUser) return conflict("Email already registered");

    const passwordHash = await hashPassword(password);
    const slug = await uniqueSlug(slugify(orgName));

    // 14-day trial
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    // Generate email verification token (24h expiry)
    const verificationToken = randomBytes(32).toString("hex");
    const verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Create user + org + membership in one transaction
    const [user, org] = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          name,
          email: email.toLowerCase(),
          passwordHash,
          department,
          emailVerified: false,
          verificationToken,
          verificationTokenExpiresAt,
        },
      });
      const o = await tx.organization.create({
        data: {
          name: orgName,
          slug,
          plan: "TRIAL",
          planExpiresAt: trialEndsAt,
          billingEmail: email.toLowerCase(),
        },
      });
      await tx.organizationMember.create({
        data: { organizationId: o.id, userId: u.id, role: "OWNER" },
      });
      return [u, o];
    });

    await logAudit({
      userId: user.id,
      action: "CREATE",
      resource: "Organization",
      resourceId: org.id,
      ipAddress: getClientIp(req),
    });

    // Send verification email (non-blocking — don't fail registration if email fails)
    try {
      await sendVerificationEmail(user.email, user.name, verificationToken);
    } catch (emailErr) {
      console.error("[register] Failed to send verification email:", emailErr);
    }

    return created({
      requiresEmailVerification: true,
      email: user.email,
      message: "Account created. Please check your email to verify your account before signing in.",
    });
  } catch (err) {
    return serverError(err);
  }
}
