export function embedEmployeeName(
  rel: { name: string } | { name: string }[] | null | undefined,
  fallback = "Employee",
): string {
  if (!rel) return fallback;
  if (Array.isArray(rel)) {
    const n = rel[0]?.name;
    return typeof n === "string" && n.trim() ? n : fallback;
  }
  return rel.name?.trim() ? rel.name : fallback;
}
