"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowCircleRight, ArrowRight, BarChart03, Box, CheckCircle, Database01, Signal01, Truck01 } from "@untitledui/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/base/buttons/button";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icons";
import { useKpiData } from "@/hooks/use-kpi-data";
import { useSimsData } from "@/hooks/use-sims-data";
import { useStockData } from "@/hooks/use-stock-data";
import { useSession } from "@/lib/auth-client";

// Get current quarter date range
const getCurrentQuarterRange = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-11

    if (month >= 0 && month <= 2) {
        return { start: `${year}-01-01`, end: `${year}-03-31` };
    } else if (month >= 3 && month <= 5) {
        return { start: `${year}-04-01`, end: `${year}-06-30` };
    } else if (month >= 6 && month <= 8) {
        return { start: `${year}-07-01`, end: `${year}-09-30` };
    } else {
        return { start: `${year}-10-01`, end: `${year}-12-31` };
    }
};

interface QuickAccessCardProps {
    title: string;
    description: string;
    icon: any;
    href: string;
    stats?: {
        label: string;
        value: string | number;
    }[];
    loading?: boolean;
}

function QuickAccessCard({ title, description, icon: Icon, href, stats = [], loading = false }: QuickAccessCardProps) {
    return (
        <Link href={href}>
            <div className="group cursor-pointer rounded-lg border border-surface bg-surface-1 p-6 transition-all hover:border-white/20 hover:shadow-md/70 hover:shadow-brand-600">
                <div className="mb-4 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <FeaturedIcon size="md" color="brand" theme="modern-neue" icon={Icon} />
                        <div>
                            <h3 className="font-semibold text-primary transition-colors">{title}</h3>
                            <p className="mt-1 text-sm text-tertiary">{description}</p>
                        </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-tertiary transition-all group-hover:translate-x-1 group-hover:text-white" />
                </div>

                {stats.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 gap-3 border-t border-surface pt-4">
                        {stats.map((stat, idx) => (
                            <div key={idx}>
                                <p className="text-xs text-tertiary">{stat.label}</p>
                                <p className="mt-1 text-lg font-semibold text-primary">
                                    {loading ? "..." : stat.value !== undefined && stat.value !== null ? stat.value : 0}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Link>
    );
}

type MeRolesData = {
    isAdmin: boolean;
    roleNames: string[];
    firstAllowedPath: string | null;
};

export default function HomePage() {
    const router = useRouter();
    const { data: session } = useSession();
    const [meRoles, setMeRoles] = useState<MeRolesData | null>(null);

    const canViewStock = Boolean(meRoles?.isAdmin || meRoles?.roleNames.includes("stock-viewer"));
    const canViewSims = Boolean(meRoles?.isAdmin || meRoles?.roleNames.includes("sims-viewer"));
    const canViewReports = Boolean(meRoles?.isAdmin || meRoles?.roleNames.includes("report-viewer"));

    useEffect(() => {
        const loadRoles = async () => {
            const response = await fetch("/api/iam/me/roles");
            if (!response.ok) return;
            const json = (await response.json()) as { data?: MeRolesData };
            setMeRoles(json.data ?? null);
        };

        if (!session?.user) return;
        void loadRoles();
    }, [session?.user]);

    // Use state to avoid hydration issues
    const [quarterRange, setQuarterRange] = useState<{ start: string; end: string } | null>(null);
    const [currentQuarter, setCurrentQuarter] = useState<string>("");

    useEffect(() => {
        const range = getCurrentQuarterRange();
        setQuarterRange(range);
        const month = new Date().getMonth();
        setCurrentQuarter(`Q${Math.floor((month + 3) / 3)} ${new Date().getFullYear()}`);
    }, []);

    const { data: kpiData, loading: kpiLoading } = useKpiData({
        startDate: quarterRange?.start,
        endDate: quarterRange?.end,
        enabled: canViewReports && Boolean(quarterRange),
    });

    const {
        isLoading: stockLoading,
        lastUpdated: stockLastUpdated,
        totalRecords: stockTotalRecords,
        statusSummary: stockStatusSummary,
    } = useStockData(15 * 60 * 1000, { summary: true, enabled: canViewStock });
    const { isLoading: simsLoading, totalRecords: simsTotal, metadata: simsMetadata } = useSimsData("", undefined, { enabled: canViewSims });

    const [shippingInProgress, setShippingInProgress] = useState<number>(0);
    const [shippingLoading, setShippingLoading] = useState(false);

    useEffect(() => {
        const loadShippingSummary = async () => {
            try {
                setShippingLoading(true);
                const response = await fetch("/api/assignments?summary=true");
                if (!response.ok) return;

                const json = (await response.json()) as { shippingInProgress?: number };
                setShippingInProgress(Number(json.shippingInProgress ?? 0));
            } catch (error) {
                console.error("Error loading shipping summary:", error);
            } finally {
                setShippingLoading(false);
            }
        };

        if (!session?.user) return;
        if (!canViewStock) return;

        void loadShippingSummary();
    }, [canViewStock, session?.user]);

    const stockCountsByStatus = useMemo(() => {
        const map = new Map<string, number>();

        if (!stockStatusSummary) {
            return map;
        }

        stockStatusSummary.forEach((item) => {
            map.set(item.status, item.count);
        });

        return map;
    }, [stockStatusSummary]);

    // Calculate Stock stats - Disponibles = NEW + USED según estados de la DB
    const stockStats = useMemo(() => {
        const refurbished = (stockCountsByStatus.get("REPAIRED") ?? 0) + (stockCountsByStatus.get("USED") ?? 0);

        return {
            total: stockTotalRecords,
            refurbished,
        };
    }, [stockCountsByStatus, stockTotalRecords]);

    const simsInactiveCount = simsMetadata?.totalInactive ?? 0;

    const simsTotalCount = useMemo(() => {
        if (simsLoading) return 0;

        if (simsMetadata) {
            return (simsMetadata.totalActive ?? 0) + (simsMetadata.totalInactive ?? 0);
        }

        return simsTotal ?? 0;
    }, [simsLoading, simsMetadata, simsTotal]);

    // Format date helper
    const formatDate = (dateString: string | null) => {
        if (!dateString) return "N/A";
        try {
            return new Date(dateString).toLocaleDateString("es-ES", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            });
        } catch {
            return dateString;
        }
    };

    const kpiCards = useMemo(() => {
        if (kpiLoading || !kpiData || !quarterRange) {
            return [
                { label: "Solicitudes", value: "...", icon: Database01, subtitle: "" },
                { label: "Recambios", value: "...", icon: ArrowCircleRight, subtitle: "" },
                { label: "Asignaciones", value: "...", icon: CheckCircle, subtitle: "" },
                { label: "Stock", value: "...", icon: Box, subtitle: "" },
            ];
        }

        return [
            {
                label: "Solicitudes",
                value: kpiData.requests || 0,
                icon: Database01,
                subtitle: `Período ${currentQuarter} • Pendientes: ${(kpiData.requests_pending || 0).toLocaleString("es-AR")}`,
            },
            {
                label: "Recambios",
                value: kpiData.replacements || 0,
                icon: ArrowCircleRight,
                subtitle: `${kpiData.replacement_rate?.toFixed(1) || 0}% del total`,
            },
            {
                label: "Asignaciones",
                value: kpiData.assignments || 0,
                icon: CheckCircle,
                subtitle: "Nuevas asignaciones",
            },
            {
                label: "Stock Disponible",
                value: kpiData.stock_current || 0,
                icon: Box,
                subtitle: `${kpiData.total_devices || 0} dispositivos totales`,
            },
        ];
    }, [kpiData, kpiLoading, quarterRange, currentQuarter]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">Inicio</h1>
                <p className="text-sm text-tertiary">Resumen general y accesos rápidos</p>
            </div>

            {/* Alertas */}
            {(canViewStock || canViewSims) && (
                <section className="space-y-3">
                    <h2 className="text-lg font-medium text-primary">Alertas</h2>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {canViewStock && !stockLoading && stockStats.total > 0 && stockStats.total < 40 && (
                            <div className="border-warning/30 bg-warning/5 rounded-lg border p-4">
                                <div className="flex items-center gap-3">
                                    <FeaturedIcon size="md" color="warning" theme="modern-neue" icon={Box} />
                                    <div className="flex flex-col">
                                        <p className="text-sm font-medium text-primary">Stock bajo</p>
                                        <p className="text-xs text-tertiary">Umbral: 40</p>
                                    </div>
                                </div>
                                <p className="mt-3 text-sm text-secondary">
                                    Inventario total: <span className="font-semibold">{stockStats.total}</span>
                                </p>
                            </div>
                        )}

                        {canViewSims && (
                            <div className="rounded-lg border border-surface bg-surface-1 p-4">
                                <div className="flex items-center gap-3">
                                    <FeaturedIcon size="md" color="brand" theme="modern-neue" icon={Signal01} />
                                    <div className="flex flex-col">
                                        <p className="text-sm font-medium text-primary">SIMs inactivas</p>
                                        {simsMetadata?.totalInactive !== undefined && !simsLoading && <p className="text-xs text-tertiary">Cantidad actual</p>}
                                    </div>
                                </div>
                                <p className="mt-3 text-sm text-secondary">
                                    Total: <span className="font-semibold">{simsLoading ? "..." : simsInactiveCount.toLocaleString("es-AR")}</span>
                                </p>
                            </div>
                        )}

                        {!((canViewStock && !stockLoading && stockStats.total > 0 && stockStats.total < 40) || canViewSims) && (
                            <div className="rounded-lg border border-surface bg-surface-1 p-4">
                                <p className="text-sm text-tertiary">Sin alertas por ahora.</p>
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* Operativo del día */}
            <section className="space-y-3">
                <h2 className="text-lg font-medium text-primary">Operativo del día</h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {canViewStock && (
                        <QuickAccessCard
                            title="Inventario"
                            description={stockLastUpdated ? `Actualizado: ${formatDate(stockLastUpdated)}` : "Gestión de dispositivos"}
                            icon={Box}
                            href="/stock"
                            loading={stockLoading}
                            stats={[
                                { label: "Total", value: stockStats.total },
                                { label: "Reacondicionados", value: stockStats.refurbished },
                            ]}
                        />
                    )}

                    {canViewStock && (
                        <QuickAccessCard
                            title="Envíos"
                            description="Asig. con envío pendiente"
                            icon={Truck01}
                            href="/stock"
                            loading={shippingLoading}
                            stats={[{ label: "En curso", value: shippingInProgress }]}
                        />
                    )}

                    {canViewSims && (
                        <QuickAccessCard
                            title="SIMS"
                            description="Gestión de tarjetas SIM"
                            icon={Signal01}
                            href="/sims"
                            loading={simsLoading}
                            stats={[
                                { label: "Total", value: simsTotalCount },
                                { label: "Inactivas", value: simsInactiveCount },
                            ]}
                        />
                    )}
                </div>
            </section>

            {/* Indicadores del período */}
            {canViewReports && (
                <section className="space-y-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <h2 className="text-lg font-medium text-primary">Indicadores del período</h2>
                        <Button color="secondary" size="sm" iconLeading={BarChart03} onClick={() => router.push("/reports/phones")}>
                            Ver reportes
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {kpiCards.map((card, idx) => {
                            const Icon = card.icon;
                            return (
                                <div key={idx} className="flex flex-col gap-4 rounded-lg border border-surface bg-surface-1 p-4 shadow-xs">
                                    <div className="flex items-center gap-3">
                                        <FeaturedIcon size="md" color="brand" theme="modern-neue" icon={Icon} />
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-secondary">{card.label}</span>
                                            <span className="text-2xl font-semibold text-primary">{card.value}</span>
                                        </div>
                                    </div>
                                    {card.subtitle && <p className="text-xs text-tertiary">{card.subtitle}</p>}
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* Quick Actions */}
            {meRoles?.isAdmin && (
                <section className="space-y-3">
                    <h2 className="text-lg font-medium text-primary">Acciones Rápidas</h2>
                    <div className="flex flex-wrap gap-3">
                        <Button color="secondary" size="md" iconLeading={Box} onClick={() => router.push("/stock")}>
                            Gestionar Inventario
                        </Button>
                        <Button color="secondary" size="md" iconLeading={BarChart03} onClick={() => router.push("/reports/phones")}>
                            Ver Reportes
                        </Button>
                    </div>
                </section>
            )}
        </div>
    );
}
