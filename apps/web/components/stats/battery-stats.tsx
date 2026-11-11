import { BatteryChart } from "@/components/stats/battery-chart";
import { BatteryTable } from "@/components/stats/battery-table";
import { ChartCard } from "@/components/stats/chart-card";
import { RangeFilter } from "@/components/stats/range-filter";
import { TrendLegend } from "@/components/stats/trend-legend";
import { StatusMessage } from "@/components/status-message";
import { ApiUnavailableError, type BatteryStatus, getBatteryStatus } from "@/lib/api";
import { buildBatterySeries, buildBatteryTableRows } from "@/lib/battery-series";
import { BATTERY_RANGES, parseTimeRange } from "@/lib/time-ranges";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function BatteryStats({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const range = parseTimeRange(params.hours, BATTERY_RANGES);

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
    <ChartCard
      id="battery-chart-title"
      title="Battery level"
      subtitle={`${range.description} · ${readings.length.toLocaleString("en-US")} readings`}
      actions={
        <RangeFilter
          label="Battery level time range"
          param="hours"
          ranges={BATTERY_RANGES}
          selected={range}
          searchParams={params}
        />
      }
    >
      {readings.length === 0 ? (
        <p className="flex h-[420px] items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">
          No readings in this period.
        </p>
      ) : (
        <>
          <div className="mb-2 flex justify-end">
            <TrendLegend />
          </div>
          <BatteryChart series={series} />
          <BatteryTable rows={buildBatteryTableRows(readings, range.hours, fetchedAt)} />
        </>
      )}
    </ChartCard>
  );
}
