import { type IconProps, outlineIconProps } from "@/components/icons/icon-props";

export function DcOutletIcon({ className }: IconProps) {
  return (
    <svg {...outlineIconProps} className={className} aria-hidden>
      <rect x="4" y="3" width="16" height="14" rx="3" />
      <path d="M13 6 10 10.5h4L11 15" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}
