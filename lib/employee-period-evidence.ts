import type { ISODateString } from "@/lib/period-range";

export function achievementAnchorDate(row: {
  achievement_date: string | null;
  created_at: string;
}): string {
  return row.achievement_date && row.achievement_date.trim().length > 0
    ? row.achievement_date.slice(0, 10)
    : row.created_at.slice(0, 10);
}

export function achievementInPeriod(
  row: {
    achievement_date: string | null;
    created_at: string;
  },
  from: ISODateString,
  to: ISODateString,
): boolean {
  const anchor = achievementAnchorDate(row);
  return anchor >= from && anchor <= to;
}

export function noteInPeriod(
  row: { created_at: string },
  from: ISODateString,
  to: ISODateString,
): boolean {
  const d = row.created_at.slice(0, 10);
  return d >= from && d <= to;
}
