import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie, rejectCrossSiteAuthRequest } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

// POST /api/auth/logout — the session cookie is HttpOnly, so only the server can remove it.
export async function POST(req: NextRequest) {
  // Other sites can't sign visitors out.
  const refused = rejectCrossSiteAuthRequest(req);
  if (refused) return refused;
  return clearSessionCookie(NextResponse.json({ success: true, data: { signedOut: true } }));
}
