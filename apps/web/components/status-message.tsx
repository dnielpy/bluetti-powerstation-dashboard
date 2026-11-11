export function StatusMessage({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex aspect-square w-full max-w-[440px] flex-col items-center justify-center gap-2 text-center">
      <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{title}</p>
      <p className="max-w-xs text-sm text-zinc-600 dark:text-zinc-400">{body}</p>
    </div>
  );
}
