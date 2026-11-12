import { AverageTable } from "@/components/stats/average-table";
import { ChartCard } from "@/components/stats/chart-card";
import { PowerChart } from "@/components/stats/power-chart";
import { RangeFilter } from "@/components/stats/range-filter";
import { StatusMessage } from "@/components/status-message";
import { type AcOutputHistory, ApiUnavailableError, getAcOutputHistory } from "@/lib/api";
import { energyWh, formatEnergy } from "@/lib/power-stats";
import { TIME_RANGES, parseTimeRange } from "@/lib/time-ranges";
import { buildAverageRows, buildTimeSeries, fillGaps } from "@/lib/time-series";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function PowerStats({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const range = parseTimeRange(params.acHours, TIME_RANGES);

  let history: AcOutputHistory;
  try {
    history = await getAcOutputHistory(range.hours);
  } catch (error) {
    if (error instanceof ApiUnavailableError) {
      return <StatusMessage title="API unavailable" body="Could not load data from the API. Make sure it is running." />;
    }
    throw error;
  }

  const { readings, fetchedAt } = history;
  const samples = fillGaps(readings.map((reading) => ({ date: reading.date, value: reading.ac_output })));
  const peak = Math.max(0, ...readings.map((reading) => reading.ac_output));
  const summary = readings.length
    ? `${range.description} · ${formatEnergy(energyWh(samples))} used · peak ${peak} W`
    : range.description;

  return (
    <ChartCard
      id="ac-output-chart-title"
      title="AC output power"
      subtitle={summary}
      actions={
        <RangeFilter
          label="AC output time range"
          param="acHours"
          ranges={TIME_RANGES}
          selected={range}
          searchParams={params}
          path="/battery"
        />
      }
    >
      {readings.length === 0 ? (
        <p className="flex h-[320px] items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">
          No readings in this period.
        </p>
      ) : (
        <>
          <PowerChart series={buildTimeSeries(samples, range.hours, fetchedAt)} />
          <AverageTable rows={buildAverageRows(samples, range.hours, fetchedAt)} valueLabel="Average power" unit=" W" />
        </>
      )}
    </ChartCard>
  );
}
