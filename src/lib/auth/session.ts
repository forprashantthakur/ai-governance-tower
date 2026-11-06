/**
 * Browser sessions.
 *
 * The session JWT lives only in an HttpOnly cookie, so page scripts (and any
 * injected script) can't read or copy it. Browsers send the cookie with every
 * same-origin request; non-browser clients may still send
 * `Authorization: Bearer <token>`.
 *
 * Edge-safe: used by the middleware as well as route handlers.
 */
import { decodeJwt } from "jose";
import type { NextRequest, NextResponse } from "next/server";
import { extractBearerToken } from "./jwt";

export const SESSION_COOKIE = "auth_token";
const FALLBACK_MAX_AGE = 60 * 60 * 24; // matches the default 24h token lifetime

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

/** Puts the session token in an HttpOnly cookie that expires with the token. */
export function setSessionCookie(res: NextResponse, token: string): NextResponse {
  let maxAge = FALLBACK_MAX_AGE;
  try {
    const { exp } = decodeJwt(token);
    if (typeof exp === "number") maxAge = Math.max(0, exp - Math.floor(Date.now() / 1000));
  } catch {
    // keep the fallback
  }
  res.cookies.set(SESSION_COOKIE, token, cookieOptions(maxAge));
  return res;
}

export function clearSessionCookie(res: NextResponse): NextResponse {
  res.cookies.set(SESSION_COOKIE, "", cookieOptions(0));
  return res;
}

const JWT_SHAPE = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

/**
 * The session token for a request and where it came from. A well-formed
 * Bearer header wins; otherwise the session cookie is used.
 */
export function getRequestToken(req: NextRequest): { token: string; source: "header" | "cookie" } | null {
  const header = extractBearerToken(req.headers.get("authorization"));
  if (header && JWT_SHAPE.test(header)) return { token: header, source: "header" };
  const cookie = req.cookies.get(SESSION_COOKIE)?.value;
  if (cookie && JWT_SHAPE.test(cookie)) return { token: cookie, source: "cookie" };
  return null;
}

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function hostOf(url: string): string | null {
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * True for a state-changing request that another site made the browser send
 * (cross-site request forgery). Cookie-authenticated requests must come from
 * our own pages; SameSite=Lax already blocks most of these, this is the
 * second layer.
 */
export function isCrossSiteRequest(req: NextRequest): boolean {
  if (!UNSAFE_METHODS.has(req.method.toUpperCase())) return false;

  const fetchSite = req.headers.get("sec-fetch-site");
  if (fetchSite) return fetchSite !== "same-origin" && fetchSite !== "none";

  const ownHosts = [req.headers.get("host"), req.headers.get("x-forwarded-host"), req.nextUrl?.host]
    .filter((h): h is string => !!h)
    .map((h) => h.toLowerCase());

  const origin = req.headers.get("origin");
  if (origin && origin !== "null") {
    const host = hostOf(origin);
    return !host || !ownHosts.includes(host);
  }
  if (origin === "null") return true;

  const referer = req.headers.get("referer");
  if (referer) {
    const host = hostOf(referer);
    return !host || !ownHosts.includes(host);
  }
  // No browser provenance headers at all: not a browser-initiated cross-site request.
  return false;
}
