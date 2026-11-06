import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, badRequest } from "@/lib/api-response";
import { limitByIp } from "@/lib/rate-limit";
import { rejectCrossSiteAuthRequest } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  // Limits account enumeration.
  const refused = rejectCrossSiteAuthRequest(req, { requireJson: true });
  if (refused) return refused;
  const limited = await limitByIp(req, "check-email", 30, 15 * 60);
  if (limited) return limited;
  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : null;
  if (!email) return badRequest("Email is required");
  const user = await prisma.user.findUnique({ where: { email } });
  return ok({ available: !user });
}
