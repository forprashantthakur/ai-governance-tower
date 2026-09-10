/**
 * Unit tests — src/lib/api-response.ts
 * Tests every response helper + edge cases.
 */

import {
  ok,
  created,
  noContent,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  serverError,
} from "@/lib/api-response";

// ─── Helpers ───────────────────────────────────────────────────────────────
async function body(res: Response) {
  return res.json();
}

// ─── ok() ──────────────────────────────────────────────────────────────────
describe("ok()", () => {
  it("returns HTTP 200 with success:true and data", async () => {
    const res = ok({ id: 1 });
    expect(res.status).toBe(200);
    const json = await body(res);
    expect(json).toEqual({ success: true, data: { id: 1 } });
  });

  it("includes meta when provided", async () => {
    const res = ok({ id: 1 }, { page: 1, total: 100 });
    const json = await body(res);
    expect(json.meta).toEqual({ page: 1, total: 100 });
  });

  it("omits meta key when meta is undefined", async () => {
    const res = ok({ id: 1 }, undefined);
    const json = await body(res);
    expect(json).not.toHaveProperty("meta");
  });

  it("accepts custom status code", async () => {
    const res = ok({ ok: true }, undefined, 202);
    expect(res.status).toBe(202);
  });

  it("handles null data", async () => {
    const res = ok(null);
    const json = await body(res);
    expect(json).toEqual({ success: true, data: null });
  });

  it("handles array data", async () => {
    const res = ok([1, 2, 3]);
    const json = await body(res);
    expect(json.data).toEqual([1, 2, 3]);
  });

  it("handles empty object", async () => {
    const res = ok({});
    const json = await body(res);
    expect(json.data).toEqual({});
  });
});

// ─── created() ─────────────────────────────────────────────────────────────
describe("created()", () => {
  it("returns HTTP 201", async () => {
    const res = created({ id: "abc" });
    expect(res.status).toBe(201);
  });

  it("wraps data in success envelope", async () => {
    const res = created({ name: "test" });
    const json = await body(res);
    expect(json).toEqual({ success: true, data: { name: "test" } });
  });
});

// ─── noContent() ───────────────────────────────────────────────────────────
describe("noContent()", () => {
  it("returns HTTP 204 with no body", () => {
    const res = noContent();
    expect(res.status).toBe(204);
    expect(res.body).toBeNull();
  });
});

// ─── badRequest() ──────────────────────────────────────────────────────────
describe("badRequest()", () => {
  it("returns HTTP 400 with error message", async () => {
    const res = badRequest("Invalid input");
    expect(res.status).toBe(400);
    const json = await body(res);
    expect(json).toEqual({ success: false, error: "Invalid input" });
  });

  it("includes details when provided", async () => {
    const details = { field: "email", msg: "required" };
    const res = badRequest("Validation failed", details);
    const json = await body(res);
    expect(json.details).toEqual(details);
  });

  it("omits details key when details is undefined", async () => {
    const res = badRequest("Missing field");
    const json = await body(res);
    expect(json).not.toHaveProperty("details");
  });

  it("includes details when details is 0 (falsy but defined)", async () => {
    const res = badRequest("Bad", 0);
    const json = await body(res);
    expect(json).toHaveProperty("details", 0);
  });

  it("handles empty string message", async () => {
    const res = badRequest("");
    const json = await body(res);
    expect(json.error).toBe("");
    expect(json.success).toBe(false);
  });

  it("handles very long error messages", async () => {
    const longMsg = "x".repeat(10_000);
    const res = badRequest(longMsg);
    const json = await body(res);
    expect(json.error).toHaveLength(10_000);
  });
});

// ─── unauthorized() ────────────────────────────────────────────────────────
describe("unauthorized()", () => {
  it("returns HTTP 401 with default message", async () => {
    const res = unauthorized();
    expect(res.status).toBe(401);
    const json = await body(res);
    expect(json).toEqual({ success: false, error: "Unauthorized" });
  });

  it("accepts custom message", async () => {
    const res = unauthorized("Token expired");
    const json = await body(res);
    expect(json.error).toBe("Token expired");
  });
});

// ─── forbidden() ───────────────────────────────────────────────────────────
describe("forbidden()", () => {
  it("returns HTTP 403 with default message", async () => {
    const res = forbidden();
    expect(res.status).toBe(403);
    const json = await body(res);
    expect(json).toEqual({ success: false, error: "Forbidden" });
  });

  it("accepts custom message", async () => {
    const res = forbidden("Admin only");
    const json = await body(res);
    expect(json.error).toBe("Admin only");
  });
});

// ─── notFound() ────────────────────────────────────────────────────────────
describe("notFound()", () => {
  it("returns HTTP 404 with default resource name", async () => {
    const res = notFound();
    expect(res.status).toBe(404);
    const json = await body(res);
    expect(json).toEqual({ success: false, error: "Resource not found" });
  });

  it("interpolates custom resource name", async () => {
    const res = notFound("Model");
    const json = await body(res);
    expect(json.error).toBe("Model not found");
  });

  it("handles empty resource name", async () => {
    const res = notFound("");
    const json = await body(res);
    expect(json.error).toBe(" not found");
  });
});

// ─── conflict() ────────────────────────────────────────────────────────────
describe("conflict()", () => {
  it("returns HTTP 409", async () => {
    const res = conflict("Email already exists");
    expect(res.status).toBe(409);
    const json = await body(res);
    expect(json).toEqual({ success: false, error: "Email already exists" });
  });
});

// ─── serverError() ─────────────────────────────────────────────────────────
describe("serverError()", () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    Object.assign(process.env, { NODE_ENV: originalEnv });
  });

  it("returns HTTP 500", async () => {
    const res = serverError(new Error("boom"));
    expect(res.status).toBe(500);
  });

  it("hides error details in non-development environment", async () => {
    // Jest runs with NODE_ENV=test — the function returns the generic message
    // because only NODE_ENV==="development" exposes details
    const res = serverError(new Error("secret DB error"));
    const json = await body(res);
    expect(json.error).toBe("Internal server error");
  });

  it("exposes error message in development", async () => {
    Object.assign(process.env, { NODE_ENV: "development" });
    const res = serverError(new Error("secret DB error"));
    const json = await body(res);
    expect(json.error).toBe("secret DB error");
  });

  it("handles non-Error thrown values (string)", async () => {
    Object.assign(process.env, { NODE_ENV: "development" });
    const res = serverError("something went wrong");
    const json = await body(res);
    // Non-Error → falls back to generic message even in dev
    expect(json.error).toBe("Internal server error");
  });

  it("handles null thrown value", async () => {
    const res = serverError(null);
    expect(res.status).toBe(500);
  });

  it("handles undefined thrown value", async () => {
    const res = serverError(undefined);
    expect(res.status).toBe(500);
  });
});
