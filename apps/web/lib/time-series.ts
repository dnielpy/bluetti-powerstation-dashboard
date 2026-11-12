export type Sample = { date: string; value: number };

export type SeriesPoint = { t: number; value: number };

export type TimeSeries = {
  from: number;
  to: number;
  points: SeriesPoint[];
  gapMs: number;
};

export type AverageRow = { start: number; end: number; value: number };

const HOUR_MS = 3_600_000;
const MAX_POINTS = 360;
const MIN_GAP_MS = 60_000;

function bucketAverages(samples: Sample[], from: number, bucketMs: number): SeriesPoint[] {
  const buckets = new Map<number, { sum: number; count: number }>();
  for (const sample of samples) {
    const index = Math.floor((Date.parse(sample.date) - from) / bucketMs);
    const bucket = buckets.get(index) ?? { sum: 0, count: 0 };
    bucket.sum += sample.value;
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

// Readings come every few seconds; a longer gap is the API losing the Bluetti, and gets filled in
const FILL_GAP_MS = 60_000;
const FILL_STEP_MS = 60_000;

/**
 * Fills gaps without readings with values on the straight line between the readings around them, one per minute,
 * so a drop from 90 to 80 across a gap is spread evenly over it. Charts, averages and energy then have no holes.
 */
export function fillGaps(samples: Sample[]): Sample[] {
  const filled: Sample[] = [];
  for (let index = 0; index < samples.length; index++) {
    const sample = samples[index];
    const previous = samples[index - 1];
    if (previous) {
      const start = Date.parse(previous.date);
      const end = Date.parse(sample.date);
      if (end - start > FILL_GAP_MS) {
        for (let t = start + FILL_STEP_MS; t < end; t += FILL_STEP_MS) {
          const fraction = (t - start) / (end - start);
          filled.push({ date: new Date(t).toISOString(), value: previous.value + (sample.value - previous.value) * fraction });
        }
      }
    }
    filled.push(sample);
  }
  return filled;
}

export function buildTimeSeries(samples: Sample[], hours: number, now: number): TimeSeries {
  const to = now;
  const from = now - hours * HOUR_MS;
  const bucketMs = (to - from) / MAX_POINTS;

  return {
    from,
    to,
    points: bucketAverages(samples, from, bucketMs),
    gapMs: Math.max(MIN_GAP_MS, bucketMs * 3),
  };
}

export function buildAverageRows(samples: Sample[], hours: number, now: number, rows = 12): AverageRow[] {
  const from = now - hours * HOUR_MS;
  const bucketMs = (hours * HOUR_MS) / rows;
  return bucketAverages(samples, from, bucketMs).map((point) => ({
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
