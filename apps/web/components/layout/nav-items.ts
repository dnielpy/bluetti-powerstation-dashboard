import type { ComponentType } from "react";

import { BatteryIcon } from "@/components/icons/battery-icon";
import { BlackoutIcon } from "@/components/icons/blackout-icon";
import { DashboardIcon } from "@/components/icons/dashboard-icon";
import type { IconProps } from "@/components/icons/icon-props";

export type NavItem = {
  href: string;
  label: string;
  Icon: ComponentType<IconProps>;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", Icon: DashboardIcon },
  { href: "/battery", label: "Battery", Icon: BatteryIcon },
  { href: "/blackouts", label: "Blackouts", Icon: BlackoutIcon },
];
