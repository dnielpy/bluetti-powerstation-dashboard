import { LastReadingTime } from "@/components/last-reading-time";
import { PowerFlow } from "@/components/power-flow/power-flow";
import { StatusMessage } from "@/components/status-message";
import { ApiUnavailableError, getLatestSummary, type Summary } from "@/lib/api";

export async function LatestReading() {
  let summary: Summary | null;
  try {
    summary = await getLatestSummary();
  } catch (error) {
    if (error instanceof ApiUnavailableError) {
      return <StatusMessage title="API unavailable" body="Could not load data from the API. Make sure it is running." />;
    }
    throw error;
  }

  if (summary === null) {
    return <StatusMessage title="No readings yet" body="The first reading will appear once the API stores a summary." />;
  }

  return (
    <>
      <PowerFlow summary={summary} />
      <LastReadingTime date={summary.date} />
    </>
  );
}
