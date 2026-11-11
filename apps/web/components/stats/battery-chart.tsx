"use client";

import { type KeyboardEvent, type PointerEvent, useEffect, useMemo, useRef, useState } from "react";

import { type BatterySeries, pointTrends, type SeriesPoint, splitByTrend, splitOnGaps } from "@/lib/battery-series";
import { TREND_COLORS, TREND_LABELS } from "@/lib/chart-colors";

const HEIGHT = 420;
const MARGIN = { top: 16, right: 48, bottom: 28, left: 44 };
const Y_TICKS = [0, 25, 50, 75, 100];

const HOUR_MS = 3_600_000;

function tickStepMs(rangeMs: number): number {
  if (rangeMs <= HOUR_MS) return 10 * 60_000;
  if (rangeMs <= 6 * HOUR_MS) return HOUR_MS;
  if (rangeMs <= 24 * HOUR_MS) return 4 * HOUR_MS;
  return 24 * HOUR_MS;
}

const MIN_TICK_SPACING = 56;

function xTicks(from: number, to: number, innerWidth: number): number[] {
  const step = tickStepMs(to - from);
  const start = new Date(from);
  if (step >= 24 * HOUR_MS) start.setHours(0, 0, 0, 0);
  else if (step >= HOUR_MS) start.setMinutes(0, 0, 0);
  else start.setMinutes(Math.floor(start.getMinutes() / 10) * 10, 0, 0);

  const ticks: number[] = [];
  for (let t = start.getTime(); t <= to; t += step) {
    if (t >= from) ticks.push(t);
  }
  const spacing = (innerWidth * step) / (to - from);
  const every = Math.max(1, Math.ceil(MIN_TICK_SPACING / Math.max(spacing, 1)));
  return ticks.filter((_, index) => index % every === 0);
}

function formatTick(t: number, rangeMs: number): string {
  const options: Intl.DateTimeFormatOptions =
    rangeMs > 24 * HOUR_MS ? { day: "numeric", month: "short" } : { hour: "2-digit", minute: "2-digit", hour12: false };
  return new Intl.DateTimeFormat(undefined, options).format(t);
}

function formatTooltipTime(t: number): string {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(t);
}

function nearestIndex(points: SeriesPoint[], t: number): number {
  let lo = 0;
  let hi = points.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (points[mid].t < t) lo = mid + 1;
    else hi = mid;
  }
  if (lo > 0 && Math.abs(points[lo - 1].t - t) < Math.abs(points[lo].t - t)) return lo - 1;
  return lo;
}

export function BatteryChart({ series }: { series: BatterySeries }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const { from, to, points, gapMs } = series;
  const rangeMs = to - from;
  const innerWidth = Math.max(0, (width ?? 0) - MARGIN.left - MARGIN.right);
  const innerHeight = HEIGHT - MARGIN.top - MARGIN.bottom;

  const x = (t: number) => MARGIN.left + ((t - from) / rangeMs) * innerWidth;
  const y = (value: number) => MARGIN.top + (1 - value / 100) * innerHeight;

  const trends = useMemo(() => pointTrends(points), [points]);
  const runs = useMemo(() => {
    const trendByPoint = new Map(points.map((point, index) => [point, trends[index]]));
    return splitOnGaps(points, gapMs).flatMap((segment) => splitByTrend(segment, trendByPoint));
  }, [points, trends, gapMs]);
  const last = points.at(-1);
  const lastColor = TREND_COLORS[trends.at(-1) ?? "up"];
  const active = activeIndex === null ? null : points[activeIndex];
  const activeTrend = activeIndex === null ? null : trends[activeIndex];

  const linePath = (run: SeriesPoint[]) =>
    run.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.t).toFixed(1)},${y(p.value).toFixed(1)}`).join("");
  const areaPath = (run: SeriesPoint[]) => {
    const first = run[0];
    const end = run.at(-1)!;
    const line = run.map((p) => `L${x(p.t).toFixed(1)},${y(p.value).toFixed(1)}`).join("");
    return `M${x(first.t).toFixed(1)},${y(0)}${line}L${x(end.t).toFixed(1)},${y(0)}Z`;
  };

  function handlePointerMove(event: PointerEvent<SVGRectElement>) {
    if (points.length === 0) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const t = from + ((event.clientX - bounds.left) / bounds.width) * rangeMs;
    setActiveIndex(nearestIndex(points, t));
  }

  function handleKeyDown(event: KeyboardEvent<SVGSVGElement>) {
    if (points.length === 0) return;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      const step = event.key === "ArrowLeft" ? -1 : 1;
      setActiveIndex((index) => Math.min(points.length - 1, Math.max(0, (index ?? points.length - 1) + step)));
    }
  }

  return (
    <div ref={containerRef} className="relative w-full" style={{ height: HEIGHT }}>
      {width !== null && (
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label="Battery level over time. Use the left and right arrow keys to read values."
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onFocus={() => setActiveIndex((index) => index ?? (points.length ? points.length - 1 : null))}
          onBlur={() => setActiveIndex(null)}
          className="outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 rounded-lg"
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

          {xTicks(from, to, innerWidth).map((tick) => (
            <text
              key={tick}
              x={x(tick)}
              y={HEIGHT - 8}
              textAnchor="middle"
              className="fill-zinc-500 text-[11px] tabular-nums dark:fill-zinc-400"
            >
              {formatTick(tick, rangeMs)}
            </text>
          ))}

          {runs.map((run, index) => (
            <path key={`area-${index}`} d={areaPath(run.points)} fill={TREND_COLORS[run.trend]} fillOpacity={0.1} />
          ))}
          {runs.map((run, index) => (
            <path
              key={`line-${index}`}
              d={linePath(run.points)}
              fill="none"
              stroke={TREND_COLORS[run.trend]}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}

          {last && (
            <>
              <circle
                cx={x(last.t)}
                cy={y(last.value)}
                r={4}
                fill={lastColor}
                strokeWidth={2}
                className="stroke-white dark:stroke-zinc-900"
              />
              <text
                x={x(last.t) + 10}
                y={y(last.value)}
                dominantBaseline="middle"
                className="fill-zinc-900 text-xs font-semibold tabular-nums dark:fill-zinc-50"
              >
                {Math.round(last.value)}%
              </text>
            </>
          )}

          {active && (
            <>
              <line
                x1={x(active.t)}
                x2={x(active.t)}
                y1={MARGIN.top}
                y2={MARGIN.top + innerHeight}
                strokeWidth={1}
                className="stroke-zinc-400 dark:stroke-zinc-500"
              />
              <circle
                cx={x(active.t)}
                cy={y(active.value)}
                r={4}
                fill={TREND_COLORS[activeTrend ?? "up"]}
                strokeWidth={2}
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
            onPointerLeave={() => setActiveIndex(null)}
          />
        </svg>
      )}

      {active && width !== null && (
        <div
          role="status"
          className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg border border-zinc-200 bg-white px-3 py-2 shadow-sm dark:border-zinc-700 dark:bg-zinc-800"
          style={{
            left: Math.min(Math.max(x(active.t), 70), width - 70),
            top: active.value >= 50 ? y(active.value) + 14 : y(active.value) - 66,
          }}
        >
          <div className="flex items-center gap-2">
            <span className="h-0.5 w-3 rounded-full" style={{ background: TREND_COLORS[activeTrend ?? "up"] }} />
            <span className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
              {Math.round(active.value)}%
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">{TREND_LABELS[activeTrend ?? "up"]}</span>
          </div>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{formatTooltipTime(active.t)}</p>
        </div>
      )}
    </div>
  );
}
