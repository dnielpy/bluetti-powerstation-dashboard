import { BatteryChart } from "@/components/stats/battery-chart";
import { AverageTable } from "@/components/stats/average-table";
import { ChartCard } from "@/components/stats/chart-card";
import { RangeFilter } from "@/components/stats/range-filter";
import { TrendLegend } from "@/components/stats/trend-legend";
import { StatusMessage } from "@/components/status-message";
import { ApiUnavailableError, type BatteryStatus, getBatteryStatus } from "@/lib/api";
import { TIME_RANGES, parseTimeRange } from "@/lib/time-ranges";
import { buildAverageRows, buildTimeSeries, fillGaps } from "@/lib/time-series";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function BatteryStats({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const range = parseTimeRange(params.hours, TIME_RANGES);

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
  const samples = fillGaps(readings.map((reading) => ({ date: reading.date, value: reading.battery_percent })));
  const series = buildTimeSeries(samples, range.hours, fetchedAt);

  return (
    <ChartCard
      id="battery-chart-title"
      title="Battery level"
      subtitle={`${range.description} · ${readings.length.toLocaleString("en-US")} readings`}
      actions={
        <RangeFilter
          label="Battery level time range"
          param="hours"
          ranges={TIME_RANGES}
          selected={range}
          searchParams={params}
          path="/electricity"
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
          <AverageTable rows={buildAverageRows(samples, range.hours, fetchedAt)} valueLabel="Average battery" unit="%" />
        </>
      )}
    </ChartCard>
  );
}
