/**
 * Unit tests — src/lib/rate-limit.ts, Redis path (shared counters).
 */
const store = new Map<string, { value: number; ttl: number }>();
const mockExpire = jest.fn(async (key: string, sec: number) => {
  const e = store.get(key);
  if (e) e.ttl = sec;
  return 1;
});
let dropTtlOnce = false;

function multi() {
  const ops: Array<() => unknown> = [];
  const chain = {
    set(key: string, _v: string, _ex: string, sec: number, _nx: string) {
      ops.push(() => (store.has(key) ? null : (store.set(key, { value: 0, ttl: sec }), "OK")));
      return chain;
    },
    incrby(key: string, by: number) {
      ops.push(() => {
        const e = store.get(key) ?? { value: 0, ttl: -1 };
        e.value += by;
        if (dropTtlOnce) { e.ttl = -1; dropTtlOnce = false; } // simulate a key recreated without TTL
        store.set(key, e);
        return e.value;
      });
      return chain;
    },
    ttl(key: string) {
      ops.push(() => store.get(key)?.ttl ?? -2);
      return chain;
    },
    async exec() {
      return ops.map((op) => [null, op()]);
    },
  };
  return chain;
}

jest.mock("@/lib/redis", () => ({
  redis: { multi: () => multi(), expire: (k: string, s: number) => mockExpire(k, s), del: async (k: string) => store.delete(k) },
}));
jest.mock("@/lib/audit-logger", () => ({ getClientIp: () => "198.51.100.7" }));

import { consume, isOverLimit, resetLimit } from "@/lib/rate-limit";

beforeEach(() => {
  store.clear();
  mockExpire.mockClear();
  process.env.REDIS_URL = "redis://test";
});
afterAll(() => {
  delete process.env.REDIS_URL;
});

describe("rate limits with Redis", () => {
  it("counts hits in Redis and blocks past the limit", async () => {
    for (let i = 0; i < 3; i++) expect((await consume("k1", 3, 60)).allowed).toBe(true);
    const fourth = await consume("k1", 3, 60);
    expect(fourth.allowed).toBe(false);
    expect(fourth.retryAfterSec).toBe(60);
    expect(store.get("rl:k1")?.value).toBe(4);
  });

  it("isOverLimit doesn't add a hit", async () => {
    await consume("k2", 2, 60);
    expect((await isOverLimit("k2", 2, 60)).allowed).toBe(true);
    expect(store.get("rl:k2")?.value).toBe(1);
  });

  it("repairs a counter that lost its expiry, so it can't block forever", async () => {
    dropTtlOnce = true;
    await consume("k3", 5, 900);
    expect(mockExpire).toHaveBeenCalledWith("rl:k3", 900);
    expect(store.get("rl:k3")?.ttl).toBe(900);
  });

  it("resetLimit deletes the shared counter", async () => {
    await consume("k4", 1, 60);
    await resetLimit("k4");
    expect(store.has("rl:k4")).toBe(false);
    expect((await consume("k4", 1, 60)).allowed).toBe(true);
  });
});
