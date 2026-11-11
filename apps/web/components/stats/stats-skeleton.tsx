export function StatsSkeleton() {
  return (
    <div className="flex w-full flex-col gap-4">
      <div className="h-[38px] w-[196px] animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-[520px] w-full animate-pulse rounded-2xl bg-white dark:bg-zinc-900" />
    </div>
  );
}
