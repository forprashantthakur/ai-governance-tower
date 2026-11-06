/**
 * Fixed-window rate limits for sign-in and other public auth endpoints.
 *
 * With REDIS_URL set, counters live in Redis and are shared by every server
 * instance, so a limit holds platform-wide on serverless. Without Redis (local
 * development, tests) or when Redis is unreachable, each instance keeps its
 * own in-memory counters.
 */
import { NextResponse } from "next/server";
import { redis } from "./redis";
import { getClientIp } from "./audit-logger";

type Window = { count: number; resetAt: number };
const memory = new Map<string, Window>();
const REDIS_TIMEOUT_MS = 400;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("redis timeout")), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

function memoryWindow(key: string, windowSec: number): Window {
  const now = Date.now();
  let w = memory.get(key);
  if (!w || now >= w.resetAt) {
    w = { count: 0, resetAt: now + windowSec * 1000 };
    memory.set(key, w);
  }
  if (memory.size > 50_000) {
    for (const [k, v] of memory) if (now >= v.resetAt) memory.delete(k);
  }
  return w;
}

async function redisAdd(key: string, windowSec: number, by: number): Promise<{ count: number; ttl: number } | null> {
  if (!process.env.REDIS_URL) return null;
  try {
    const res = await withTimeout(
      redis.multi().set(key, "0", "EX", windowSec, "NX").incrby(key, by).ttl(key).exec(),
      REDIS_TIMEOUT_MS
    );
    if (!res) return null;
    const count = Number(res[1]?.[1]);
    let ttl = Number(res[2]?.[1]);
    if (!Number.isFinite(count)) return null;
    if (!(ttl > 0)) {
      // A counter must never outlive its window (e.g. if the key expired
      // between SET NX and INCRBY and was recreated without a TTL).
      await withTimeout(redis.expire(key, windowSec), REDIS_TIMEOUT_MS);
      ttl = windowSec;
    }
    return { count, ttl };
  } catch {
    return null;
  }
}

export interface LimitResult {
  allowed: boolean;
  retryAfterSec: number;
}

/** Counts one hit against `key` and reports whether it is within `limit` per `windowSec`. */
export async function consume(key: string, limit: number, windowSec: number): Promise<LimitResult> {
  const k = `rl:${key}`;
  const shared = await redisAdd(k, windowSec, 1);
  if (shared) return { allowed: shared.count <= limit, retryAfterSec: shared.ttl };
  const w = memoryWindow(k, windowSec);
  w.count += 1;
  return { allowed: w.count <= limit, retryAfterSec: Math.ceil((w.resetAt - Date.now()) / 1000) };
}

/** Reports whether `key` is already over `limit`, without counting a hit. */
export async function isOverLimit(key: string, limit: number, windowSec: number): Promise<LimitResult> {
  const k = `rl:${key}`;
  const shared = await redisAdd(k, windowSec, 0);
  if (shared) return { allowed: shared.count < limit, retryAfterSec: shared.ttl };
  const w = memoryWindow(k, windowSec);
  return { allowed: w.count < limit, retryAfterSec: Math.ceil((w.resetAt - Date.now()) / 1000) };
}

/** Clears a counter (for example failed sign-ins after a successful one). */
export async function resetLimit(key: string): Promise<void> {
  const k = `rl:${key}`;
  memory.delete(k);
  if (!process.env.REDIS_URL) return;
  try {
    await withTimeout(redis.del(k), REDIS_TIMEOUT_MS);
  } catch {
    // counter expires on its own
  }
}

export function tooManyRequests(retryAfterSec: number, message = "Too many attempts. Please wait and try again.") {
  return NextResponse.json(
    { success: false, error: message },
    { status: 429, headers: { "Retry-After": String(Math.max(1, retryAfterSec)) } }
  );
}

/**
 * Per-client-IP limit for a public endpoint. Returns a 429 response when the
 * caller is over the limit, otherwise null.
 */
export async function limitByIp(req: Request, bucket: string, limit: number, windowSec: number) {
  const r = await consume(`${bucket}:ip:${getClientIp(req)}`, limit, windowSec);
  return r.allowed ? null : tooManyRequests(r.retryAfterSec);
}

const noop = async () => undefined;

/**
 * Password-guessing protection for one account, used by sign-in and by
 * invite acceptance for existing accounts.
 *
 * - Per account and client address: 10 attempts per 15 minutes. Counted
 *   before the password is checked, so parallel guesses can't get past it.
 * - Per account from all addresses: 50 attempts per hour, against guessing
 *   spread over many addresses. A successful sign-in or a password reset
 *   clears both account counters.
 * - Per client address, failures only: 50 per 15 minutes, against one address
 *   trying many accounts. Successful sign-ins don't count, so an office
 *   behind one address isn't blocked.
 */
export async function beginPasswordAttempt(req: Request, email: string) {
  const ip = getClientIp(req);
  const account = email.toLowerCase();
  const ipFailKey = `pw-ip-fail:${ip}`;
  const pairKey = `pw:${account}:${ip}`;
  const accountKey = `pw:${account}`;

  const ipState = await isOverLimit(ipFailKey, 50, 15 * 60);
  if (!ipState.allowed) {
    return { blocked: tooManyRequests(ipState.retryAfterSec), succeeded: noop, failed: noop };
  }
  const pair = await consume(pairKey, 10, 15 * 60);
  const acct = await consume(accountKey, 50, 60 * 60);
  if (!pair.allowed || !acct.allowed) {
    const retry = Math.max(pair.allowed ? 0 : pair.retryAfterSec, acct.allowed ? 0 : acct.retryAfterSec);
    return {
      blocked: tooManyRequests(
        retry,
        "Too many sign-in attempts for this account. Try again later, or reset your password to unlock it now."
      ),
      succeeded: noop,
      failed: noop,
    };
  }
  return {
    blocked: null,
    succeeded: async () => {
      await resetLimit(pairKey);
      await resetLimit(accountKey);
    },
    failed: async () => {
      await consume(ipFailKey, 50, 15 * 60);
    },
  };
}

/** Unlocks an account after a password reset (account-wide and for the resetting address). */
export async function clearPasswordLockout(req: Request, email: string) {
  const account = email.toLowerCase();
  await resetLimit(`pw:${account}`);
  await resetLimit(`pw:${account}:${getClientIp(req)}`);
}

/** Test hook: forget all in-memory counters. */
export function _resetMemoryLimits() {
  memory.clear();
}
