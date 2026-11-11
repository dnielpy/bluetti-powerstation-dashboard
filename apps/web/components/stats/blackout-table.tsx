import type { Blackout } from "@/lib/api";
import { formatDateTime, formatDuration } from "@/lib/blackout-format";

export function BlackoutTable({ blackouts }: { blackouts: Blackout[] }) {
  return (
    <details className="mt-4 text-sm">
      <summary className="cursor-pointer text-zinc-500 select-none hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50">
        View as table
      </summary>
      <table className="mt-3 w-full text-left">
        <thead>
          <tr className="border-b border-zinc-200 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            <th scope="col" className="py-2 font-medium">Start</th>
            <th scope="col" className="py-2 font-medium">End</th>
            <th scope="col" className="py-2 text-right font-medium">Duration</th>
          </tr>
        </thead>
        <tbody>
          {blackouts.map((blackout) => (
            <tr key={blackout.start} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/60">
              <td className="py-1.5 tabular-nums text-zinc-600 dark:text-zinc-400">{formatDateTime(blackout.start)}</td>
              <td className="py-1.5 tabular-nums text-zinc-600 dark:text-zinc-400">
                {blackout.ongoing ? "Ongoing" : formatDateTime(blackout.end)}
              </td>
              <td className="py-1.5 text-right font-medium tabular-nums text-zinc-900 dark:text-zinc-50">
                {formatDuration(blackout.duration_hours)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
