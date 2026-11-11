import type { AverageRow } from "@/lib/time-series";

const timeFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

type AverageTableProps = { rows: AverageRow[]; valueLabel: string; unit: string };

export function AverageTable({ rows, valueLabel, unit }: AverageTableProps) {
  return (
    <details className="group mt-4 text-sm">
      <summary className="cursor-pointer text-zinc-500 select-none hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50">
        View as table
      </summary>
      <table className="mt-3 w-full text-left">
        <thead>
          <tr className="border-b border-zinc-200 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            <th scope="col" className="py-2 font-medium">From</th>
            <th scope="col" className="py-2 font-medium">To</th>
            <th scope="col" className="py-2 text-right font-medium">{valueLabel}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.start} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/60">
              <td className="py-1.5 tabular-nums text-zinc-600 dark:text-zinc-400">{timeFormat.format(row.start)}</td>
              <td className="py-1.5 tabular-nums text-zinc-600 dark:text-zinc-400">{timeFormat.format(row.end)}</td>
              <td className="py-1.5 text-right font-medium tabular-nums text-zinc-900 dark:text-zinc-50">{row.value}
                {unit}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
