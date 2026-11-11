import { BatteryChart } from "@/components/stats/battery-chart";
import { BatteryTable } from "@/components/stats/battery-table";
import { RangeFilter } from "@/components/stats/range-filter";
import { TrendLegend } from "@/components/stats/trend-legend";
import { StatusMessage } from "@/components/status-message";
import { ApiUnavailableError, type BatteryStatus, getBatteryStatus } from "@/lib/api";
import { buildBatterySeries, buildBatteryTableRows } from "@/lib/battery-series";
import { parseTimeRange } from "@/lib/time-ranges";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export async function BatteryStats({ searchParams }: { searchParams: SearchParams }) {
  const range = parseTimeRange((await searchParams).hours);

  let status: BatteryStatus;
  try {
    status = await getBatteryStatus(range.hours);
  } catch (error) {
    if (error instanceof ApiUnavailableError) {
      return <StatusMessage title="API unavailable" body="Could not load data from the API. Make sure it is running." />;
    }
    throw error;
  }

  const { readings, fetchedAt } = status;
  const series = buildBatterySeries(readings, range.hours, fetchedAt);

  return (
    <div className="flex w-full flex-col gap-4">
      <RangeFilter selected={range} />
      <section
        aria-labelledby="battery-chart-title"
        className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="battery-chart-title" className="font-semibold text-zinc-900 dark:text-zinc-50">
              Battery level
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {range.description} · {readings.length.toLocaleString("en-US")} readings
            </p>
          </div>
          <TrendLegend />
        </div>
        {readings.length === 0 ? (
          <p className="flex h-[420px] items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">
            No readings in this period.
          </p>
        ) : (
          <>
            <BatteryChart series={series} />
            <BatteryTable rows={buildBatteryTableRows(readings, range.hours, fetchedAt)} />
          </>
        )}
      </section>
    </div>
  );
}
