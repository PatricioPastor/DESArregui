"use client";

import { useContext } from "react";
import { cx } from "@/utils/cx";
import { AuthShellHeaderContext } from "./auth-shell-header-provider";

interface AuthShellHeaderProps {
    className?: string;
}

export const AuthShellHeader = ({ className }: AuthShellHeaderProps) => {
    const context = useContext(AuthShellHeaderContext);

    if (!context) {
        throw new Error("AuthShellHeader must be used within AuthShellHeaderProvider");
    }

    const { header } = context;
    const titleText = header.subtitle ? `${header.title} - ${header.subtitle}` : header.title;

    return (
        <header
            className={cx("flex h-[var(--auth-shell-header-height)] items-center justify-between border-b border-secondary bg-primary px-4 lg:px-6", className)}
        >
            <h1 className="truncate text-lg font-semibold text-primary" title={titleText}>
                {header.title}
                {header.subtitle ? <span className="ml-2 text-sm font-medium text-tertiary">{header.subtitle}</span> : null}
            </h1>

            {header.actions ? <div className="ml-4 flex shrink-0 items-center gap-2">{header.actions}</div> : null}
        </header>
    );
};
