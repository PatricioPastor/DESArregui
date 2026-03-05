"use client";

import type { CSSProperties, ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "@untitledui/icons";
import Image from "next/image";
import { Button as AriaButton, DialogTrigger as AriaDialogTrigger, Popover as AriaPopover } from "react-aria-components";
import { Avatar } from "@/components/base/avatar/avatar";
import { useSession } from "@/lib/auth-client";
import { cx } from "@/utils/cx";
import { MobileNavigationHeader } from "../base-components/mobile-header";
import { NavAccountCard, NavAccountMenu } from "../base-components/nav-account-card";
import { NavItemBase } from "../base-components/nav-item";
import { NavList } from "../base-components/nav-list";
import type { NavItemType } from "../config";

const isRouteActive = (itemHref: string, activeUrl?: string): boolean => {
    if (!activeUrl || !itemHref) return false;
    if (itemHref === activeUrl) return true;
    return activeUrl.startsWith(itemHref + "/");
};

interface SidebarNavigationProps {
    /** URL of the currently active item. */
    activeUrl?: string;
    /** List of items to display. */
    items: NavItemType[];
    /** List of footer items to display. */
    footerItems?: NavItemType[];
    /** Feature card to display. */
    featureCard?: ReactNode;
    /** Whether to show the account card. */
    showAccountCard?: boolean;
    /** Whether to hide the right side border. */
    hideBorder?: boolean;
    /** Additional CSS classes to apply to the sidebar. */
    className?: string;
    /** Whether desktop sidebar is collapsed. */
    collapsed?: boolean;
    /** Handler for desktop collapsed mode changes. */
    onCollapsedChange?: (collapsed: boolean) => void;
}

export const SidebarNavigationSimple = ({
    activeUrl,
    items,
    footerItems = [],
    featureCard,
    showAccountCard = true,
    hideBorder = false,
    className,
    collapsed = false,
    onCollapsedChange,
}: SidebarNavigationProps) => {
    const { data: session } = useSession();
    const desktopSidebarWidth = collapsed ? "var(--auth-shell-sidebar-width-collapsed)" : "var(--auth-shell-sidebar-width-expanded)";

    const content = (
        <aside
            style={
                {
                    "--width": desktopSidebarWidth,
                } as CSSProperties
            }
            className={cx(
                "flex h-full w-full max-w-full flex-col justify-between overflow-auto bg-primary transition-[width] duration-200 ease-out lg:w-(--width)",
                !hideBorder && "border-secondary md:border-r",
                className,
            )}
        >
            <div
                className={cx(
                    "flex h-[var(--auth-shell-strip-height)] items-center border-b border-secondary",
                    collapsed ? "justify-center px-2" : "px-3 lg:px-4",
                )}
            >
                {!collapsed ? (
                    <div className="flex min-w-0 flex-1 items-center">
                        <Image alt="DESA" src="/logo.png" width={100} height={36} priority />
                    </div>
                ) : null}

                <button
                    type="button"
                    aria-label={collapsed ? "Expandir barra lateral" : "Colapsar barra lateral"}
                    aria-expanded={!collapsed}
                    onClick={() => onCollapsedChange?.(!collapsed)}
                    className="hidden shrink-0 cursor-pointer rounded-md p-1.5 text-fg-quaternary outline-focus-ring transition hover:bg-primary_hover hover:text-fg-quaternary_hover focus-visible:outline-2 focus-visible:outline-offset-2 lg:inline-flex"
                >
                    {collapsed ? <ChevronRight aria-hidden="true" className="size-5" /> : <ChevronLeft aria-hidden="true" className="size-5" />}
                </button>
            </div>

            <NavList activeUrl={activeUrl} items={items} collapsed={collapsed} />

            <div className={cx("mt-auto flex flex-col gap-4", collapsed ? "px-3 py-5" : "px-2 py-4 lg:px-4 lg:py-6")}>
                {footerItems.length > 0 && (
                    <ul className="flex flex-col">
                        {footerItems.map((item) => (
                            <li key={item.label} className="py-0.5">
                                <NavItemBase
                                    badge={item.badge}
                                    icon={item.icon}
                                    href={item.href}
                                    type="link"
                                    current={isRouteActive(item.href!, activeUrl)}
                                    iconOnly={collapsed}
                                >
                                    {item.label}
                                </NavItemBase>
                            </li>
                        ))}
                    </ul>
                )}

                {featureCard}

                {showAccountCard && !collapsed ? <NavAccountCard /> : null}

                {showAccountCard && collapsed ? (
                    <AriaDialogTrigger>
                        <AriaButton
                            className={({ isPressed, isFocused }) =>
                                cx("group relative inline-flex rounded-full outline-focus-ring", (isPressed || isFocused) && "outline-2 outline-offset-2")
                            }
                        >
                            <Avatar
                                status={session?.user?.emailVerified ? "online" : "offline"}
                                src={session?.user?.image}
                                size="md"
                                alt={session?.user?.name ?? "Usuario"}
                            />
                        </AriaButton>
                        <AriaPopover
                            placement="right bottom"
                            offset={8}
                            crossOffset={6}
                            className={({ isEntering, isExiting }) =>
                                cx(
                                    "will-change-transform",
                                    isEntering &&
                                        "duration-300 ease-out animate-in fade-in placement-right:slide-in-from-left-2 placement-top:slide-in-from-bottom-2 placement-bottom:slide-in-from-top-2",
                                    isExiting &&
                                        "duration-150 ease-in animate-out fade-out placement-right:slide-out-to-left-2 placement-top:slide-out-to-bottom-2 placement-bottom:slide-out-to-top-2",
                                )
                            }
                        >
                            <NavAccountMenu />
                        </AriaPopover>
                    </AriaDialogTrigger>
                ) : null}
            </div>
        </aside>
    );

    return (
        <>
            {/* Mobile header navigation */}
            <MobileNavigationHeader>{content}</MobileNavigationHeader>

            {/* Desktop sidebar navigation */}
            <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex">{content}</div>

            {/* Placeholder to take up physical space because the real sidebar has `fixed` position. */}
            <div
                style={{
                    paddingLeft: desktopSidebarWidth,
                }}
                className="invisible hidden lg:sticky lg:top-0 lg:bottom-0 lg:left-0 lg:block"
            />
        </>
    );
};
