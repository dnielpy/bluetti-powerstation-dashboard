import { BatteryGauge } from "@/components/power-flow/battery-gauge";
import { buildFlowNodes } from "@/components/power-flow/flow-config";
import { FlowLine } from "@/components/power-flow/flow-line";
import { FlowNode } from "@/components/power-flow/flow-node";
import type { Summary } from "@/lib/api";

export function PowerFlow({ summary }: { summary: Summary }) {
  const nodes = buildFlowNodes(summary);

  return (
    <section aria-label="Power flow" className="@container relative aspect-square w-[min(100%,620px,calc(100dvh-10rem))]">
      <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full" aria-hidden>
        {nodes.map((node) => (
          <FlowLine key={node.label} node={node} />
        ))}
      </svg>
      <BatteryGauge percent={summary.battery_percent} charging={summary.ac || summary.dc} />
      {nodes.map((node) => (
        <FlowNode key={node.label} node={node} />
      ))}
    </section>
  );
}
