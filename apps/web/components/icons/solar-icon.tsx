import { type IconProps, outlineIconProps } from "@/components/icons/icon-props";

export function SolarIcon({ className }: IconProps) {
  return (
    <svg {...outlineIconProps} className={className} aria-hidden>
      <path d="M5 8h14l2 9H3z" />
      <path d="M12 8v9M4 12.5h16M8.5 8 7.5 17M15.5 8l1 9" />
      <path d="M12 17v3M9 20h6" />
      <path d="M12 2v2M7.5 3.5l1 1.5M16.5 3.5l-1 1.5" />
    </svg>
  );
}
