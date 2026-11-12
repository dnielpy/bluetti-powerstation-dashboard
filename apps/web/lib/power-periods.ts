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
