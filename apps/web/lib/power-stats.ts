import type { Sample } from "@/lib/time-series";

const MAX_READING_GAP_MS = 5 * 60_000;
const WATT_STEPS = [5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000];

export function energyWh(samples: Sample[]): number {
  let total = 0;
  for (let index = 1; index < samples.length; index++) {
    const elapsed = Date.parse(samples[index].date) - Date.parse(samples[index - 1].date);
    if (elapsed > 0 && elapsed <= MAX_READING_GAP_MS) {
      total += samples[index - 1].value * (elapsed / 3_600_000);
    }
  }
  return total;
}

export function formatEnergy(wh: number): string {
  return wh >= 1000 ? `${(wh / 1000).toFixed(2)} kWh` : `${Math.round(wh)} Wh`;
}

export function wattTicks(maxWatts: number): number[] {
  const step = WATT_STEPS.find((candidate) => maxWatts / candidate <= 4) ?? WATT_STEPS.at(-1)!;
  const top = Math.max(step, Math.ceil(maxWatts / step) * step);
  const ticks: number[] = [];
  for (let tick = 0; tick <= top; tick += step) ticks.push(tick);
  return ticks;
}
