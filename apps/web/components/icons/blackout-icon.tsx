import { type IconProps, outlineIconProps } from "@/components/icons/icon-props";

export function BlackoutIcon({ className }: IconProps) {
  return (
    <svg {...outlineIconProps} className={className} aria-hidden>
      <path d="M13 3 6 13h5l-1 8 7-10h-5l1-8Z" />
      <path d="M3 3l18 18" />
    </svg>
  );
}
