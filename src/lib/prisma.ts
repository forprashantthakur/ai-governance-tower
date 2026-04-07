import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Retry wrapper to handle Neon cold starts (P1001/P1002 connection errors)
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 1500
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      const isConnErr =
        msg.includes("P1001") ||
        msg.includes("P1002") ||
        msg.includes("connect") ||
        msg.includes("ECONNREFUSED") ||
        msg.includes("timeout");
      if (i < retries - 1 && isConnErr) {
        await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}
