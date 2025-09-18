"use client";

import { useState } from "react";
import { cx } from "@/utils/cx";
import type { NavItemDividerType, NavItemType } from "../config";
import { NavItemBase } from "./nav-item";

const isRouteActive = (itemHref: string, activeUrl?: string): boolean => {
    if (!activeUrl || !itemHref) return false;
    if (itemHref === activeUrl) return true;
    return activeUrl.startsWith(itemHref + '/');
};

interface NavListProps {
    /** URL of the currently active item. */
    activeUrl?: string;
    /** Additional CSS classes to apply to the list. */
    className?: string;
    /** List of items to display. */
    items: (NavItemType | NavItemDividerType)[];
}

export const NavList = ({ activeUrl, items, className }: NavListProps) => {
    const [open, setOpen] = useState(false);
    const activeItem = items.find((item) => isRouteActive(item.href!, activeUrl) || item.items?.some((subItem) => isRouteActive(subItem.href, activeUrl)));
    const [currentItem, setCurrentItem] = useState(activeItem);

    return (
        <ul className={cx("mt-4 flex flex-col px-2 lg:px-4", className)}>

            {items.map((item, index) => {
                if (item.divider) {
                    return (
                        <li key={index} className="w-full px-0.5 py-2">
                            <hr className="h-px w-full border-none bg-border-secondary" />
                        </li>
                    );
                }

                if (item.items?.length) {
                    return (
                        <details
                            key={item.label}
                            open={isRouteActive(item.href!, activeUrl)}
                            className="appearance-none py-0.5"
                            onToggle={(e) => {
                                setOpen(e.currentTarget.open);
                                setCurrentItem(item);
                            }}
                        >
                            <NavItemBase href={item.href} badge={item.badge} icon={item.icon} type="collapsible">
                                {item.label}
                            </NavItemBase>

                            <dd>
                                <ul className="py-0.5">
                                    {item.items.map((childItem) => (
                                        <li key={childItem.label} className="py-0.5">
                                            <NavItemBase
                                                href={childItem.href}
                                                badge={childItem.badge}
                                                type="collapsible-child"
                                                current={isRouteActive(childItem.href, activeUrl)}
                                            >
                                                {childItem.label}
                                            </NavItemBase>
                                        </li>
                                    ))}
                                </ul>
                            </dd>
                        </details>
                    );
                }

                return (
                    <li key={item.label} className="py-0.5">
                        <NavItemBase
                            type="link"
                            badge={item.badge}
                            icon={item.icon}
                            href={item.href}
                            current={isRouteActive(item.href!, activeUrl)}
                            open={open && currentItem?.href === item.href}
                        >
                            {item.label}
                        </NavItemBase>
                    </li>
                );
            })}
        </ul>
    );
};
