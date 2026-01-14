"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowCircleRight, ArrowRight, BarChart03, Box, CheckCircle, Database01, Signal01 } from "@untitledui/icons";
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
            <div className="group cursor-pointer rounded-lg border border-surface bg-surface-1 p-6 transition-all hover:border-brand/20 hover:shadow-md">
                <div className="mb-4 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <FeaturedIcon size="md" color="brand" theme="modern-neue" icon={Icon} />
                        <div>
                            <h3 className="font-semibold text-primary transition-colors group-hover:text-brand">{title}</h3>
                            <p className="mt-1 text-sm text-tertiary">{description}</p>
                        </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-tertiary transition-all group-hover:translate-x-1 group-hover:text-brand" />
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
    });

    const { data: stockData, isLoading: stockLoading, statusSummary } = useStockData();
    const { data: simsData, isLoading: simsLoading, totalRecords: simsTotal } = useSimsData();

    // Calculate Stock stats - Disponibles = NEW + USED según estados de la DB
    const stockStats = useMemo(() => {
        if (!stockData || stockData.length === 0) return { total: 0, available: 0, assigned: 0 };

        // Disponibles son los dispositivos con status NEW o USED
        const available = stockData.filter((record) => {
            return record.status === "NEW" || record.status === "USED";
        }).length;

        // Asignados son los que tienen status ASSIGNED o tienen una asignación activa
        const assigned = stockData.filter((record) => {
            // Usar is_assigned si está disponible, sino verificar el status o las asignaciones
            if (record.is_assigned !== undefined) {
                return record.is_assigned;
            }
            const latestAssignment = record.raw?.assignments?.[0];
            const hasActiveAssignment = latestAssignment && latestAssignment.status === "active";
            return record.status === "ASSIGNED" || hasActiveAssignment;
        }).length;

        return {
            total: stockData.length,
            available,
            assigned,
        };
    }, [stockData]);

    // Calculate SIMS total - use totalRecords if available, otherwise fallback to data length
    const simsTotalCount = useMemo(() => {
        // While loading, return 0 (will show "..." via loading prop)
        if (simsLoading) return 0;

        // Prefer totalRecords from API response
        if (simsTotal !== undefined && simsTotal !== null && simsTotal > 0) {
            return simsTotal;
        }

        // Fallback to data length if we have data
        if (simsData && Array.isArray(simsData) && simsData.length > 0) {
            return simsData.length;
        }

        // Default to 0 if no data
        return 0;
    }, [simsLoading, simsTotal, simsData]);

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
                subtitle: `Período ${currentQuarter}`,
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
                <h1 className="text-2xl font-semibold tracking-tight">Mesa de Entrada</h1>
                <p className="text-sm text-tertiary">Dashboard principal de Mesa de Ayuda - Nivel 2</p>
            </div>

            {/* Main KPIs */}
            <section className="space-y-3">
                <h2 className="text-lg font-medium text-primary">Indicadores Principales</h2>
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

            {/* Quick Access Cards */}
            <section className="space-y-3">
                <h2 className="text-lg font-medium text-primary">Acceso Rápido</h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {(meRoles?.isAdmin || meRoles?.roleNames.includes("stock-viewer")) && (
                        <QuickAccessCard
                            title="Inventario"
                            description="Gestión de dispositivos"
                            icon={Box}
                            href="/stock"
                            loading={stockLoading}
                            stats={[
                                { label: "Total", value: stockStats.total },
                                { label: "Disponibles", value: stockStats.available },
                            ]}
                        />
                    )}

                    {(meRoles?.isAdmin || meRoles?.roleNames.includes("sims-viewer")) && (
                        <QuickAccessCard
                            title="SIMS"
                            description="Gestión de tarjetas SIM"
                            icon={Signal01}
                            href="/sims"
                            loading={simsLoading}
                            stats={[{ label: "Total", value: simsTotalCount }]}
                        />
                    )}

                    {(meRoles?.isAdmin || meRoles?.roleNames.includes("report-viewer")) && (
                        <QuickAccessCard
                            title="Reportes"
                            description="Análisis y estadísticas"
                            icon={BarChart03}
                            href="/reports/phones"
                            stats={[{ label: "Período", value: currentQuarter || "..." }]}
                        />
                    )}
                </div>
            </section>

            {/* Status Summary */}
            {(meRoles?.isAdmin || meRoles?.roleNames.includes("stock-viewer")) && (
                <section className="space-y-3">
                    <h2 className="text-lg font-medium text-primary">Resumen de Estado</h2>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-1">
                        {/* Stock Status */}
                        <div className="rounded-lg border border-surface bg-surface-1 p-4">
                            <div className="mb-3 flex items-center gap-3">
                                <FeaturedIcon size="md" color="brand" theme="modern-neue" icon={Box} />
                                <h3 className="font-semibold text-primary">Estado Inventario</h3>
                            </div>
                            {stockLoading ? (
                                <div className="text-sm text-tertiary">Cargando...</div>
                            ) : (
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-tertiary">Dispositivos totales:</span>
                                        <span className="font-medium text-primary">{stockStats.total}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-tertiary">Disponibles:</span>
                                        <span className="text-success font-medium">{stockStats.available}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-tertiary">Asignados:</span>
                                        <span className="font-medium text-primary">{stockStats.assigned}</span>
                                    </div>
                                    {statusSummary && statusSummary.length > 0 && (
                                        <div className="mt-2 border-t border-surface pt-2">
                                            <p className="text-xs text-tertiary">{statusSummary.length} estados diferentes</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
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
