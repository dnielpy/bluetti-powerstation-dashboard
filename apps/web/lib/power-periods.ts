import type { PowerPeriod } from "@/lib/api";

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

export type PowerTotals = { withPowerHours: number; withoutPowerHours: number };

export function powerTotals(spans: Span[]): PowerTotals {
  let withPower = 0;
  let withoutPower = 0;
  for (const span of spans) {
    if (span.receivingAc) withPower += span.end - span.start;
    else withoutPower += span.end - span.start;
  }
  return { withPowerHours: withPower / HOUR_MS, withoutPowerHours: withoutPower / HOUR_MS };
}

/** For each hour of the day (local time), how long it had readings and how long of that was with AC power. */
export type HourShare = { hour: number; coveredMs: number; withPowerMs: number };

export function hourShares(spans: Span[]): HourShare[] {
  const shares = Array.from({ length: 24 }, (_, hour) => ({ hour, coveredMs: 0, withPowerMs: 0 }));
  for (const span of spans) {
    let t = span.start;
    while (t < span.end) {
      const date = new Date(t);
      const nextHour = new Date(t);
      nextHour.setMinutes(60, 0, 0);
      const end = Math.min(span.end, nextHour.getTime());
      const share = shares[date.getHours()];
      share.coveredMs += end - t;
      if (span.receivingAc) share.withPowerMs += end - t;
      t = end;
    }
  }
  return shares;
}

export type CurvePoint = { t: number; hours: number };

/**
 * Hours without power over time: climbs during each blackout and drops to zero when power comes back. Periods
 * that touch form one line; a gap without readings starts a new one.
 */
export function outageCurve(spans: Span[]): CurvePoint[][] {
  const lines: CurvePoint[][] = [];
  let previousEnd: number | null = null;
  for (const span of spans) {
    if (previousEnd === null || span.start !== previousEnd) lines.push([]);
    const line = lines.at(-1)!;
    if (span.receivingAc) {
      line.push({ t: span.start, hours: 0 }, { t: span.end, hours: 0 });
    } else {
      line.push({ t: span.start, hours: 0 }, { t: span.end, hours: (span.end - span.start) / HOUR_MS });
    }
    previousEnd = span.end;
  }
  return lines;
}

export function formatHourOfDay(hour: number): string {
  const suffix = hour < 12 ? "AM" : "PM";
  return `${hour % 12 === 0 ? 12 : hour % 12} ${suffix}`;
}
