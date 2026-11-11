import { BlackoutChart } from "@/components/stats/blackout-chart";
import { BlackoutTable } from "@/components/stats/blackout-table";
import { ChartCard } from "@/components/stats/chart-card";
import { RangeFilter } from "@/components/stats/range-filter";
import { StatusMessage } from "@/components/status-message";
import { ApiUnavailableError, type Blackout, getBlackouts } from "@/lib/api";
import { formatDuration } from "@/lib/blackout-format";
import { BLACKOUT_RANGES, parseTimeRange } from "@/lib/time-ranges";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function BlackoutStats({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const range = parseTimeRange(params.blackoutHours, BLACKOUT_RANGES);

  let blackouts: Blackout[];
  try {
    blackouts = await getBlackouts(range.hours);
  } catch (error) {
    if (error instanceof ApiUnavailableError) {
      return <StatusMessage title="API unavailable" body="Could not load data from the API. Make sure it is running." />;
    }
    throw error;
  }

  const totalHours = blackouts.reduce((sum, blackout) => sum + blackout.duration_hours, 0);
  const count = `${blackouts.length} ${blackouts.length === 1 ? "blackout" : "blackouts"}`;

  return (
    <ChartCard
      id="blackouts-chart-title"
      title="Blackouts"
      subtitle={`${range.description} · ${count}${blackouts.length ? ` · ${formatDuration(totalHours)} without AC power` : ""}`}
      actions={
        <RangeFilter
          label="Blackouts time range"
          param="blackoutHours"
          ranges={BLACKOUT_RANGES}
          selected={range}
          searchParams={params}
        />
      }
    >
      {blackouts.length === 0 ? (
        <p className="flex h-32 items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">
          No blackouts in this period.
        </p>
      ) : (
        <>
          <BlackoutChart blackouts={blackouts} />
          <BlackoutTable blackouts={blackouts} />
        </>
      )}
    </ChartCard>
  );
}
