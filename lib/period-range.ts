/** ISO calendar date YYYY-MM-DD (UTC-naive; compared as strings). */

export type ISODateString = string;

export function isValidISODateString(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const t = Date.parse(`${s}T12:00:00.000Z`);
  return !Number.isNaN(t);
}

export function compareISODate(a: ISODateString, b: ISODateString): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

export function quarterIndex(m: number): 1 | 2 | 3 | 4 | null {
  if (m >= 1 && m <= 3) return 1;
  if (m >= 4 && m <= 6) return 2;
  if (m >= 7 && m <= 9) return 3;
  if (m >= 10 && m <= 12) return 4;
  return null;
}

/** Inclusive quarter bounds in ISO date strings. */
export function calendarQuarterRange(
  year: number,
  quarter: 1 | 2 | 3 | 4,
): { from: ISODateString; to: ISODateString } {
  const starts: Record<1 | 2 | 3 | 4, `${number}-${string}-${string}`> = {
    1: `${year}-01-01`,
    2: `${year}-04-01`,
    3: `${year}-07-01`,
    4: `${year}-10-01`,
  };
  const ends: Record<1 | 2 | 3 | 4, `${number}-${string}-${string}`> = {
    1: `${year}-03-31`,
    2: `${year}-06-30`,
    3: `${year}-09-30`,
    4: `${year}-12-31`,
  };
  return { from: starts[quarter], to: ends[quarter] };
}

export function formatQuarterLabel(year: number, quarter: 1 | 2 | 3 | 4): string {
  return `Q${quarter} · ${year}`;
}

export function describePeriodRange(
  from: ISODateString,
  to: ISODateString,
): string {
  return `${from} → ${to}`;
}

export function encompassingRange(
  periods: readonly { from: ISODateString; to: ISODateString }[],
): { from: ISODateString; to: ISODateString } | null {
  if (periods.length === 0) return null;
  let from = periods[0].from;
  let to = periods[0].to;
  for (let i = 1; i < periods.length; i++) {
    const p = periods[i];
    if (compareISODate(p.from, from) < 0) from = p.from;
    if (compareISODate(p.to, to) > 0) to = p.to;
  }
  return { from, to };
}

/** Quarters for UI: given years, Q1–Q4 each, sorted by start date. */
export function quarterPresetsForYears(
  years: readonly number[],
): { key: string; label: string; from: ISODateString; to: ISODateString }[] {
  const out: {
    key: string;
    label: string;
    from: ISODateString;
    to: ISODateString;
  }[] = [];
  for (const y of years) {
    for (const q of [1, 2, 3, 4] as const) {
      const { from, to } = calendarQuarterRange(y, q);
      out.push({
        key: `${y}-Q${q}`,
        label: formatQuarterLabel(y, q),
        from,
        to,
      });
    }
  }
  return out.sort((a, b) => compareISODate(a.from, b.from));
}
