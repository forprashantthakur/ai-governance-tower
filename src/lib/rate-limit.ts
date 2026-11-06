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
    const ttl = Number(res[2]?.[1]);
    if (!Number.isFinite(count)) return null;
    return { count, ttl: ttl > 0 ? ttl : windowSec };
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

/** Test hook: forget all in-memory counters. */
export function _resetMemoryLimits() {
  memory.clear();
}
