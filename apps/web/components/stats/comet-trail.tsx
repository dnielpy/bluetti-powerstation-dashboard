import type { CSSProperties } from "react";

const TAIL_LENGTH = 0.09;
const TAIL_LAYERS = 9;
const HEAD_LENGTH = 0.0001;

type CometTrailProps = {
  path: string;
  color: string;
  glow: string;
  clipPath: string;
};

function travel(length: number): CSSProperties {
  return { "--comet-length": length, "--comet-start": length, "--comet-end": length - 1 } as CSSProperties;
}

export function CometTrail({ path, color, glow, clipPath }: CometTrailProps) {
  const tail = Array.from({ length: TAIL_LAYERS }, (_, index) => (TAIL_LENGTH * (index + 1)) / TAIL_LAYERS);

  return (
    <g clipPath={clipPath} aria-hidden>
      <g style={{ filter: `drop-shadow(0 0 3px ${glow})` }}>
        {tail.map((length) => (
          <path
            key={length}
            d={path}
            pathLength={1}
            fill="none"
            stroke={color}
            strokeWidth={2.5}
            strokeOpacity={0.16}
            strokeLinecap="round"
            className="comet"
            style={travel(length)}
          />
        ))}
      </g>
      <g style={{ filter: `drop-shadow(0 0 4px ${glow}) drop-shadow(0 0 8px ${glow})` }}>
        <path d={path} pathLength={1} fill="none" stroke={glow} strokeWidth={9} strokeOpacity={0.35} strokeLinecap="round" className="comet" style={travel(HEAD_LENGTH)} />
        <path d={path} pathLength={1} fill="none" stroke={color} strokeWidth={5} strokeLinecap="round" className="comet" style={travel(HEAD_LENGTH)} />
        <path d={path} pathLength={1} fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round" className="comet" style={travel(HEAD_LENGTH)} />
      </g>
    </g>
  );
}
