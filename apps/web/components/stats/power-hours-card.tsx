import { ChartCard } from "@/components/stats/chart-card";
import { StatusTile } from "@/components/stats/status-tile";
import { StatusMessage } from "@/components/status-message";
import { ApiUnavailableError, getPowerTotals, type PowerTotals } from "@/lib/api";
import { formatElapsed } from "@/lib/blackout-format";

const HOUR_MS = 3_600_000;
const WINDOW_HOURS = 24;

const timeFormat = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" });
const dayFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

/** When the power last went out, and whether it is still out. */
function lastOutage(totals: PowerTotals) {
  if (!totals.last_outage_start) return undefined;
  const start = new Date(totals.last_outage_start);
  return {
    label: "Power went out",
    value: timeFormat.format(start),
    detail: `${dayFormat.format(start)}${totals.outage_ongoing ? " · still out" : ""}`,
  };
}

function hoursValue(hours: number): string {
  return hours > 0 ? formatElapsed(hours * HOUR_MS) : "None";
}

function share(part: number, whole: number): string {
  return `${whole > 0 ? Math.round((part / whole) * 100) : 0}% of the time`;
}

/** Hours in a blackout and with power in the last 24 hours. */
export async function PowerHoursCard() {
  let totals: PowerTotals;
  try {
    totals = await getPowerTotals(WINDOW_HOURS);
  } catch (error) {
    if (error instanceof ApiUnavailableError) {
      return <StatusMessage title="API unavailable" body="Could not load data from the API. Make sure it is running." />;
    }
    throw error;
  }

  const recorded = totals.with_power_hours + totals.without_power_hours;

  return (
    <ChartCard
      id="power-hours-title"
      title="Power status"
      subtitle={totals.since ? `Last ${WINDOW_HOURS} hours` : "No readings yet"}
    >
      {recorded === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">The totals will appear once the API stores readings.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <StatusTile
            tone="red"
            label="Hours in blackout"
            value={hoursValue(totals.without_power_hours)}
            detail={share(totals.without_power_hours, recorded)}
            aside={lastOutage(totals)}
            live={totals.receiving_ac === false}
          />
          <StatusTile
            tone="green"
            label="Hours with power"
            value={hoursValue(totals.with_power_hours)}
            detail={share(totals.with_power_hours, recorded)}
            live={totals.receiving_ac === true}
          />
        </div>
      )}
    </ChartCard>
  );
}
