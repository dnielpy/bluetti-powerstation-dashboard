export function ReadingSkeleton() {
  return (
    <div className="flex aspect-square w-[min(100%,620px,calc(100dvh-10rem))] items-center justify-center">
      <div className="h-40 w-40 animate-pulse rounded-full border-[14px] border-zinc-200 dark:border-zinc-800" />
    </div>
  );
}
