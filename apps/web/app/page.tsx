import { Suspense } from "react";

import { AutoRefresh } from "@/components/auto-refresh";
import { LatestReading } from "@/components/latest-reading";
import { ReadingSkeleton } from "@/components/reading-skeleton";

const REFRESH_INTERVAL_MS = 7_000;

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-[#eef2fb] px-4 py-10 dark:bg-zinc-950">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Bluetti Powerstation</h1>
      <Suspense fallback={<ReadingSkeleton />}>
        <LatestReading />
      </Suspense>
      <AutoRefresh intervalMs={REFRESH_INTERVAL_MS} />
    </main>
  );
}
