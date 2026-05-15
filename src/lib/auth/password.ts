import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10; // 10 = ~100ms on Vercel; 12 = ~700ms (unnecessary overhead)

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
