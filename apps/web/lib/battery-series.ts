import type { BatteryStatusPoint } from "@/lib/api";

export type SeriesPoint = { t: number; value: number };

export type BatterySeries = {
  from: number;
  to: number;
  points: SeriesPoint[];
  gapMs: number;
};

const MAX_POINTS = 360;
const MIN_GAP_MS = 60_000;

function bucketAverages(readings: BatteryStatusPoint[], from: number, bucketMs: number): SeriesPoint[] {
  const buckets = new Map<number, { sum: number; count: number }>();
  for (const reading of readings) {
    const index = Math.floor((Date.parse(reading.date) - from) / bucketMs);
    const bucket = buckets.get(index) ?? { sum: 0, count: 0 };
    bucket.sum += reading.battery_percent;
    bucket.count += 1;
    buckets.set(index, bucket);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a - b)
    .map(([index, { sum, count }]) => ({
      t: from + (index + 0.5) * bucketMs,
      value: Math.round((sum / count) * 10) / 10,
    }));
}

export function buildBatterySeries(readings: BatteryStatusPoint[], hours: number, now: number): BatterySeries {
  const to = now;
  const from = now - hours * 3_600_000;
  const bucketMs = (to - from) / MAX_POINTS;

  return {
    from,
    to,
    points: bucketAverages(readings, from, bucketMs),
    gapMs: Math.max(MIN_GAP_MS, bucketMs * 3),
  };
}

export function buildBatteryTableRows(readings: BatteryStatusPoint[], hours: number, now: number, rows = 12) {
  const from = now - hours * 3_600_000;
  const bucketMs = (hours * 3_600_000) / rows;
  return bucketAverages(readings, from, bucketMs).map((point) => ({
    start: point.t - bucketMs / 2,
    end: point.t + bucketMs / 2,
    value: Math.round(point.value),
  }));
}

export function splitOnGaps(points: SeriesPoint[], gapMs: number): SeriesPoint[][] {
  const segments: SeriesPoint[][] = [];
  for (const point of points) {
    const current = segments.at(-1);
    const previous = current?.at(-1);
    if (current && previous && point.t - previous.t <= gapMs) {
      current.push(point);
    } else {
      segments.push([point]);
    }
  }
  return segments;
}

export type Trend = "up" | "down";

export type TrendRun = { trend: Trend; points: SeriesPoint[] };

export function pointTrends(points: SeriesPoint[]): Trend[] {
  const trends: Trend[] = [];
  let current: Trend = "up";
  points.forEach((point, index) => {
    const previous = points[index - 1];
    if (previous && point.value > previous.value) current = "up";
    if (previous && point.value < previous.value) current = "down";
    trends.push(current);
  });
  return trends;
}

export function splitByTrend(segment: SeriesPoint[], trends: Map<SeriesPoint, Trend>): TrendRun[] {
  const runs: TrendRun[] = [];
  segment.forEach((point, index) => {
    if (index === 0) return;
    const trend = trends.get(point) ?? "up";
    const run = runs.at(-1);
    if (run && run.trend === trend) {
      run.points.push(point);
    } else {
      runs.push({ trend, points: [segment[index - 1], point] });
    }
  });
  if (runs.length === 0 && segment.length === 1) {
    runs.push({ trend: trends.get(segment[0]) ?? "up", points: segment });
  }
  return runs;
}
