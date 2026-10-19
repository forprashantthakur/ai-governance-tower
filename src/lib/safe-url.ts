/**
 * URL helpers safe to use on both server and client.
 *
 * `z.string().url()` accepts any scheme that `new URL()` parses, including
 * `javascript:` and `data:`. User-supplied links that end up in an `href`
 * must be restricted to http(s).
 */
import { z } from "zod";

export function isHttpUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** zod schema for a user-supplied http(s) link. */
export const httpUrl = (message = "Must be an http(s) URL") =>
  z.string().max(2048).refine(isHttpUrl, { message });

/** Use when rendering a stored link: returns undefined for anything that isn't http(s). */
export function safeHref(value: string | null | undefined): string | undefined {
  return isHttpUrl(value) ? (value as string) : undefined;
}

/** Escape text for interpolation into HTML (emails, print windows). */
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
