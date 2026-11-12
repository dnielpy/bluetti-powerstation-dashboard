import type { SeriesPoint } from "@/lib/time-series";

export type Trend = "up" | "down";

export type TrendRun = { trend: Trend; points: SeriesPoint[] };

/** The direction of the first change, so a flat start is not taken as charging without any sign of it. */
function firstTrend(points: SeriesPoint[]): Trend {
  for (let index = 1; index < points.length; index++) {
    if (points[index].value > points[index - 1].value) return "up";
    if (points[index].value < points[index - 1].value) return "down";
  }
  // A level that never moves gives no sign of charging
  return "down";
}

export function pointTrends(points: SeriesPoint[]): Trend[] {
  const trends: Trend[] = [];
  let current = firstTrend(points);
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
