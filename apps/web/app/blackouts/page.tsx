import type { Metadata } from "next";
import { Suspense } from "react";

import { AutoRefresh } from "@/components/auto-refresh";
import { BlackoutStats } from "@/components/stats/blackout-stats";
import { ChartCardSkeleton } from "@/components/stats/chart-card-skeleton";
import { OutageCurveStats } from "@/components/stats/outage-curve-stats";
import { PowerTimeStats } from "@/components/stats/power-time-stats";

const REFRESH_INTERVAL_MS = 60_000;

export const metadata: Metadata = {
  title: "Blackouts · Bluetti Powerstation",
};

export default function BlackoutsPage({ searchParams }: PageProps<"/blackouts">) {
  return (
    <main className="flex flex-1 flex-col gap-4 px-4 py-6 md:px-6">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Blackouts</h1>
      <Suspense fallback={<ChartCardSkeleton height={420} />}>
        <PowerTimeStats kind="blackout" searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={<ChartCardSkeleton height={340} />}>
        <OutageCurveStats searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={<ChartCardSkeleton height={220} />}>
        <BlackoutStats searchParams={searchParams} />
      </Suspense>
      <AutoRefresh intervalMs={REFRESH_INTERVAL_MS} />
    </main>
  );
}
