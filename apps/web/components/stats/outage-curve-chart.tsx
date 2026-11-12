"use client";

import { type KeyboardEvent, type PointerEvent, useEffect, useMemo, useRef, useState } from "react";

import { BLACKOUT_COLOR, formatDuration, formatTick, hourTicks } from "@/lib/blackout-format";
import { formatTooltipTime, timeTicks } from "@/lib/chart-time";
import { type CurvePoint, outageCurve, type Span } from "@/lib/power-periods";

const HEIGHT = 280;
const MARGIN = { top: 16, right: 24, bottom: 28, left: 56 };
const HOUR_MS = 3_600_000;
const KEY_STEP_MS = 10 * 60_000;

/** "11 AM", "2 PM" within a day; the date when the range spans several days. */
function formatAxisTime(t: number, rangeMs: number): string {
  const options: Intl.DateTimeFormatOptions =
    rangeMs > 24 * HOUR_MS ? { day: "numeric", month: "short" } : { hour: "numeric", hour12: true };
  return new Intl.DateTimeFormat("en-US", options).format(t);
}

/** Where the line is at a moment: hours into a blackout, 0 with power, or null without readings. */
function stateAt(spans: Span[], t: number): { span: Span; hours: number } | null {
  const span = spans.find((item) => item.start <= t && t <= item.end);
  if (!span) return null;
  return { span, hours: span.receivingAc ? 0 : (t - span.start) / HOUR_MS };
}

export function OutageCurveChart({ spans, from, to }: { spans: Span[]; from: number; to: number }) {
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

  const lines = useMemo(() => outageCurve(spans), [spans]);
  const maxHours = Math.max(0, ...lines.flat().map((point) => point.hours));
  const yTicks = useMemo(() => hourTicks(maxHours), [maxHours]);
  const top = yTicks.at(-1) || 1;
  const rangeMs = to - from;
  const innerWidth = Math.max(0, (width ?? 0) - MARGIN.left - MARGIN.right);
  const innerHeight = HEIGHT - MARGIN.top - MARGIN.bottom;

  const x = (t: number) => MARGIN.left + ((t - from) / rangeMs) * innerWidth;
  const y = (hours: number) => MARGIN.top + (1 - hours / top) * innerHeight;
  const path = (line: CurvePoint[]) =>
    line.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.t).toFixed(1)},${y(p.hours).toFixed(1)}`).join("");
  const area = (line: CurvePoint[]) =>
    `${path(line)}L${x(line.at(-1)!.t).toFixed(1)},${y(0)}L${x(line[0].t).toFixed(1)},${y(0)}Z`;

  const active = activeT === null ? null : stateAt(spans, activeT);

  function handlePointerMove(event: PointerEvent<SVGRectElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    setActiveT(from + ((event.clientX - bounds.left) / bounds.width) * rangeMs);
  }

  function handleKeyDown(event: KeyboardEvent<SVGSVGElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const step = event.key === "ArrowLeft" ? -KEY_STEP_MS : KEY_STEP_MS;
    setActiveT((t) => Math.min(to, Math.max(from, (t ?? to) + step)));
  }

  const activeX = activeT === null ? 0 : x(activeT);

  return (
    <div ref={containerRef} className="relative w-full" style={{ height: HEIGHT }}>
      {width !== null && (
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label="Hours without electricity over time: the line climbs during each blackout and drops to zero when power comes back. Use the left and right arrow keys to read values."
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onFocus={() => setActiveT((t) => t ?? to)}
          onBlur={() => setActiveT(null)}
          className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/40"
        >
          {yTicks.map((tick) => (
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
                {formatTick(tick)}
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
              {formatAxisTime(tick, rangeMs)}
            </text>
          ))}

          {lines.map((line, index) => (
            <g key={index}>
              <path d={area(line)} fill={BLACKOUT_COLOR} fillOpacity={0.12} />
              <path d={path(line)} fill="none" stroke={BLACKOUT_COLOR} strokeWidth={2} strokeLinejoin="round" />
            </g>
          ))}

          {active && (
            <>
              <line
                x1={activeX}
                x2={activeX}
                y1={MARGIN.top}
                y2={MARGIN.top + innerHeight}
                strokeWidth={1}
                className="stroke-zinc-400 dark:stroke-zinc-500"
              />
              <circle
                cx={activeX}
                cy={y(active.hours)}
                r={4}
                strokeWidth={2}
                fill={BLACKOUT_COLOR}
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

      {activeT !== null && width !== null && (
        <div
          role="status"
          className="pointer-events-none absolute top-2 z-10 -translate-x-1/2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-sm dark:border-zinc-700 dark:bg-zinc-800"
          style={{ left: Math.min(Math.max(activeX, 90), width - 90) }}
        >
          <p className="whitespace-nowrap font-medium text-zinc-900 dark:text-zinc-50">{formatTooltipTime(activeT)}</p>
          <p className="mt-0.5 whitespace-nowrap text-zinc-500 dark:text-zinc-400">
            {active === null
              ? "No readings"
              : active.span.receivingAc
                ? "With electricity"
                : `${formatDuration(active.hours)} without electricity`}
          </p>
        </div>
      )}
    </div>
  );
}
