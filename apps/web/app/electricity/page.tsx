import type { Metadata } from "next";
import { Suspense } from "react";

import { AutoRefresh } from "@/components/auto-refresh";
import { BatteryStats } from "@/components/stats/battery-stats";
import { ChartCardSkeleton } from "@/components/stats/chart-card-skeleton";
import { PowerStatusCard } from "@/components/stats/power-status-card";
import { PowerTimeStats } from "@/components/stats/power-time-stats";

const REFRESH_INTERVAL_MS = 60_000;

export const metadata: Metadata = {
  title: "Electricity · Bluetti Powerstation",
};

export default function ElectricityPage({ searchParams }: PageProps<"/electricity">) {
  return (
    <main className="flex flex-1 flex-col gap-4 px-4 py-6 md:px-6">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Electricity</h1>
      <Suspense fallback={<ChartCardSkeleton height={190} />}>
        <PowerStatusCard />
      </Suspense>
      <Suspense fallback={<ChartCardSkeleton height={420} />}>
        <PowerTimeStats kind="power" searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={<ChartCardSkeleton height={560} />}>
        <BatteryStats searchParams={searchParams} />
      </Suspense>
      <AutoRefresh intervalMs={REFRESH_INTERVAL_MS} />
    </main>
  );
}
