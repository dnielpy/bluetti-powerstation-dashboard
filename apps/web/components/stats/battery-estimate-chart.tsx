"use client";

import { type KeyboardEvent, type PointerEvent, useEffect, useRef, useState } from "react";

import { formatElapsed } from "@/lib/blackout-format";
import { TREND_COLORS } from "@/lib/chart-colors";
import { formatTimeTick, formatTooltipTime, timeTicks } from "@/lib/chart-time";

const HEIGHT = 300;
const MARGIN = { top: 16, right: 24, bottom: 28, left: 44 };
const Y_TICKS = [0, 25, 50, 75, 100];
const RESERVE_COLOR = "#d97706";
const DRAIN_COLOR = TREND_COLORS.down;
const MIN_RANGE_MS = 30 * 60_000;
const KEYBOARD_STEPS = 24;

export type Projection = {
  now: number;
  soc: number;
  drainPerHour: number;
  reserve: number;
  eta: number;
  earliest: number;
  latest: number;
};

/** Expected battery level at `t` if the current load holds. */
function levelAt(projection: Projection, t: number): number {
  const hours = (t - projection.now) / 3_600_000;
  return Math.max(projection.reserve, projection.soc - projection.drainPerHour * hours);
}

export function BatteryEstimateChart({ projection }: { projection: Projection }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | null>(null);
  const [activeT, setActiveT] = useState<number | null>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const { now, soc, reserve, eta, earliest, latest } = projection;
  const from = now;
  const to = now + Math.max(MIN_RANGE_MS, (latest - now) * 1.08);
  const rangeMs = to - from;
  const innerWidth = Math.max(0, (width ?? 0) - MARGIN.left - MARGIN.right);
  const innerHeight = HEIGHT - MARGIN.top - MARGIN.bottom;

  const x = (t: number) => MARGIN.left + ((t - from) / rangeMs) * innerWidth;
  const y = (value: number) => MARGIN.top + (1 - value / 100) * innerHeight;

  const band = `M${x(now)},${y(soc)}L${x(earliest)},${y(reserve)}L${x(latest)},${y(reserve)}Z`;
  const endLabelLeft = x(eta) > MARGIN.left + innerWidth - 150;

  function handlePointerMove(event: PointerEvent<SVGRectElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    setActiveT(from + Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width)) * rangeMs);
  }

  function handleKeyDown(event: KeyboardEvent<SVGSVGElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const step = (event.key === "ArrowLeft" ? -1 : 1) * (rangeMs / KEYBOARD_STEPS);
    setActiveT((t) => Math.min(to, Math.max(from, (t ?? now) + step)));
  }

  const activeLevel = activeT === null ? null : levelAt(projection, activeT);

  return (
    <div ref={containerRef} className="relative w-full" style={{ height: HEIGHT }}>
      {width !== null && (
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label={`Projected battery level: ${soc.toFixed(1)}% now, ${reserve}% at ${formatTooltipTime(eta)}. Use the left and right arrow keys to read values.`}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onFocus={() => setActiveT((t) => t ?? now)}
          onBlur={() => setActiveT(null)}
          className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-red-500/40"
        >
          {Y_TICKS.map((tick) => (
            <g key={tick}>
              <line
                x1={MARGIN.left}
                x2={MARGIN.left + innerWidth}
                y1={y(tick)}
                y2={y(tick)}
                strokeWidth={1}
                className="stroke-zinc-200 dark:stroke-zinc-800"
              />
              <text
                x={MARGIN.left - 8}
                y={y(tick)}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-zinc-500 text-[11px] tabular-nums dark:fill-zinc-400"
              >
                {tick}%
              </text>
            </g>
          ))}

          {timeTicks(from, to, innerWidth).map((tick) => (
            <text
              key={tick}
              x={x(tick)}
              y={HEIGHT - 8}
              textAnchor="middle"
              className="fill-zinc-500 text-[11px] tabular-nums dark:fill-zinc-400"
            >
              {formatTimeTick(tick, rangeMs)}
            </text>
          ))}

          {/* Where the level would be if the drain varies as much as it did in past discharges */}
          <path d={band} fill={DRAIN_COLOR} fillOpacity={0.1} />

          <line
            x1={MARGIN.left}
            x2={MARGIN.left + innerWidth}
            y1={y(reserve)}
            y2={y(reserve)}
            stroke={RESERVE_COLOR}
            strokeWidth={1.5}
            strokeDasharray="4 4"
          />
          <text
            x={MARGIN.left + 6}
            y={y(reserve) + 14}
            className="fill-zinc-600 text-[11px] font-medium dark:fill-zinc-300"
          >
            {reserve}% · turn off
          </text>

          <line
            x1={x(now)}
            y1={y(soc)}
            x2={x(eta)}
            y2={y(reserve)}
            stroke={DRAIN_COLOR}
            strokeWidth={2}
            strokeDasharray="6 4"
            strokeLinecap="round"
          />

          <circle cx={x(now)} cy={y(soc)} r={4} strokeWidth={2} fill={DRAIN_COLOR} className="stroke-white dark:stroke-zinc-900" />
          <text
            x={x(now) + 10}
            y={y(soc) - 10}
            className="fill-zinc-900 text-xs font-semibold tabular-nums dark:fill-zinc-50"
          >
            Now · {soc.toFixed(1)}%
          </text>

          <circle cx={x(eta)} cy={y(reserve)} r={4} strokeWidth={2} fill={RESERVE_COLOR} className="stroke-white dark:stroke-zinc-900" />
          <text
            x={x(eta) + (endLabelLeft ? -10 : 10)}
            y={y(reserve) - 10}
            textAnchor={endLabelLeft ? "end" : "start"}
            className="fill-zinc-900 text-xs font-semibold tabular-nums dark:fill-zinc-50"
          >
            {formatTooltipTime(eta)} · in {formatElapsed(eta - now)}
          </text>

          {activeT !== null && activeLevel !== null && (
            <>
              <line
                x1={x(activeT)}
                x2={x(activeT)}
                y1={MARGIN.top}
                y2={MARGIN.top + innerHeight}
                strokeWidth={1}
                className="stroke-zinc-400 dark:stroke-zinc-500"
              />
              <circle
                cx={x(activeT)}
                cy={y(activeLevel)}
                r={4}
                strokeWidth={2}
                fill={DRAIN_COLOR}
                className="stroke-white dark:stroke-zinc-900"
              />
            </>
          )}

          <rect
            x={MARGIN.left}
            y={MARGIN.top}
            width={innerWidth}
            height={innerHeight}
            fill="transparent"
            onPointerMove={handlePointerMove}
            onPointerLeave={() => setActiveT(null)}
          />
        </svg>
      )}

      {activeT !== null && activeLevel !== null && width !== null && (
        <div
          role="status"
          className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg border border-zinc-200 bg-white px-3 py-2 shadow-sm dark:border-zinc-700 dark:bg-zinc-800"
          style={{
            left: Math.min(Math.max(x(activeT), 80), width - 80),
            top: activeLevel >= 50 ? y(activeLevel) + 14 : y(activeLevel) - 66,
          }}
        >
          <div className="flex items-center gap-2">
            <span className="h-0.5 w-3 rounded-full" style={{ background: DRAIN_COLOR }} />
            <span className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
              {activeLevel.toFixed(1)}%
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">expected</span>
          </div>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{formatTooltipTime(activeT)}</p>
        </div>
      )}
    </div>
  );
}
