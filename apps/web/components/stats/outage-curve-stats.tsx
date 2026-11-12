import { ChartCard } from "@/components/stats/chart-card";
import { OutageCurveChart } from "@/components/stats/outage-curve-chart";
import { RangeFilter } from "@/components/stats/range-filter";
import { StatusMessage } from "@/components/status-message";
import { ApiUnavailableError, getPowerPeriods, type PowerPeriodsResult } from "@/lib/api";
import { formatDuration } from "@/lib/blackout-format";
import { toSpans } from "@/lib/power-periods";
import { TIME_RANGES, parseTimeRange } from "@/lib/time-ranges";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const HOUR_MS = 3_600_000;

export async function OutageCurveStats({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const range = parseTimeRange(params.outageCurveHours, TIME_RANGES);

  let result: PowerPeriodsResult;
  try {
    result = await getPowerPeriods(range.hours);
  } catch (error) {
    if (error instanceof ApiUnavailableError) {
      return <StatusMessage title="API unavailable" body="Could not load data from the API. Make sure it is running." />;
    }
    throw error;
  }

  const to = result.fetchedAt;
  const from = to - range.hours * HOUR_MS;
  const spans = toSpans(result.periods, from, to);
  const longest = Math.max(0, ...spans.filter((span) => !span.receivingAc).map((span) => (span.end - span.start) / HOUR_MS));

  return (
    <ChartCard
      id="outage-curve-title"
      title="Hours without electricity"
      subtitle={`${range.description}${longest ? ` · longest ${formatDuration(longest)}` : ""}`}
      actions={
        <RangeFilter
          label="Hours without electricity time range"
          param="outageCurveHours"
          ranges={TIME_RANGES}
          selected={range}
          searchParams={params}
          path="/blackouts"
        />
      }
    >
      {spans.length === 0 ? (
        <p className="flex h-32 items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">
          No readings in this period.
        </p>
      ) : (
        <OutageCurveChart spans={spans} from={from} to={to} />
      )}
    </ChartCard>
  );
}
