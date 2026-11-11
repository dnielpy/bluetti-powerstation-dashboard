import { BatteryIcon } from "@/components/icons/battery-icon";

const GAUGE_ARC = "M149.09 250.91 A72 72 0 1 1 250.91 250.91";

export function BatteryGauge({ percent, charging }: { percent: number; charging: boolean }) {
  const level = Math.max(0, Math.min(100, percent));
  const stroke = charging ? "stroke-emerald-500" : "stroke-red-500";
  const fill = charging ? "text-emerald-500" : "text-red-500";

  return (
    <>
      <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full" aria-hidden>
        <path
          d={GAUGE_ARC}
          fill="none"
          strokeWidth={14}
          strokeLinecap="round"
          className="stroke-zinc-200 dark:stroke-zinc-800"
        />
        <path
          d={GAUGE_ARC}
          fill="none"
          strokeWidth={14}
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${level} 100`}
          className={`${stroke} transition-[stroke-dasharray] duration-700`}
        />
      </svg>
      <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
        <BatteryIcon className={`h-[6cqw] w-[6cqw] ${fill}`} />
        <p className="mt-1 text-[length:6.5cqw] leading-none font-semibold tracking-tight tabular-nums text-zinc-900 dark:text-zinc-50">
          {level}
          <span className="ml-0.5 text-[length:2.6cqw] font-medium">%</span>
        </p>
      </div>
    </>
  );
}
