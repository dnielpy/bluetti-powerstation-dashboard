import type { Metadata } from "next";
import { Suspense } from "react";

import { AutoRefresh } from "@/components/auto-refresh";
import { BatteryEstimate } from "@/components/stats/battery-estimate";
import { ChartCardSkeleton } from "@/components/stats/chart-card-skeleton";
import { PowerStats } from "@/components/stats/power-stats";

const REFRESH_INTERVAL_MS = 60_000;

export const metadata: Metadata = {
  title: "Consumption · Bluetti Powerstation",
};

export default function ConsumptionPage({ searchParams }: PageProps<"/consumption">) {
  return (
    <main className="flex flex-1 flex-col gap-4 px-4 py-6 md:px-6">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Consumption</h1>
      <Suspense fallback={<ChartCardSkeleton height={460} />}>
        <PowerStats searchParams={searchParams} />
      </Suspense>
      <BatteryEstimate />
      <AutoRefresh intervalMs={REFRESH_INTERVAL_MS} />
    </main>
  );
}
