import { ChartCard } from "@/components/stats/chart-card";
import { RangeFilter } from "@/components/stats/range-filter";
import { StatusTile } from "@/components/stats/status-tile";
import { StatusMessage } from "@/components/status-message";
import { ApiUnavailableError, getPowerPeriods, type PowerPeriodsResult } from "@/lib/api";
import { formatElapsed } from "@/lib/blackout-format";
import { powerTotals, toSpans } from "@/lib/power-periods";
import { TIME_RANGES, parseTimeRange } from "@/lib/time-ranges";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const HOUR_MS = 3_600_000;

function share(part: number, whole: number): string {
  return `${whole > 0 ? Math.round((part / whole) * 100) : 0}% of the time`;
}

/** How many hours of the range were in a blackout and how many with power. */
export async function PowerHoursCard({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const range = parseTimeRange(params.powerHours, TIME_RANGES);

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
  const { withPowerMs, withoutPowerMs } = powerTotals(toSpans(result.periods, to - range.hours * HOUR_MS, to));
  const recordedMs = withPowerMs + withoutPowerMs;

  return (
    <ChartCard
      id="power-hours-title"
      title="Power status"
      subtitle={range.description}
      actions={
        <RangeFilter
          label="Power status time range"
          param="powerHours"
          ranges={TIME_RANGES}
          selected={range}
          searchParams={params}
          path="/blackouts"
        />
      }
    >
      {recordedMs === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">No readings in this period.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <StatusTile
            tone="red"
            label="Hours in blackout"
            value={withoutPowerMs ? formatElapsed(withoutPowerMs) : "None"}
            detail={share(withoutPowerMs, recordedMs)}
          />
          <StatusTile
            tone="green"
            label="Hours with power"
            value={withPowerMs ? formatElapsed(withPowerMs) : "None"}
            detail={share(withPowerMs, recordedMs)}
          />
        </div>
      )}
    </ChartCard>
  );
}
