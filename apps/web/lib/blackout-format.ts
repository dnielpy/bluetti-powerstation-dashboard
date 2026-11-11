export const BLACKOUT_COLOR = "#dc2626";

const TICK_STEPS = [0.25, 0.5, 1, 2, 4, 6, 12, 24, 48];
const MAX_TICKS = 6;

const dateTimeFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDuration(hours: number): string {
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
  return `${hours.toFixed(1)} h`;
}

export function formatDateTime(value: string): string {
  return dateTimeFormat.format(new Date(value));
}

export function hourTicks(maxHours: number): number[] {
  const step = TICK_STEPS.find((candidate) => maxHours / candidate <= MAX_TICKS - 1) ?? TICK_STEPS.at(-1)!;
  const top = Math.max(step, Math.ceil(maxHours / step) * step);
  const ticks: number[] = [];
  for (let tick = 0; tick <= top + 1e-9; tick += step) ticks.push(Math.round(tick * 100) / 100);
  return ticks;
}

export function formatTick(hours: number): string {
  return hours < 1 && hours > 0 ? `${hours * 60} min` : `${hours} h`;
}
