/**
 * The CIO demo lives in a separate organization per user, so customers who
 * load the demo never share an organization (or see each other's members).
 */
export const DEMO_ORG_NAME = "Demo Bank — CIO Walkthrough";
export const DEMO_SLUG_PREFIX = "demo-bank-cio";

export function demoOrgSlugFor(userId: string): string {
  return `${DEMO_SLUG_PREFIX}-${userId}`;
}

/** Slugs users may not claim when registering an organization. */
export function isReservedSlug(slug: string): boolean {
  return slug.startsWith(DEMO_SLUG_PREFIX);
}
