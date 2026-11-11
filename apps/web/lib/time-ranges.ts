export type TimeRange = { hours: number; label: string; description: string };

export const TIME_RANGES: TimeRange[] = [
  { hours: 1, label: "1h", description: "Last hour" },
  { hours: 6, label: "6h", description: "Last 6 hours" },
  { hours: 24, label: "24h", description: "Last 24 hours" },
  { hours: 168, label: "7d", description: "Last 7 days" },
];

export const DEFAULT_TIME_RANGE = TIME_RANGES[2];

export function parseTimeRange(value: string | string[] | undefined): TimeRange {
  const hours = Number(Array.isArray(value) ? value[0] : value);
  return TIME_RANGES.find((range) => range.hours === hours) ?? DEFAULT_TIME_RANGE;
}
