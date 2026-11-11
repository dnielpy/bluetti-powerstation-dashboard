import { Suspense } from "react";

import { AutoRefresh } from "@/components/auto-refresh";
import { LatestReading } from "@/components/latest-reading";
import { ReadingSkeleton } from "@/components/reading-skeleton";

const REFRESH_INTERVAL_MS = 7_000;

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-6">
      <h1 className="sr-only">Dashboard</h1>
      <Suspense fallback={<ReadingSkeleton />}>
        <LatestReading />
      </Suspense>
      <AutoRefresh intervalMs={REFRESH_INTERVAL_MS} />
    </main>
  );
}
