import { NextResponse } from "next/server";

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiError {
  success: false;
  error: string;
  details?: unknown;
}

export function ok<T>(
  data: T,
  meta?: Record<string, unknown>,
  status = 200
): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ success: true, data, ...(meta && { meta }) }, { status });
}

export function created<T>(data: T): NextResponse<ApiSuccess<T>> {
  return ok(data, undefined, 201);
}

export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

export function badRequest(message: string, details?: unknown): NextResponse<ApiError> {
  return NextResponse.json(
    { success: false, error: message, ...(details !== undefined && { details }) } as ApiError,
    { status: 400 }
  );
}

export function unauthorized(message = "Unauthorized"): NextResponse<ApiError> {
  return NextResponse.json({ success: false, error: message }, { status: 401 });
}

export function forbidden(message = "Forbidden"): NextResponse<ApiError> {
  return NextResponse.json({ success: false, error: message }, { status: 403 });
}

export function notFound(resource = "Resource"): NextResponse<ApiError> {
  // Accept both notFound("Project") and notFound("Project not found").
  const message = /not found$/i.test(resource) ? resource : `${resource} not found`;
  return NextResponse.json({ success: false, error: message }, { status: 404 });
}

export function conflict(message: string): NextResponse<ApiError> {
  return NextResponse.json({ success: false, error: message }, { status: 409 });
}

export function serverError(err: unknown): NextResponse<ApiError> {
  // Map well-known client-caused failures to 4xx instead of a generic 500.
  if (err instanceof SyntaxError) return badRequest("Request body is not valid JSON");
  const code = (err as { code?: unknown } | null)?.code;
  if (code === "P2025") return notFound();
  if (code === "P2002") return conflict("A record with these values already exists");
  if (code === "P2003") return badRequest("A referenced record does not exist");

  const message =
    process.env.NODE_ENV === "development" && err instanceof Error
      ? err.message
      : "Internal server error";
  console.error("[API Error]", err);
  return NextResponse.json({ success: false, error: message }, { status: 500 });
}
