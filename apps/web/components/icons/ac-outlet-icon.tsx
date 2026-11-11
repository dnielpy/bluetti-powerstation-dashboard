import { type IconProps, outlineIconProps } from "@/components/icons/icon-props";

export function AcOutletIcon({ className }: IconProps) {
  return (
    <svg {...outlineIconProps} className={className} aria-hidden>
      <rect x="4" y="3" width="16" height="14" rx="3" />
      <path d="M13 5.5 10.5 9H14l-2.5 3.5" />
      <path d="M7 14c1-1.6 2-1.6 3 0s2 1.6 3 0 2-1.6 3 0" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}
