import type { Trend } from "@/lib/battery-series";

export const TREND_COLORS: Record<Trend, string> = {
  up: "#059669",
  down: "#dc2626",
};

export const TREND_LABELS: Record<Trend, string> = {
  up: "Charging",
  down: "Discharging",
};
