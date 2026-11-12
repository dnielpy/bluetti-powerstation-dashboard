import type { Blackout, PowerPeriod } from "@/lib/api";

const HOUR_MS = 3_600_000;

/** A period in epoch milliseconds, cut to the range the page shows. */
export type Span = { start: number; end: number; receivingAc: boolean };

export function toSpans(periods: PowerPeriod[], from: number, to: number): Span[] {
  return periods
    .map((period) => ({
      start: Math.max(from, Date.parse(period.start)),
      end: Math.min(to, Date.parse(period.end)),
      receivingAc: period.receiving_ac,
    }))
    .filter((span) => span.end > span.start);
}

export type PowerTotals = { withPowerMs: number; withoutPowerMs: number };

export function powerTotals(spans: Span[]): PowerTotals {
  let withPowerMs = 0;
  let withoutPowerMs = 0;
  for (const span of spans) {
    if (span.receivingAc) withPowerMs += span.end - span.start;
    else withoutPowerMs += span.end - span.start;
  }
  return { withPowerMs, withoutPowerMs };
}

/** The longest periods of one state, longest first; the latest period is still going on. */
export function longestPeriods(periods: PowerPeriod[], receivingAc: boolean, limit: number): Blackout[] {
  return periods
    .map((period, index) => ({ period, ongoing: index === periods.length - 1 }))
    .filter(({ period }) => period.receiving_ac === receivingAc)
    .map(({ period, ongoing }) => ({
      start: period.start,
      end: period.end,
      duration_hours: (Date.parse(period.end) - Date.parse(period.start)) / HOUR_MS,
      ongoing,
    }))
    .sort((a, b) => b.duration_hours - a.duration_hours)
    .slice(0, limit);
}
