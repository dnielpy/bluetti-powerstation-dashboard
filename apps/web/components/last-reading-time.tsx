const timeFormat = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "medium",
});

export function LastReadingTime({ date }: { date: string }) {
  return (
    <p className="text-sm text-zinc-500 dark:text-zinc-400">
      Last reading: <time dateTime={date}>{timeFormat.format(new Date(date))}</time>
    </p>
  );
}
