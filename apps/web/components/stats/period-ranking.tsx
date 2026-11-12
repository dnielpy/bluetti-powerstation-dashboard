import { BlackoutChart } from "@/components/stats/blackout-chart";
import { BlackoutTable } from "@/components/stats/blackout-table";
import { ChartCard } from "@/components/stats/chart-card";
import { RangeFilter } from "@/components/stats/range-filter";
import { StatusMessage } from "@/components/status-message";
import { ApiUnavailableError, getPowerPeriods, type PowerPeriodsResult } from "@/lib/api";
import { BLACKOUT_COLOR, POWER_COLOR } from "@/lib/blackout-format";
import { longestPeriods } from "@/lib/power-periods";
import { TIME_RANGES, parseTimeRange } from "@/lib/time-ranges";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const LIMIT = 10;

const KINDS = {
  blackout: {
    title: "Longest blackouts",
    label: "Blackout",
    empty: "No blackouts in this period.",
    color: BLACKOUT_COLOR,
    param: "blackoutRankHours",
    receivingAc: false,
  },
  power: {
    title: "Longest periods with power",
    label: "Period with power",
    empty: "No periods with power in this period.",
    color: POWER_COLOR,
    param: "powerRankHours",
    receivingAc: true,
  },
} as const;

/** The longest blackouts (or periods with power) in the range, longest first. */
export async function PeriodRanking({ kind, searchParams }: { kind: keyof typeof KINDS; searchParams: SearchParams }) {
  const config = KINDS[kind];
  const params = await searchParams;
  const range = parseTimeRange(params[config.param], TIME_RANGES);

  let result: PowerPeriodsResult;
  try {
    result = await getPowerPeriods(range.hours);
  } catch (error) {
    if (error instanceof ApiUnavailableError) {
      return <StatusMessage title="API unavailable" body="Could not load data from the API. Make sure it is running." />;
    }
    throw error;
  }

  const periods = longestPeriods(result.periods, config.receivingAc, LIMIT);

  return (
    <ChartCard
      id={`${kind}-ranking-title`}
      title={config.title}
      subtitle={`${range.description} · top ${LIMIT}`}
      actions={
        <RangeFilter
          label={`${config.title} time range`}
          param={config.param}
          ranges={TIME_RANGES}
          selected={range}
          searchParams={params}
          path="/blackouts"
        />
      }
    >
      {periods.length === 0 ? (
        <p className="flex h-32 items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">{config.empty}</p>
      ) : (
        <>
          <BlackoutChart blackouts={periods} color={config.color} label={config.label} />
          <BlackoutTable blackouts={periods} />
        </>
      )}
    </ChartCard>
  );
}
