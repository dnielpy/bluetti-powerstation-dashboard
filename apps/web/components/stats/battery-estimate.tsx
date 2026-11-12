"use client";

import { useEffect, useState } from "react";

import { BatteryEstimateChart, type Projection } from "@/components/stats/battery-estimate-chart";
import { ChartCard } from "@/components/stats/chart-card";
import type { BatteryEstimate as Estimate } from "@/lib/api";
import { formatElapsed } from "@/lib/blackout-format";
import { formatTooltipTime } from "@/lib/chart-time";

const REFRESH_INTERVAL_MS = 30_000;

function projectionOf(estimate: Estimate): Projection | null {
  const { soc_estimate, drain_pct_per_hour, eta, eta_earliest, eta_latest } = estimate;
  if (estimate.status !== "discharging" || soc_estimate === null || drain_pct_per_hour === null) return null;
  if (!eta || !eta_earliest || !eta_latest) return null;
  return {
    now: Date.parse(estimate.computed_at),
    soc: soc_estimate,
    drainPerHour: drain_pct_per_hour,
    reserve: estimate.reserve_percent,
    eta: Date.parse(eta),
    earliest: Date.parse(eta_earliest),
    latest: Date.parse(eta_latest),
  };
}

function headline(estimate: Estimate): { title: string; detail?: string } {
  const reserve = `${estimate.reserve_percent}%`;
  switch (estimate.status) {
    case "discharging": {
      const now = Date.parse(estimate.computed_at);
      const eta = Date.parse(estimate.eta!);
      return {
        title: `Reaches ${reserve} at ${formatTooltipTime(eta)} · in ${formatElapsed(eta - now)}`,
        detail: `Between ${formatTooltipTime(Date.parse(estimate.eta_earliest!))} and ${formatTooltipTime(Date.parse(estimate.eta_latest!))}`,
      };
    }
    case "charging":
      return { title: "Charging", detail: "The estimate appears when the battery is discharging" };
    case "reserve":
      return { title: `At ${reserve} — turn it off`, detail: `Battery at ${estimate.soc}%` };
    case "idle":
      return { title: `More than 48 h until ${reserve}`, detail: "The current load barely drains the battery" };
    case "stale":
      return { title: "No recent readings", detail: "The Bluetti has not been read in the last minute" };
    default:
      return { title: "No readings yet" };
  }
}

function modelNote(estimate: Estimate): string {
  const parts = [];
  if (estimate.load_w !== null) parts.push(`${Math.round(estimate.load_w)} W now (10 s average)`);
  if (estimate.drain_pct_per_hour !== null) parts.push(`−${estimate.drain_pct_per_hour.toFixed(1)} %/h`);
  const { model } = estimate;
  parts.push(
    model.from_history
      ? `learned from ${model.steps_used} discharge steps: ${model.wh_per_percent.toFixed(1)} Wh per %, ${Math.round(model.idle_w)} W idle`
      : `no discharge history yet, using the nominal ${model.wh_per_percent.toFixed(1)} Wh per %`,
  );
  return parts.join(" · ");
}

/** When the battery reaches the reserve level at the current load, recalculated every 30 seconds. */
export function BatteryEstimate() {
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const response = await fetch("/api/battery-estimate", { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error(`Battery estimate responded with ${response.status}`);
        setEstimate(await response.json());
        setError(false);
      } catch {
        if (!controller.signal.aborted) setError(true);
      }
    }

    load();
    const id = setInterval(load, REFRESH_INTERVAL_MS);
    return () => {
      clearInterval(id);
      controller.abort();
    };
  }, []);

  const projection = estimate ? projectionOf(estimate) : null;
  const { title, detail } = estimate ? headline(estimate) : { title: error ? "API unavailable" : "Estimating…" };

  return (
    <ChartCard
      id="battery-estimate-title"
      title="Battery runtime"
      subtitle={estimate ? `Recalculated every 30 s · ${modelNote(estimate)}` : "Recalculated every 30 s"}
    >
      <div aria-live="polite" className="mb-3">
        <p
          className={`text-lg font-semibold tabular-nums ${
            estimate?.status === "reserve" ? "text-red-600 dark:text-red-500" : "text-zinc-900 dark:text-zinc-50"
          }`}
        >
          {title}
        </p>
        {detail && <p className="text-sm text-zinc-500 tabular-nums dark:text-zinc-400">{detail}</p>}
      </div>
      {projection ? (
        <BatteryEstimateChart projection={projection} />
      ) : (
        <div className="h-24 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800" aria-hidden />
      )}
    </ChartCard>
  );
}
