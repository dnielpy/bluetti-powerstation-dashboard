import type { Blackout, PowerPeriod } from "@/lib/api";

const HOUR_MS = 3_600_000;

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
