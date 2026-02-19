"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart03, Home01, Package, Signal01, Users01 } from "@untitledui/icons";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { SidebarNavigationSimple } from "@/components/application/app-navigation/sidebar-navigation/sidebar-simple";
import { signOut, useSession } from "@/lib/auth-client";
import { type GranularRoleName, canAccessPathWithRoles, getFirstAllowedModulePath } from "@/lib/iam/permissions";

type NavigationItem = {
    label: string;
    href: string;
    icon: any;
    current: boolean;
    requiredRole?: GranularRoleName;
    adminOnly?: boolean;
};

type MeRolesData = {
    isAdmin: boolean;
    roleNames: string[];
    firstAllowedPath: string | null;
};

const ME_ROLES_CACHE = new Map<string, MeRolesData>();

const ALL_NAVIGATION_ITEMS: NavigationItem[] = [
    { label: "Inicio", href: "/", icon: Home01, current: false },
    { label: "Inventario", href: "/stock", icon: Package, current: false, requiredRole: "stock-viewer" },
    { label: "SIMS", href: "/sims", icon: Signal01, current: false, requiredRole: "sims-viewer" },
    { label: "Reportes", href: "/reports/phones", icon: BarChart03, current: false, requiredRole: "report-viewer" },
    { label: "IAM", href: "/iam/users", icon: Users01, current: false, adminOnly: true },
];

const AuthLoadingScreen = () => (
    <div className="flex min-h-dvh w-full items-center justify-center bg-[#0a0a0a]">
        <div className="text-center">
            <div className="mb-3 inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-brand" />
            <p className="text-gray-400">Verificando autenticación...</p>
        </div>
    </div>
);

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export default function DashboardLayout({ children }: Readonly<DashboardLayoutProps>) {
    const pathname = usePathname();
    const router = useRouter();
    const { data: session, isPending } = useSession();
    const userId = session?.user?.id;

    const [meRoles, setMeRoles] = useState<MeRolesData | null>(null);
    const [rolesLoading, setRolesLoading] = useState(true);

    useEffect(() => {
        if (isPending) return;

        if (!userId) {
            router.replace("/login");
        }
    }, [isPending, router, userId]);

    useEffect(() => {
        const loadMeRoles = async () => {
            if (!userId) return;

            const cached = ME_ROLES_CACHE.get(userId);
            if (cached) {
                setMeRoles(cached);
                setRolesLoading(false);
                return;
            }

            try {
                setRolesLoading(true);

                const response = await fetch("/api/iam/me/roles");

                if (response.status === 401) {
                    router.replace("/login");
                    return;
                }

                if (!response.ok) {
                    throw new Error("Failed to load roles");
                }

                const json = (await response.json()) as { data?: MeRolesData };
                const resolvedRoles = json.data ?? null;

                if (resolvedRoles) {
                    ME_ROLES_CACHE.set(userId, resolvedRoles);
                }

                setMeRoles(resolvedRoles);
            } catch (error) {
                console.error("Error loading IAM roles:", error);
                toast.error("Error", {
                    description: "No se pudieron cargar los permisos del usuario.",
                });

                signOut();
                router.replace("/login");
            } finally {
                setRolesLoading(false);
            }
        };

        if (!userId) return;

        void loadMeRoles();
    }, [router, userId]);

    const filteredNavigation = useMemo(() => {
        if (!meRoles) {
            return [];
        }

        if (meRoles.isAdmin) {
            return ALL_NAVIGATION_ITEMS;
        }

        if (meRoles.roleNames.length === 0) {
            return [];
        }

        return ALL_NAVIGATION_ITEMS.filter((item) => {
            if (item.adminOnly) {
                return false;
            }

            if (!item.requiredRole) {
                return true;
            }

            return meRoles.roleNames.includes(item.requiredRole);
        });
    }, [meRoles]);

    useEffect(() => {
        if (rolesLoading || !meRoles) return;

        if (meRoles.isAdmin) {
            // Admin can access everything, but keep /iam/pending clean.
            if (pathname.startsWith("/iam/pending")) {
                router.replace(meRoles.firstAllowedPath ?? "/");
            }
            return;
        }

        if (meRoles.roleNames.length === 0) {
            if (!pathname.startsWith("/iam/pending")) {
                router.replace("/iam/pending");
            }
            return;
        }

        if (pathname.startsWith("/iam/pending")) {
            const redirectTo = meRoles.firstAllowedPath ?? getFirstAllowedModulePath(meRoles.roleNames) ?? "/";
            router.replace(redirectTo);
            return;
        }

        if (!canAccessPathWithRoles(pathname, meRoles.roleNames)) {
            const redirectTo = meRoles.firstAllowedPath ?? getFirstAllowedModulePath(meRoles.roleNames) ?? "/";
            router.replace(redirectTo);
        }
    }, [meRoles, pathname, rolesLoading, router]);

    if (isPending || rolesLoading) {
        return <AuthLoadingScreen />;
    }

    if (!session?.user) {
        return null;
    }

    return (
        <div className="relative min-h-dvh w-full">
            <SidebarNavigationSimple items={filteredNavigation} activeUrl={pathname} />

            <main className="min-h-screen w-full px-4 py-6 sm:px-6 lg:pr-6 lg:pl-[312px]">{children}</main>
        </div>
    );
}
