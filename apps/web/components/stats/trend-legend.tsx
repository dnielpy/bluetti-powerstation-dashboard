import type { Trend } from "@/lib/battery-series";
import { TREND_COLORS, TREND_LABELS } from "@/lib/chart-colors";

const TRENDS: Trend[] = ["up", "down"];

export function TrendLegend() {
  return (
    <ul aria-label="Legend" className="flex items-center gap-4 text-xs text-zinc-600 dark:text-zinc-400">
      {TRENDS.map((trend) => (
        <li key={trend} className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full" style={{ background: TREND_COLORS[trend] }} />
          {TREND_LABELS[trend]}
        </li>
      ))}
    </ul>
  );
}
