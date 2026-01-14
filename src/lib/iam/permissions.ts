export type GranularRoleName = "stock-viewer" | "sims-viewer" | "report-viewer";

export const GRANULAR_ROLE_DEFAULT_ROUTES: ReadonlyArray<{ role: GranularRoleName; href: string }> = [
    { role: "stock-viewer", href: "/stock" },
    { role: "sims-viewer", href: "/sims" },
    { role: "report-viewer", href: "/reports/phones" },
] as const;

export function getFirstAllowedModulePath(roleNames: string[]): string | null {
    const roleNameSet = new Set(roleNames);

    for (const { role, href } of GRANULAR_ROLE_DEFAULT_ROUTES) {
        if (roleNameSet.has(role)) {
            return href;
        }
    }

    return null;
}

export function canAccessPathWithRoles(pathname: string, roleNames: string[]): boolean {
    if (pathname === "/" || pathname.startsWith("/iam/pending")) {
        return true;
    }

    if (pathname.startsWith("/stock")) {
        return roleNames.includes("stock-viewer");
    }

    if (pathname.startsWith("/sims")) {
        return roleNames.includes("sims-viewer");
    }

    if (pathname.startsWith("/reports")) {
        return roleNames.includes("report-viewer");
    }

    // Everything else under dashboard is currently treated as restricted.
    return false;
}
