import { ChartCard } from "@/components/stats/chart-card";
import { StatusTile } from "@/components/stats/status-tile";
import { StatusMessage } from "@/components/status-message";
import { ApiUnavailableError, getPowerStatus, type Period, type PowerStatusResult } from "@/lib/api";
import { formatDateTime, formatElapsed } from "@/lib/blackout-format";

const HOUR_MS = 3_600_000;

function periodValue(period: Period | null): string {
  return period ? formatElapsed(period.duration_hours * HOUR_MS) : "None recorded";
}

function periodDetail(period: Period | null): string | undefined {
  return period ? `${formatDateTime(period.start)} → ${formatDateTime(period.end)}` : undefined;
}

export async function PowerStatusCard() {
  let result: PowerStatusResult;
  try {
    result = await getPowerStatus();
  } catch (error) {
    if (error instanceof ApiUnavailableError) {
      return <StatusMessage title="API unavailable" body="Could not load data from the API. Make sure it is running." />;
    }
    throw error;
  }

  const { status, fetchedAt } = result;

  if (status.receiving_ac === null || status.current_since === null) {
    return (
      <ChartCard id="power-status-title" title="Power status" subtitle="No readings yet">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">The status will appear once the API stores a reading.</p>
      </ChartCard>
    );
  }

  const current = {
    value: formatElapsed(fetchedAt - Date.parse(status.current_since)),
    detail: `Since ${formatDateTime(status.current_since)}`,
  };

  const tiles = status.receiving_ac ? (
    <>
      <StatusTile tone="green" label="Hours with power" value={current.value} detail={current.detail} />
      <StatusTile
        tone="red"
        label="Hours in blackout"
        value={periodValue(status.last_blackout)}
        detail={status.last_blackout ? `Last blackout · ${periodDetail(status.last_blackout)}` : undefined}
      />
    </>
  ) : (
    <>
      <StatusTile tone="red" label="Hours in blackout" value={current.value} detail={current.detail} />
      <StatusTile
        tone="green"
        label="Hours with power"
        value={periodValue(status.last_power_period)}
        detail={status.last_power_period ? `Before this blackout · ${periodDetail(status.last_power_period)}` : undefined}
      />
    </>
  );

  return (
    <ChartCard
      id="power-status-title"
      title="Power status"
      subtitle={status.receiving_ac ? "Receiving AC power" : "In a blackout"}
    >
      <div className="grid gap-3 sm:grid-cols-2">{tiles}</div>
    </ChartCard>
  );
}
