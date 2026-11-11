import { CometTrail } from "@/components/comet-trail";
import { BatteryIcon } from "@/components/icons/battery-icon";

const GAUGE_ARC = "M149.09 250.91 A72 72 0 1 1 250.91 250.91";
const CENTER = 200;
const RADIUS = 72;
const START_ANGLE = 135;
const SWEEP_ANGLE = 270;

type GaugeState = "discharging" | "charging" | "full";

const STATE_STYLES: Record<GaugeState, { stroke: string; fill: string; comet: string; glow: string }> = {
  discharging: { stroke: "stroke-red-500", fill: "text-red-500", comet: "#fca5a5", glow: "#ef4444" },
  charging: { stroke: "stroke-amber-500", fill: "text-amber-500", comet: "#fde68a", glow: "#f59e0b" },
  full: { stroke: "stroke-emerald-500", fill: "text-emerald-500", comet: "#6ee7b7", glow: "#10b981" },
};

function gaugeState(level: number, charging: boolean): GaugeState {
  if (!charging) return "discharging";
  return level >= 100 ? "full" : "charging";
}

function filledArc(level: number): string {
  const sweep = (SWEEP_ANGLE * level) / 100;
  const point = (angle: number) => {
    const radians = (angle * Math.PI) / 180;
    return `${(CENTER + RADIUS * Math.cos(radians)).toFixed(2)} ${(CENTER + RADIUS * Math.sin(radians)).toFixed(2)}`;
  };
  return `M${point(START_ANGLE)} A${RADIUS} ${RADIUS} 0 ${sweep > 180 ? 1 : 0} 1 ${point(START_ANGLE + sweep)}`;
}

export function BatteryGauge({ percent, charging }: { percent: number; charging: boolean }) {
  const level = Math.max(0, Math.min(100, percent));
  const { stroke, fill, comet, glow } = STATE_STYLES[gaugeState(level, charging)];

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
        {level > 0 && (
          <CometTrail
            path={filledArc(level)}
            color={comet}
            glow={glow}
            size={1.6}
            durationSeconds={4}
            tailLength={0.25}
          />
        )}
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
