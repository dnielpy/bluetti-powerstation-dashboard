import { ACTIVE_STYLES, type FlowNodeData } from "@/components/power-flow/flow-config";

export function FlowLine({ node }: { node: FlowNodeData }) {
  return (
    <g>
      <path
        d={node.path}
        fill="none"
        strokeWidth={10}
        strokeLinecap="round"
        className="stroke-white dark:stroke-zinc-800"
      />
      {node.watts > 0 && (
        <path
          d={node.path}
          fill="none"
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray="14 26"
          className={`flow-line ${node.direction === "out" ? "flow-line-out" : ""} ${ACTIVE_STYLES[node.direction].stroke}`}
        />
      )}
    </g>
  );
}
