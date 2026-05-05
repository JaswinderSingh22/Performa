export function formatIsoDate(iso: string): string {
  // Input is expected to be ISO or yyyy-mm-dd; return yyyy-mm-dd deterministically.
  const s = iso.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : iso;
}

export function formatIsoDateRange(fromIso: string, toIso: string): string {
  const a = formatIsoDate(fromIso);
  const b = formatIsoDate(toIso);
  return a === b ? a : `${a} – ${b}`;
}

