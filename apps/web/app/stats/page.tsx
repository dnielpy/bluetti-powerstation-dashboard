import type { Metadata } from "next";
import { Suspense } from "react";

import { AutoRefresh } from "@/components/auto-refresh";
import { BatteryStats } from "@/components/stats/battery-stats";
import { StatsSkeleton } from "@/components/stats/stats-skeleton";

const REFRESH_INTERVAL_MS = 60_000;

export const metadata: Metadata = {
  title: "Stats · Bluetti Powerstation",
};

export default function StatsPage({ searchParams }: PageProps<"/stats">) {
  return (
    <main className="flex flex-1 flex-col gap-4 px-4 py-6 md:px-6">
      <div className="w-full">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Stats</h1>
      </div>
      <Suspense fallback={<StatsSkeleton />}>
        <BatteryStats searchParams={searchParams} />
      </Suspense>
      <AutoRefresh intervalMs={REFRESH_INTERVAL_MS} />
    </main>
  );
}
