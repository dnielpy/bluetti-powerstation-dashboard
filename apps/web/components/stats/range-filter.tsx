import Link from "next/link";

import { TIME_RANGES, type TimeRange } from "@/lib/time-ranges";

export function RangeFilter({ selected }: { selected: TimeRange }) {
  return (
    <nav aria-label="Time range" className="inline-flex self-start rounded-lg border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900">
      {TIME_RANGES.map((range) => {
        const active = range.hours === selected.hours;
        return (
          <Link
            key={range.hours}
            href={`/stats?hours=${range.hours}`}
            aria-current={active ? "page" : undefined}
            title={range.description}
            className={`rounded-md px-3 py-1 text-sm font-medium tabular-nums transition-colors ${
              active
                ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
            }`}
          >
            {range.label}
          </Link>
        );
      })}
    </nav>
  );
}
