/**
 * Unit tests — src/lib/auth/password.ts
 * Tests hashPassword and verifyPassword.
 */

import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("hashPassword()", () => {
  jest.setTimeout(30_000); // bcrypt is slow
  it("returns a string hash", async () => {
    const hash = await hashPassword("mypassword");
    expect(typeof hash).toBe("string");
  });

  it("produces a bcrypt hash (starts with $2b$)", async () => {
    const hash = await hashPassword("mypassword");
    expect(hash).toMatch(/^\$2[ab]\$/);
  });

  it("hashing the same password twice gives different hashes (salt)", async () => {
    const hash1 = await hashPassword("samepassword");
    const hash2 = await hashPassword("samepassword");
    expect(hash1).not.toBe(hash2);
  });

  it("handles empty string password", async () => {
    const hash = await hashPassword("");
    expect(typeof hash).toBe("string");
    expect(hash.length).toBeGreaterThan(0);
  });

  it("handles very long password (1000 chars)", async () => {
    const longPass = "x".repeat(1000);
    const hash = await hashPassword(longPass);
    expect(hash).toMatch(/^\$2[ab]\$/);
  });

  it("handles unicode/emoji passwords", async () => {
    const hash = await hashPassword("🔐パスワード密码");
    expect(hash).toMatch(/^\$2[ab]\$/);
  });

  it("handles passwords with special characters", async () => {
    const specialPass = "p@$$w0rd!#%^&*()[]{}|<>";
    const hash = await hashPassword(specialPass);
    expect(hash).toMatch(/^\$2[ab]\$/);
  });
});

describe("verifyPassword()", () => {
  jest.setTimeout(30_000); // bcrypt is slow
  it("returns true for matching password and hash", async () => {
    const hash = await hashPassword("correct-password");
    const result = await verifyPassword("correct-password", hash);
    expect(result).toBe(true);
  });

  it("returns false for wrong password", async () => {
    const hash = await hashPassword("correct-password");
    const result = await verifyPassword("wrong-password", hash);
    expect(result).toBe(false);
  });

  it("returns false for empty password against non-empty hash", async () => {
    const hash = await hashPassword("correct-password");
    const result = await verifyPassword("", hash);
    expect(result).toBe(false);
  });

  it("returns false for case-mismatch", async () => {
    const hash = await hashPassword("Password");
    const result = await verifyPassword("password", hash);
    expect(result).toBe(false);
  });

  it("returns false for leading/trailing space mismatch", async () => {
    const hash = await hashPassword("password");
    const result = await verifyPassword(" password", hash);
    expect(result).toBe(false);
  });

  it("handles unicode passwords correctly", async () => {
    const pass = "こんにちは世界";
    const hash = await hashPassword(pass);
    expect(await verifyPassword(pass, hash)).toBe(true);
    expect(await verifyPassword("hello world", hash)).toBe(false);
  });

  it("does not throw for invalid hash format (returns false)", async () => {
    const result = await verifyPassword("password", "not-a-valid-hash");
    expect(result).toBe(false);
  });
});
