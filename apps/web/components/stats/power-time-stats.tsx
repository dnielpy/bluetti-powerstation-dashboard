import { ChartCard } from "@/components/stats/chart-card";
import { RangeFilter } from "@/components/stats/range-filter";
import { StatusTile } from "@/components/stats/status-tile";
import { StatusMessage } from "@/components/status-message";
import { ApiUnavailableError, getPowerPeriods, type PowerPeriodsResult } from "@/lib/api";
import { formatDuration } from "@/lib/blackout-format";
import { formatHourOfDay, hourShares, powerTotals, toSpans } from "@/lib/power-periods";
import { TIME_RANGES, parseTimeRange } from "@/lib/time-ranges";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const HOUR_MS = 3_600_000;
const LABEL_EVERY_HOURS = 3;

const KINDS = {
  power: {
    title: "Time with electricity",
    tile: "With electricity",
    tone: "green",
    bar: "bg-emerald-500 dark:bg-emerald-600",
    hoursTitle: "Most common hours with electricity",
    share: "with electricity",
    param: "powerHours",
    path: "/electricity",
  },
  blackout: {
    title: "Time without electricity",
    tile: "Without electricity",
    tone: "red",
    bar: "bg-red-600 dark:bg-red-700",
    hoursTitle: "Most common hours without electricity",
    share: "without electricity",
    param: "blackoutTimeHours",
    path: "/blackouts",
  },
} as const;

function percent(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

/** Hours with (or without) electricity in the range, and how often each hour of the day had it. */
export async function PowerTimeStats({ kind, searchParams }: { kind: keyof typeof KINDS; searchParams: SearchParams }) {
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

  const to = result.fetchedAt;
  const spans = toSpans(result.periods, to - range.hours * HOUR_MS, to);
  const { withPowerHours, withoutPowerHours } = powerTotals(spans);
  const coveredHours = withPowerHours + withoutPowerHours;
  const stateHours = kind === "power" ? withPowerHours : withoutPowerHours;
  const shares = hourShares(spans).map((share) => {
    const stateMs = kind === "power" ? share.withPowerMs : share.coveredMs - share.withPowerMs;
    return { ...share, stateMs, value: share.coveredMs ? stateMs / share.coveredMs : null };
  });

  return (
    <ChartCard
      id={`${kind}-time-title`}
      title={config.title}
      subtitle={`${range.description} · ${formatDuration(coveredHours)} with readings`}
      actions={
        <RangeFilter
          label={`${config.title} time range`}
          param={config.param}
          ranges={TIME_RANGES}
          selected={range}
          searchParams={params}
          path={config.path}
        />
      }
    >
      {coveredHours === 0 ? (
        <p className="flex h-32 items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">
          No readings in this period.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <StatusTile
              tone={config.tone}
              label={config.tile}
              value={formatDuration(stateHours)}
              detail={`${percent(stateHours, coveredHours)}% of the time with readings`}
            />
          </div>

          <section aria-labelledby={`${kind}-hours-title`}>
            <h3 id={`${kind}-hours-title`} className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              {config.hoursTitle}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Share of each hour of the day {config.share}, local time
            </p>
            <ol className="mt-3 flex h-40 items-end gap-0.5 sm:gap-1">
              {shares.map((share) => {
                const label =
                  share.value === null
                    ? `${formatHourOfDay(share.hour)}: no readings`
                    : `${formatHourOfDay(share.hour)}: ${Math.round(share.value * 100)}% ${config.share}`;
                return (
                  <li key={share.hour} title={label} aria-label={label} className="flex h-full min-w-0 flex-1 flex-col justify-end">
                    {share.value === null ? (
                      <span className="h-1 rounded-sm bg-zinc-200 dark:bg-zinc-800" />
                    ) : (
                      <span
                        className={`min-h-0.5 rounded-t-sm ${config.bar}`}
                        style={{ height: `${Math.max(share.value * 100, 1)}%` }}
                      />
                    )}
                  </li>
                );
              })}
            </ol>
            <div aria-hidden className="mt-1 flex gap-0.5 sm:gap-1">
              {shares.map((share) => (
                <span
                  key={share.hour}
                  className="min-w-0 flex-1 overflow-visible text-center text-[10px] whitespace-nowrap text-zinc-500 tabular-nums dark:text-zinc-400"
                >
                  {share.hour % LABEL_EVERY_HOURS === 0 ? formatHourOfDay(share.hour) : ""}
                </span>
              ))}
            </div>
          </section>
        </div>
      )}
    </ChartCard>
  );
}
