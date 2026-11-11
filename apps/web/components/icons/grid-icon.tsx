import { type IconProps, outlineIconProps } from "@/components/icons/icon-props";

export function GridIcon({ className }: IconProps) {
  return (
    <svg {...outlineIconProps} className={className} aria-hidden>
      <path d="M12 2 7 21M12 2l5 19" />
      <path d="M4.5 7h15M6 11.5h12" />
      <path d="M8.8 14.5 15.2 19M15.2 14.5 8.8 19" />
    </svg>
  );
}
