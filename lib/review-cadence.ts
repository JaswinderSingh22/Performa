import type { ISODateString } from "@/lib/period-range";
import { compareISODate } from "@/lib/period-range";

export type ReviewCadence = "monthly" | "quarterly" | "mid_year" | "yearly";

export type OrgReviewCycleConfig = {
  reviewCadence: ReviewCadence;
  quarterStartMonth: number;
};

export const REVIEW_CADENCE_LABELS: Record<ReviewCadence, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  mid_year: "Mid-year",
  yearly: "Yearly",
};

/** Last calendar day of month (month is 1–12). */
export function lastDayOfCalendarMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function monthRange(
  year: number,
  month: number,
): { from: ISODateString; to: ISODateString } {
  const m = String(month).padStart(2, "0");
  const ld = lastDayOfCalendarMonth(year, month);
  const last = String(ld).padStart(2, "0");
  return {
    from: `${year}-${m}-01`,
    to: `${year}-${m}-${last}`,
  };
}

export function midYearRange(
  year: number,
  half: 1 | 2,
): { from: ISODateString; to: ISODateString } {
  if (half === 1) {
    return { from: `${year}-01-01`, to: `${year}-06-30` };
  }
  return { from: `${year}-07-01`, to: `${year}-12-31` };
}

export function yearlyRange(year: number): { from: ISODateString; to: ISODateString } {
  return { from: `${year}-01-01`, to: `${year}-12-31` };
}

export function periodKeyMonthly(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function periodKeyQuarterly(year: number, q: 1 | 2 | 3 | 4): string {
  return `${year}-Q${q}`;
}

function normalizeQuarterStartMonth(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 1;
  const rounded = Math.trunc(value);
  if (rounded < 1 || rounded > 12) return 1;
  return rounded;
}

/** Quarter range using org-configurable quarter start month (1-12). */
export function quarterRangeFromStartMonth(
  year: number,
  quarter: 1 | 2 | 3 | 4,
  quarterStartMonth: number,
): { from: ISODateString; to: ISODateString } {
  const startMonth = normalizeQuarterStartMonth(quarterStartMonth);
  const monthOffset = (quarter - 1) * 3;
  const start = new Date(year, startMonth - 1 + monthOffset, 1);
  const end = new Date(year, startMonth - 1 + monthOffset + 3, 0);
  return {
    from: isoFromDate(start),
    to: isoFromDate(end),
  };
}

function quarterForDate(
  date: Date,
  quarterStartMonth: number,
): { year: number; quarter: 1 | 2 | 3 | 4 } {
  const startMonth = normalizeQuarterStartMonth(quarterStartMonth);
  const shiftedMonth =
    ((date.getMonth() + 1 - startMonth + 12) % 12) + 1;
  const quarter = (Math.floor((shiftedMonth - 1) / 3) + 1) as 1 | 2 | 3 | 4;
  const year = date.getMonth() + 1 >= startMonth ? date.getFullYear() : date.getFullYear() - 1;
  return { year, quarter };
}

export function periodKeyMidYear(year: number, half: 1 | 2): string {
  return `${year}-H${half}`;
}

export function periodKeyYearly(year: number): string {
  return String(year);
}

export function parseMonthlyKey(key: string): { year: number; month: number } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(key);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  return { year, month };
}

export function boundsForPeriodKey(
  cadence: ReviewCadence,
  key: string,
  quarterStartMonth = 1,
): { from: ISODateString; to: ISODateString } | null {
  switch (cadence) {
    case "monthly": {
      const p = parseMonthlyKey(key);
      if (!p) return null;
      return monthRange(p.year, p.month);
    }
    case "quarterly": {
      const m = /^(\d{4})-Q([1-4])$/.exec(key);
      if (!m) return null;
      const year = Number(m[1]);
      const q = Number(m[2]) as 1 | 2 | 3 | 4;
      return quarterRangeFromStartMonth(year, q, quarterStartMonth);
    }
    case "mid_year": {
      const m = /^(\d{4})-H([12])$/.exec(key);
      if (!m) return null;
      const year = Number(m[1]);
      const half = Number(m[2]) as 1 | 2;
      return midYearRange(year, half);
    }
    case "yearly": {
      if (!/^\d{4}$/.test(key)) return null;
      const year = Number(key);
      return yearlyRange(year);
    }
    default:
      return null;
  }
}

/**
 * If stored period bounds match a canonical cadence slot, return its period_key.
 */
export function inferPeriodKeyFromBounds(
  cadence: ReviewCadence,
  from: ISODateString,
  to: ISODateString,
  quarterStartMonth = 1,
): string | null {
  const y = Number(from.slice(0, 4));
  switch (cadence) {
    case "monthly": {
      const mo = Number(from.slice(5, 7));
      const r = monthRange(y, mo);
      return r.from === from && r.to === to ? periodKeyMonthly(y, mo) : null;
    }
    case "quarterly": {
      for (const q of [1, 2, 3, 4] as const) {
        const r = quarterRangeFromStartMonth(y, q, quarterStartMonth);
        if (r.from === from && r.to === to) return periodKeyQuarterly(y, q);
      }
      return null;
    }
    case "mid_year": {
      for (const h of [1, 2] as const) {
        const r = midYearRange(y, h);
        if (r.from === from && r.to === to) return periodKeyMidYear(y, h);
      }
      return null;
    }
    case "yearly": {
      const r = yearlyRange(y);
      return r.from === from && r.to === to ? periodKeyYearly(y) : null;
    }
    default:
      return null;
  }
}

export type CadencePreset = {
  key: string;
  label: string;
  from: ISODateString;
  to: ISODateString;
};

/** UI chips for the generator — recent windows only. */
export function cadencePresets(
  cadence: ReviewCadence,
  joinDate: ISODateString | null = null,
  quarterStartMonth = 1,
  now: Date = new Date(),
): CadencePreset[] {
  const cy = now.getFullYear();
  const cm = now.getMonth() + 1;
  const out: CadencePreset[] = [];

  switch (cadence) {
    case "monthly": {
      for (let i = 0; i < 12; i++) {
        const d = new Date(cy, cm - 1 - i, 1);
        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        const { from, to } = monthRange(y, m);
        const key = periodKeyMonthly(y, m);
        out.push({
          key,
          label: d.toLocaleString(undefined, { month: "short", year: "numeric" }),
          from,
          to,
        });
      }
      break;
    }
    case "quarterly": {
      const todayIso = isoFromDate(now);
      const currentQ = quarterForDate(now, quarterStartMonth);
      for (const year of [currentQ.year - 1, currentQ.year] as const) {
        for (const q of [1, 2, 3, 4] as const) {
          const { from, to } = quarterRangeFromStartMonth(
            year,
            q,
            quarterStartMonth,
          );
          if (compareISODate(from, todayIso) > 0) continue;
          out.push({
            key: periodKeyQuarterly(year, q),
            label: `Q${q} · ${year}`,
            from,
            to,
          });
        }
      }
      out.sort((a, b) => compareISODate(a.from, b.from));
      break;
    }
    case "mid_year": {
      const todayIso = isoFromDate(now);
      for (const year of [cy - 1, cy] as const) {
        for (const h of [1, 2] as const) {
          const { from, to } = midYearRange(year, h);
          if (compareISODate(from, todayIso) > 0) continue;
          out.push({
            key: periodKeyMidYear(year, h),
            label: h === 1 ? `H1 · ${year}` : `H2 · ${year}`,
            from,
            to,
          });
        }
      }
      out.sort((a, b) => compareISODate(a.from, b.from));
      break;
    }
    case "yearly": {
      const todayIso = isoFromDate(now);
      for (const year of [cy - 2, cy - 1, cy] as const) {
        const { from, to } = yearlyRange(year);
        if (compareISODate(from, todayIso) > 0) continue;
        out.push({
          key: periodKeyYearly(year),
          label: `Year · ${year}`,
          from,
          to,
        });
      }
      break;
    }
    default:
      break;
  }
  return clipSlotsFromJoinDate(out, joinDate);
}

function isoFromDate(d: Date): ISODateString {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export type ReminderSlot = {
  key: string;
  label: string;
  from: ISODateString;
  to: ISODateString;
};

/** First month index (1–12) to consider from join date. */
function startMonthFromJoin(joinDate: ISODateString | null, today: Date): {
  year: number;
  month: number;
} {
  if (!joinDate || !/^\d{4}-\d{2}-\d{2}$/.test(joinDate)) {
    const d = new Date(today);
    d.setMonth(d.getMonth() - 11);
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  }
  const jy = Number(joinDate.slice(0, 4));
  const jm = Number(joinDate.slice(5, 7));
  const rolling = new Date(today);
  rolling.setMonth(rolling.getMonth() - 11);
  const ry = rolling.getFullYear();
  const rm = rolling.getMonth() + 1;
  if (jy > ry || (jy === ry && jm > rm)) {
    return { year: jy, month: jm };
  }
  return { year: ry, month: rm };
}

function iterMonths(
  start: { year: number; month: number },
  end: { year: number; month: number },
): { year: number; month: number }[] {
  const out: { year: number; month: number }[] = [];
  let y = start.year;
  let m = start.month;
  while (y < end.year || (y === end.year && m <= end.month)) {
    out.push({ year: y, month: m });
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

export function expectedReminderSlots(
  cadence: ReviewCadence,
  joinDate: ISODateString | null,
  quarterStartMonth = 1,
  today: Date = new Date(),
): ReminderSlot[] {
  const todayIso = isoFromDate(today);
  const ty = today.getFullYear();
  const tm = today.getMonth() + 1;

  switch (cadence) {
    case "monthly": {
      const start = startMonthFromJoin(joinDate, today);
      const slots = iterMonths(start, { year: ty, month: tm });
      return slots.map(({ year, month }) => {
        const { from, to } = monthRange(year, month);
        const d = new Date(year, month - 1, 1);
        return {
          key: periodKeyMonthly(year, month),
          label: d.toLocaleString(undefined, {
            month: "long",
            year: "numeric",
          }),
          from,
          to,
        };
      });
    }
    case "quarterly": {
      const slots: ReminderSlot[] = [];
      const currentQ = quarterForDate(today, quarterStartMonth);
      const startYear = joinDate
        ? Math.min(Number(joinDate.slice(0, 4)), currentQ.year - 1)
        : currentQ.year - 1;
      for (let year = startYear; year <= currentQ.year; year++) {
        for (const q of [1, 2, 3, 4] as const) {
          const { from, to } = quarterRangeFromStartMonth(
            year,
            q,
            quarterStartMonth,
          );
          if (compareISODate(from, todayIso) > 0) continue;
          slots.push({
            key: periodKeyQuarterly(year, q),
            label: `Q${q} · ${year}`,
            from,
            to,
          });
        }
      }
      return clipSlotsFromJoinDate(slots, joinDate);
    }
    case "mid_year": {
      const slots: ReminderSlot[] = [];
      const startYear = joinDate
        ? Math.min(Number(joinDate.slice(0, 4)), ty - 1)
        : ty - 1;
      for (let year = startYear; year <= ty; year++) {
        for (const h of [1, 2] as const) {
          const { from, to } = midYearRange(year, h);
          if (compareISODate(from, todayIso) > 0) continue;
          slots.push({
            key: periodKeyMidYear(year, h),
            label: h === 1 ? `First half · ${year}` : `Second half · ${year}`,
            from,
            to,
          });
        }
      }
      return clipSlotsFromJoinDate(slots, joinDate);
    }
    case "yearly": {
      const startYear = joinDate
        ? Math.min(Number(joinDate.slice(0, 4)), ty - 2)
        : ty - 2;
      const slots: ReminderSlot[] = [];
      for (let year = startYear; year <= ty; year++) {
        const { from, to } = yearlyRange(year);
        if (compareISODate(from, todayIso) > 0) continue;
        slots.push({
          key: periodKeyYearly(year),
          label: `Year · ${year}`,
          from,
          to,
        });
      }
      return clipSlotsFromJoinDate(slots, joinDate);
    }
    default:
      return [];
  }
}

function clipSlotsFromJoinDate<T extends { from: ISODateString; to: ISODateString }>(
  slots: T[],
  joinDate: ISODateString | null,
): T[] {
  if (!joinDate || !/^\d{4}-\d{2}-\d{2}$/.test(joinDate)) return slots;
  return slots
    .filter((slot) => compareISODate(slot.to, joinDate) >= 0)
    .map((slot) =>
      compareISODate(slot.from, joinDate) < 0
        ? { ...slot, from: joinDate }
        : slot,
    );
}

/** Whether a saved review counts as covering an expected slot. */
export function reviewCoversCadenceKey(
  cadence: ReviewCadence,
  key: string,
  quarterStartMonth = 1,
  row: {
    generation_strategy: string | null;
    review_cadence: string | null;
    period_key: string | null;
    period_start: string | null;
    period_end: string | null;
  },
): boolean {
  if (
    row.generation_strategy !== "raw_period" &&
    row.generation_strategy !== "stitched_summaries"
  ) {
    return false;
  }
  if (row.review_cadence && row.review_cadence !== cadence) return false;
  if (row.period_key && row.period_key === key) return true;
  if (!row.period_start || !row.period_end) return false;
  const from = row.period_start.slice(0, 10);
  const to = row.period_end.slice(0, 10);
  const inferred = inferPeriodKeyFromBounds(
    cadence,
    from,
    to,
    quarterStartMonth,
  );
  if (inferred === key) return true;
  const bounds = boundsForPeriodKey(cadence, key, quarterStartMonth);
  return (
    bounds !== null && bounds.from === from && bounds.to === to
  );
}

export function missingCadenceReminders(
  cadence: ReviewCadence,
  joinDate: ISODateString | null,
  quarterStartMonth: number,
  reviews: readonly {
    generation_strategy: string | null;
    review_cadence: string | null;
    period_key: string | null;
    period_start: string | null;
    period_end: string | null;
  }[],
  today: Date = new Date(),
): ReminderSlot[] {
  const expected = expectedReminderSlots(
    cadence,
    joinDate,
    quarterStartMonth,
    today,
  );
  return expected.filter(
    (slot) =>
      !reviews.some((r) =>
        reviewCoversCadenceKey(cadence, slot.key, quarterStartMonth, r),
      ),
  );
}

export type ScorePoint = {
  sortKey: string;
  label: string;
  score10: number | null;
  periodStart: string;
};

export function scoreOutOf10FromReview(row: {
  rating: number | null;
  review_dimensions?: { rating: number }[] | null;
}): number | null {
  if (typeof row.rating === "number" && row.rating >= 1 && row.rating <= 5) {
    return Math.round(row.rating * 2 * 10) / 10;
  }
  const dims = row.review_dimensions ?? [];
  if (dims.length === 0) return null;
  const avg =
    dims.reduce((acc, d) => acc + d.rating, 0) / dims.length;
  if (avg < 1 || avg > 5) return null;
  return Math.round(avg * 2 * 10) / 10;
}

export function generatedReviewPerformanceSeries(
  reviews: readonly {
    id: string;
    created_at: string;
    generation_strategy: string | null;
    review_cadence: string | null;
    period_key: string | null;
    period_start: string | null;
    period_end: string | null;
    rating: number | null;
    review_dimensions?: { rating: number }[] | null;
  }[],
): ScorePoint[] {
  const gen = reviews.filter(
    (r) =>
      r.generation_strategy === "raw_period" ||
      r.generation_strategy === "stitched_summaries",
  );

  type Row = (typeof gen)[number];
  const byGroup = new Map<string, Row>();

  for (const r of gen) {
    const groupKey =
      r.period_key?.trim() ||
      (r.period_start && r.period_end
        ? `${r.period_start.slice(0, 10)}|${r.period_end.slice(0, 10)}`
        : r.id);
    const prev = byGroup.get(groupKey);
    if (
      !prev ||
      new Date(r.created_at).getTime() > new Date(prev.created_at).getTime()
    ) {
      byGroup.set(groupKey, r);
    }
  }

  const points: ScorePoint[] = [];
  for (const r of byGroup.values()) {
    const sortKey =
      r.period_start?.slice(0, 10) ?? r.created_at.slice(0, 10);
    let displayLabel = r.period_key?.trim() ?? "";
    if (
      !displayLabel &&
      r.period_start?.slice(0, 10) &&
      r.period_end?.slice(0, 10)
    ) {
      const cad = (r.review_cadence ?? "quarterly") as ReviewCadence;
      displayLabel =
        inferPeriodKeyFromBounds(
          cad,
          r.period_start.slice(0, 10),
          r.period_end.slice(0, 10),
        ) ?? "";
    }
    if (!displayLabel && r.period_start && r.period_end) {
      displayLabel = `${r.period_start.slice(0, 10)} → ${r.period_end.slice(0, 10)}`;
    }
    if (!displayLabel) displayLabel = "Generated review";
    points.push({
      sortKey,
      label: displayLabel,
      score10: scoreOutOf10FromReview(r),
      periodStart: r.period_start?.slice(0, 10) ?? sortKey,
    });
  }

  return points.sort((a, b) => compareISODate(a.sortKey, b.sortKey));
}

/** Aggregate header score: avg of scored roll-up periods (same dedupe logic as {@link generatedReviewPerformanceSeries}). */
export type RollUpOverallSummary = {
  avg10: number | null;
  /** Count of periods with a non-null 0–10 score. */
  periodsWithScores: number;
  /** Earliest `sortKey` among scored periods (ISO date string). */
  rangeFrom: string | null;
  /** Latest `sortKey` among scored periods (ISO date string). */
  rangeTo: string | null;
};

export function rollUpOverallScoreSummary(
  reviews: Parameters<typeof generatedReviewPerformanceSeries>[0],
): RollUpOverallSummary {
  const series = generatedReviewPerformanceSeries(reviews);
  const scored = series.filter((p): p is ScorePoint & { score10: number } =>
    p.score10 !== null,
  );
  if (scored.length === 0) {
    return {
      avg10: null,
      periodsWithScores: 0,
      rangeFrom: null,
      rangeTo: null,
    };
  }

  const sum = scored.reduce((acc, p) => acc + p.score10, 0);
  const avg10 = Math.round((sum / scored.length) * 10) / 10;

  const sortedByTime = [...scored].sort((a, b) =>
    compareISODate(a.sortKey, b.sortKey),
  );

  const first = sortedByTime[0];
  const last = sortedByTime[sortedByTime.length - 1];
  const rangeFrom = first?.sortKey ?? null;
  const rangeTo = last?.sortKey ?? null;

  return {
    avg10,
    periodsWithScores: scored.length,
    rangeFrom,
    rangeTo,
  };
}
