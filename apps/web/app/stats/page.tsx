import type { Metadata } from "next";
import { Suspense } from "react";

import { AutoRefresh } from "@/components/auto-refresh";
import { BatteryEstimate } from "@/components/stats/battery-estimate";
import { BatteryStats } from "@/components/stats/battery-stats";
import { BlackoutStats } from "@/components/stats/blackout-stats";
import { ChartCardSkeleton } from "@/components/stats/chart-card-skeleton";
import { PowerStats } from "@/components/stats/power-stats";
import { PowerStatusCard } from "@/components/stats/power-status-card";

const REFRESH_INTERVAL_MS = 60_000;

export const metadata: Metadata = {
  title: "Stats · Bluetti Powerstation",
};

export default function StatsPage({ searchParams }: PageProps<"/stats">) {
  return (
    <main className="flex flex-1 flex-col gap-4 px-4 py-6 md:px-6">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Stats</h1>
      <Suspense fallback={<ChartCardSkeleton height={190} />}>
        <PowerStatusCard />
      </Suspense>
      <Suspense fallback={<ChartCardSkeleton height={560} />}>
        <BatteryStats searchParams={searchParams} />
      </Suspense>
      <BatteryEstimate />
      <Suspense fallback={<ChartCardSkeleton height={220} />}>
        <BlackoutStats searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={<ChartCardSkeleton height={460} />}>
        <PowerStats searchParams={searchParams} />
      </Suspense>
      <AutoRefresh intervalMs={REFRESH_INTERVAL_MS} />
    </main>
  );
}
