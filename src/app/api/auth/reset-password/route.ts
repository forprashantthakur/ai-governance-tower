import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, badRequest, serverError } from "@/lib/api-response";
import { hashPassword } from "@/lib/auth/password";
import { clearPasswordLockout, limitByIp } from "@/lib/rate-limit";
import { rejectCrossSiteAuthRequest } from "@/lib/auth/session";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const Schema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain an uppercase letter")
    .regex(/[0-9]/, "Must contain a number"),
});

export async function POST(req: NextRequest) {
  try {
    // A new password changes the session fingerprint, which signs out every
    // existing session for the account (see lib/auth/fingerprint.ts).
    const refused = rejectCrossSiteAuthRequest(req, { requireJson: true });
    if (refused) return refused;
    const limited = await limitByIp(req, "reset-password", 20, 60 * 60);
    if (limited) return limited;
    const body = await req.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

    const { token, password } = parsed.data;

    const record = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      return badRequest("This reset link is invalid or has expired. Please request a new one.");
    }

    const passwordHash = await hashPassword(password);

    // Update password and mark token as used in one transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);

    // The owner proved access to the mailbox: lift any sign-in lockout.
    await clearPasswordLockout(req, record.user.email);

    return ok({ message: "Password updated successfully. You can now sign in." });
  } catch (err) {
    return serverError(err);
  }
}
