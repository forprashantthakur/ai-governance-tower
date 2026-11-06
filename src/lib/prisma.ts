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
  retries = 2,
  delayMs = 500
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastErr = err;
      // Retry only when the database was never reached (cold start), so a
      // write that may already have been applied is never sent twice.
      const code = (err as { code?: unknown } | null)?.code;
      const msg = err instanceof Error ? err.message : String(err);
      const isConnErr =
        code === "P1001" ||
        code === "P1002" ||
        code === "P1017" ||
        /\bP100[12]\b|ECONNREFUSED|Can't reach database server/.test(msg);
      if (i < retries - 1 && isConnErr) {
        await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}
