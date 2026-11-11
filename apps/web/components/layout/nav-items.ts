import type { ComponentType } from "react";

import { DashboardIcon } from "@/components/icons/dashboard-icon";
import type { IconProps } from "@/components/icons/icon-props";

export type NavItem = {
  href: string;
  label: string;
  Icon: ComponentType<IconProps>;
};

export const NAV_ITEMS: NavItem[] = [{ href: "/", label: "Dashboard", Icon: DashboardIcon }];
