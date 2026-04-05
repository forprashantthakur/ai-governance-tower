import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { signJwt } from "@/lib/auth/jwt";
import { created, badRequest, conflict, serverError } from "@/lib/api-response";
import { logAudit, getClientIp } from "@/lib/audit-logger";

export const dynamic = 'force-dynamic';

const RegisterSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z
    .string()
    .min(8)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
      "Password must contain uppercase, lowercase, number and special character"
    ),
  department: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = RegisterSchema.safeParse(body);

    if (!parsed.success) {
      return badRequest("Validation failed", parsed.error.flatten());
    }

    const { name, email, password, department } = parsed.data;

    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existing) return conflict("Email already registered");

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash,
        department,
        role: "VIEWER", // Default role — admin promotes later
      },
      select: { id: true, email: true, name: true, role: true },
    });

    const token = await signJwt({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    await logAudit({
      userId: user.id,
      action: "CREATE",
      resource: "User",
      resourceId: user.id,
      ipAddress: getClientIp(req),
    });

    return created({ token, user });
  } catch (err) {
    return serverError(err);
  }
}
