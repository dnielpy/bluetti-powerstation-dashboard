import type { IconProps } from "@/components/icons/icon-props";

export function BatteryIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <rect x="2" y="5" width="20" height="16" rx="3" fill="currentColor" />
      <rect x="5" y="2.5" width="4" height="3" rx="1" fill="currentColor" />
      <rect x="15" y="2.5" width="4" height="3" rx="1" fill="currentColor" />
      <path d="M6 13h4M8 11v4M14 13h4" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
