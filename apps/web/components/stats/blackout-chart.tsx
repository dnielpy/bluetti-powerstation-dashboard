import type { Blackout } from "@/lib/api";
import { BLACKOUT_COLOR, formatDateTime, formatDuration, formatTick, hourTicks } from "@/lib/blackout-format";

function ongoingTexture(color: string): string {
  return `repeating-linear-gradient(45deg, ${color} 0 6px, color-mix(in srgb, ${color} 70%, white) 6px 9px)`;
}

type BlackoutChartProps = {
  blackouts: Blackout[];
  /** Red for blackouts; the same chart ranks periods with power in green. */
  color?: string;
  label?: string;
};

export function BlackoutChart({ blackouts, color = BLACKOUT_COLOR, label = "Blackout" }: BlackoutChartProps) {
  const ticks = hourTicks(Math.max(...blackouts.map((blackout) => blackout.duration_hours)));
  const top = ticks.at(-1)!;
  const percent = (hours: number) => `${(hours / top) * 100}%`;

  return (
    <div className="flex text-xs">
      <ul className="w-28 shrink-0 sm:w-32" aria-hidden>
        {blackouts.map((blackout) => (
          <li key={blackout.start} className="flex h-9 items-center pr-3 tabular-nums text-zinc-600 dark:text-zinc-400">
            {formatDateTime(blackout.start)}
          </li>
        ))}
      </ul>

      <div className="relative min-w-0 flex-1">
        <div className="relative mr-14">
          {ticks.map((tick) => (
            <span
              key={tick}
              aria-hidden
              className="absolute top-0 w-px bg-zinc-200 dark:bg-zinc-800"
              style={{ left: percent(tick), height: `${blackouts.length * 2.25}rem` }}
            />
          ))}

          <ul aria-label={`${label}s`}>
            {blackouts.map((blackout) => (
              <li
                key={blackout.start}
                tabIndex={0}
                aria-label={`${label} from ${formatDateTime(blackout.start)} ${
                  blackout.ongoing ? "still ongoing" : `to ${formatDateTime(blackout.end)}`
                }, ${formatDuration(blackout.duration_hours)}`}
                className="group relative flex h-9 items-center outline-none"
              >
                <span
                  className="block h-5 min-w-0.5 rounded-r transition-opacity group-hover:opacity-80 group-focus-visible:opacity-80"
                  style={{
                    width: percent(blackout.duration_hours),
                    background: blackout.ongoing ? ongoingTexture(color) : color,
                  }}
                />
                <span
                  className="absolute pl-1.5 font-medium whitespace-nowrap tabular-nums text-zinc-900 dark:text-zinc-50"
                  style={{ left: percent(blackout.duration_hours) }}
                >
                  {formatDuration(blackout.duration_hours)}
                  {blackout.ongoing && <span className="font-normal text-zinc-500 dark:text-zinc-400"> · ongoing</span>}
                </span>

                <span className="pointer-events-none invisible absolute bottom-full left-0 z-10 mb-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 shadow-sm group-hover:visible group-focus-visible:visible dark:border-zinc-700 dark:bg-zinc-800">
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
                    <span className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                      {formatDuration(blackout.duration_hours)}
                    </span>
                    {blackout.ongoing && <span className="text-zinc-500 dark:text-zinc-400">Ongoing</span>}
                  </span>
                  <span className="mt-0.5 block whitespace-nowrap text-zinc-500 tabular-nums dark:text-zinc-400">
                    {formatDateTime(blackout.start)} → {blackout.ongoing ? "now" : formatDateTime(blackout.end)}
                  </span>
                </span>
              </li>
            ))}
          </ul>

          <div aria-hidden className="relative mt-1 h-5">
            {ticks.map((tick, index) => (
              <span
                key={tick}
                className={`absolute -translate-x-1/2 whitespace-nowrap tabular-nums text-zinc-500 dark:text-zinc-400 ${
                  index % 2 === 1 ? "hidden sm:inline" : ""
                }`}
                style={{ left: percent(tick) }}
              >
                {formatTick(tick)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
