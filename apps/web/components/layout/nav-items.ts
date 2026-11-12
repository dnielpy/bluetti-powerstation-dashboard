import type { ComponentType } from "react";

import { AcOutletIcon } from "@/components/icons/ac-outlet-icon";
import { BlackoutIcon } from "@/components/icons/blackout-icon";
import { DashboardIcon } from "@/components/icons/dashboard-icon";
import { GridIcon } from "@/components/icons/grid-icon";
import type { IconProps } from "@/components/icons/icon-props";

export type NavItem = {
  href: string;
  label: string;
  Icon: ComponentType<IconProps>;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", Icon: DashboardIcon },
  { href: "/electricity", label: "Electricity", Icon: GridIcon },
  { href: "/blackouts", label: "Blackouts", Icon: BlackoutIcon },
  { href: "/consumption", label: "Consumption", Icon: AcOutletIcon },
];
