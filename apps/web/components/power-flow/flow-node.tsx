import { ACTIVE_STYLES, CORNER_POSITION, type FlowNodeData } from "@/components/power-flow/flow-config";

export function FlowNode({ node }: { node: FlowNodeData }) {
  const active = node.watts > 0;
  const styles = ACTIVE_STYLES[node.direction];
  const position = CORNER_POSITION[node.corner];

  return (
    <>
      <div
        className={`absolute flex h-[17%] w-[17%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-white ring-8 transition-colors ${position.node} ${
          active ? `${styles.circle} ${styles.halo}` : "bg-zinc-400 ring-zinc-300/40 dark:bg-zinc-600 dark:ring-zinc-700/40"
        }`}
      >
        <node.Icon className="h-1/2 w-1/2" />
      </div>
      <div className={`absolute flex -translate-y-1/2 flex-col ${position.text}`}>
        <p className="text-[length:6.8cqw] leading-tight font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
          {node.watts}
          <span className="ml-0.5 text-[length:4cqw] font-medium">W</span>
        </p>
        <p className="text-[length:max(12px,3.2cqw)] text-zinc-600 dark:text-zinc-400">{node.label}</p>
      </div>
    </>
  );
}
