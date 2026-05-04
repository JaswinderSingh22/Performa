/**
 * Validates `next` after OAuth redirects (prevents open redirects).
 */
export function safeNextPath(
  raw: string | null,
  fallback: string = "/dashboard",
): string {
  if (!raw?.length) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//")) return fallback;
  if (raw.includes("\\")) return fallback;
  return raw;
}
