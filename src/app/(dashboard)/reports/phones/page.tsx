"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowCircleRight, Box, HeartHand, Plus, Stars02 } from "@untitledui/icons";
import { toast } from "sonner";
import { useAuthShellHeader } from "@/components/application/app-navigation/auth-shell-header/use-auth-shell-header";
import { DateRangePicker } from "@/components/application/date-picker/date-range-picker";
import { Button } from "@/components/base/buttons/button";
import { Select } from "@/components/base/select/select";
import { KpiCardWithModal } from "@/components/dashboard/kpi-card-with-modal";
import { SyncTicketsButton } from "@/components/dashboard/sync-tickets-button";
import { usePhonesSummary } from "@/hooks/use-phones-summary";
import { useSession } from "@/lib/auth-client";
import { PhoneTicketsChart } from "./components/phone-tickets-chart";
import { ReplacementTypesCard } from "./components/replacement-types-card";
import { TicketsTable } from "./components/tickets-table";

const getStockStandard = (models: any[]) => {
    const standard = models.find((m) => m.model === "A16");

    return standard ? standard.count : 0;
};

// Quarter options
const quarterOptions = [
    { id: "Q1", label: "Q1 2026", value: "Q1" },
    { id: "Q2", label: "Q2 2026", value: "Q2" },
    { id: "Q3", label: "Q3 2026", value: "Q3" },
    { id: "Q4", label: "Q4 2026", value: "Q4" },
    { id: "custom", label: "Personalizado", value: "custom" },
];

// Get date range for quarters
const getQuarterDateRange = (quarter: string): { start: string; end: string } => {
    const year = new Date().getFullYear();

    switch (quarter) {
        case "Q1":
            return { start: `${year}-01-01`, end: `${year}-03-31` };
        case "Q2":
            return { start: `${year}-04-01`, end: `${year}-06-30` };
        case "Q3":
            return { start: `${year}-07-01`, end: `${year}-09-30` };
        case "Q4":
            return { start: `${year}-10-01`, end: `${year}-12-31` };
        default:
            return { start: `${year}-01-01`, end: `${year}-12-31` };
    }
};

export default function TelefonosTicketsDashboard() {
    const { setHeader, resetHeader } = useAuthShellHeader();
    const [selectedQuarter, setSelectedQuarter] = useState<string>("Q2");
    const [dateRange, setDateRange] = useState<{ start?: string; end?: string }>(getQuarterDateRange("Q2"));
    const { data: session } = useSession();
    const isAdminUser = session?.user?.role === "admin";

    const { data, loading, error, refetch } = usePhonesSummary({
        startDate: dateRange.start,
        endDate: dateRange.end,
    });

    // Calcular métricas derivadas
    const assignmentsPercentage = data?.kpis.total_demand ? ((data.kpis.assignments / data.kpis.total_demand) * 100).toFixed(1) : "0";

    const replacementsPercentage = data?.kpis.replacement_rate?.toFixed(1) || "0";

    const totalSolicitudes = (data?.kpis.total_demand || 0) + (data?.kpis.pending_demand || 0);
    const pendingPercentage = totalSolicitudes > 0 ? (((data?.kpis.pending_demand || 0) / totalSolicitudes) * 100).toFixed(0) : "0";

    const kpiConfigs = [
        {
            label: "Solicitudes",
            icon: HeartHand,
            value: loading ? "..." : totalSolicitudes,
            subtitle: loading
                ? ""
                : (data?.kpis.pending_demand || 0) > 0
                  ? `${data?.kpis.pending_demand} pendientes de entrega (${pendingPercentage}%)`
                  : `${data?.kpis.total_tickets} tickets generados`,
            modalContent: {
                title: "Total de Teléfonos Solicitados",
                description: `Demanda total de teléfonos durante el período ${dateRange.start} a ${dateRange.end}`,
                details: [
                    {
                        label: "Total Solicitado",
                        value: totalSolicitudes,
                        description: "Suma de teléfonos entregados + pendientes",
                    },
                    {
                        label: "Teléfonos Entregados",
                        value: data?.kpis.total_demand || 0,
                        description: "Equipos ya entregados a los usuarios",
                    },
                    {
                        label: "Pendientes de Entrega",
                        value: data?.kpis.pending_demand || 0,
                        description: "Equipos en proceso de entrega",
                    },
                    {
                        label: "Tickets Procesados",
                        value: data?.kpis.total_tickets || 0,
                        description: "Cantidad de tickets de teléfonos en el período",
                    },
                    {
                        label: "Promedio por Ticket",
                        value: data?.kpis.total_tickets ? (totalSolicitudes / data.kpis.total_tickets).toFixed(2) : 0,
                        description: "Teléfonos promedio por ticket",
                    },
                ],
                insights: [
                    `Promedio de ${data?.kpis.total_tickets && data?.period.days ? ((data.kpis.total_tickets / data.period.days) * 30).toFixed(1) : 0} tickets por mes`,
                    (data?.kpis.pending_demand || 0) > 0
                        ? `${data!.kpis.pending_demand} teléfonos esperando entrega (${pendingPercentage}% del total)`
                        : "Todos los teléfonos han sido entregados",
                    `${assignmentsPercentage}% son asignaciones nuevas`,
                    `${replacementsPercentage}% son recambios de equipos`,
                    totalSolicitudes > 80 ? "Demanda alta - Revisar niveles de stock" : "Demanda dentro de rangos normales",
                ],
            },
        },
        {
            label: "Recambios",
            icon: ArrowCircleRight,
            value: loading ? "..." : data?.kpis.replacements || 0,
            subtitle: loading ? "" : `${replacementsPercentage}% del total`,
            modalContent: {
                title: "Teléfonos de Recambio",
                description: "Equipos entregados como reemplazo de dispositivos con fallas",
                details: [
                    {
                        label: "Total Recambios",
                        value: data?.kpis.replacements || 0,
                        description: "Equipos entregados como reemplazo",
                    },
                    {
                        label: "Tasa de Recambio",
                        value: `${replacementsPercentage}%`,
                        description: "Porcentaje del total de solicitudes",
                    },
                    {
                        label: "Vs Asignaciones",
                        value: data?.kpis.replacements && data?.kpis.assignments ? `${(data.kpis.replacements / data.kpis.assignments).toFixed(1)}x` : "N/A",
                        description: "Ratio recambios/asignaciones",
                    },
                    {
                        label: "Promedio Mensual",
                        value: data?.period.days ? Math.round((data.kpis.replacements / data.period.days) * 30) : 0,
                        description: "Estimación mensual de recambios",
                    },
                ],
                insights: [
                    parseFloat(replacementsPercentage) > 70
                        ? "Alta tasa de recambios - Revisar calidad de dispositivos"
                        : "Tasa de recambios dentro de lo esperado",
                    `Se reemplazan ${data?.kpis.replacements && data?.kpis.assignments ? (data.kpis.replacements / data.kpis.assignments).toFixed(1) : 0} equipos por cada asignación nueva`,
                    "Mantener stock de modelos más solicitados para recambios",
                ],
            },
        },
        {
            label: "Nuevas Asignaciones",
            icon: Plus,
            value: loading ? "..." : data?.kpis.assignments || 0,
            subtitle: loading ? "" : `${assignmentsPercentage}% del total`,
            modalContent: {
                title: "Nuevas Asignaciones",
                description: "Equipos asignados a nuevos usuarios o por primera vez",
                details: [
                    {
                        label: "Total Asignaciones",
                        value: data?.kpis.assignments || 0,
                        description: "Equipos asignados en el período",
                    },
                    {
                        label: "% del Total",
                        value: `${assignmentsPercentage}%`,
                        description: "Porcentaje de asignaciones nuevas",
                    },
                    {
                        label: "Stock Consumido",
                        value: data?.kpis.assignments || 0,
                        description: "Dispositivos que salieron del inventario",
                    },
                    {
                        label: "Proyección Mensual",
                        value: data?.period.days ? Math.round((data.kpis.assignments / data.period.days) * 30) : 0,
                        description: "Estimación de asignaciones por mes",
                    },
                ],
                insights: [
                    `Impacto en stock: -${data?.kpis.assignments || 0} dispositivos`,
                    parseFloat(assignmentsPercentage) > 40 ? "Alta actividad de asignaciones - Posible crecimiento del equipo" : "Nivel normal de asignaciones",
                    `Ratio asignación/recambio: 1:${data?.kpis.replacements && data?.kpis.assignments ? (data.kpis.replacements / data.kpis.assignments).toFixed(1) : 0}`,
                ],
            },
        },
        {
            label: "Stock",
            icon: Box,
            value: loading ? "..." : getStockStandard(data!.stock.models) || 0,
            subtitle: loading ? "" : `${data?.stock.models?.length || 0} modelos en inventario`,
            modalContent: {
                title: "Inventario Disponible",
                description: "Dispositivos listos para asignar (status: NEW)",
                details: [
                    {
                        label: "Dispositivos NEW",
                        value: data?.stock.available || 0,
                        description: "Equipos disponibles para asignar",
                    },
                    {
                        label: "Modelos Únicos",
                        value: data?.stock.models?.length || 0,
                        description: "Variedad de modelos en stock",
                    },
                    {
                        label: "Cobertura Estimada",
                        value: (() => {
                            if (!data?.kpis.assignments || !data?.period.days || !data?.stock.models) return "N/A";

                            // Buscar específicamente los A16
                            const a16Model = data.stock.models.find((model) => model.model.toLowerCase().includes("a16"));

                            if (!a16Model || a16Model.count === 0) return "N/A";

                            // Usar valor fijo estimativo de 24 asignaciones por mes
                            const consumoMensualEstimado = 24;

                            // Calcular meses de cobertura: Stock A16 / Consumo mensual estimado
                            const mesesCobertura = Math.floor(a16Model.count / consumoMensualEstimado);

                            return `${mesesCobertura} meses`;
                        })(),
                        description: "Meses de cobertura con stock A16 (estimado 24/mes)",
                    },
                    {
                        label: "Top Modelo",
                        value: data?.stock.models?.[0] ? `${data.stock.models[0].brand} ${data.stock.models[0].model}` : "N/A",
                        description: data?.stock.models?.[0] ? `${data.stock.models[0].count} unidades disponibles` : "",
                    },
                ],
                // insights: [
                //     (data?.stock.available || 0) < 50
                //         ? "🔴 Stock bajo - Considerar reposición urgente"
                //         : (data?.stock.available || 0) < 100
                //         ? "🟡 Stock moderado - Planificar reposición"
                //         : "🟢 Stock saludable",
                //     `Diversidad: ${data?.stock.models?.length || 0} modelos diferentes`,
                //     data?.stock.models?.[0]
                //         ? `Modelo más disponible: ${data.stock.models[0].brand} ${data.stock.models[0].model} (${data.stock.models[0].count} unidades)`
                //         : "Sin información de modelos"
                // ]
            },
        },
    ];

    const headerActions = useMemo(
        () => (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <div className="min-w-36">
                    <Select
                        aria-label="Seleccionar periodo"
                        label=""
                        placeholder="Seleccionar período"
                        selectedKey={selectedQuarter}
                        onSelectionChange={(key) => {
                            const quarter = key as string;
                            setSelectedQuarter(quarter);

                            if (quarter !== "custom") {
                                const range = getQuarterDateRange(quarter);
                                setDateRange(range);
                            } else {
                                setDateRange({});
                            }
                        }}
                        items={quarterOptions}
                        className="w-full"
                    >
                        {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
                    </Select>
                </div>

                <div className="min-w-48">
                    <DateRangePicker
                        key={selectedQuarter}
                        className="w-full"
                        isDisabled={selectedQuarter !== "custom"}
                        onChange={(range) => {
                            if (range?.start && range?.end) {
                                const startDate = `${range.start.year}-${String(range.start.month).padStart(2, "0")}-${String(range.start.day).padStart(2, "0")}`;
                                const endDate = `${range.end.year}-${String(range.end.month).padStart(2, "0")}-${String(range.end.day).padStart(2, "0")}`;
                                setDateRange({ start: startDate, end: endDate });
                            }
                        }}
                    />
                </div>

                {isAdminUser ? <SyncTicketsButton onSyncComplete={() => refetch()} /> : null}

                <Button color="secondary" iconLeading={Stars02} size="sm" onClick={() => toast.info("En desarrollo")}>
                    AI
                </Button>
            </div>
        ),
        [isAdminUser, refetch, selectedQuarter],
    );

    useEffect(() => {
        setHeader({
            title: "Telefonos",
            subtitle: "Dashboard con demanda de telefonos y prevision",
            actions: headerActions,
        });

        return () => {
            resetHeader();
        };
    }, [headerActions, resetHeader, setHeader]);

    if (error) {
        return (
            <div className="flex min-h-[60vh] w-full items-center justify-center px-4">
                <div className="flex w-full max-w-sm flex-col items-center gap-4 text-center">
                    <p className="text-sm text-red-500">Error: {error}</p>
                    <Button onClick={refetch} className="w-full justify-center">
                        Reintentar
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <section className="flex flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 lg:px-8">
            {/* KPIs con Modals */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {kpiConfigs.map((config, i) => (
                    <KpiCardWithModal key={i} {...config} />
                ))}
            </div>

            {/* Chart */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="col-span-1 h-[260px] rounded-lg border border-surface bg-surface-1 sm:h-[320px] lg:col-span-3">
                    <PhoneTicketsChart monthlyData={data?.monthly_data} loading={loading} />
                </div>
            </div>

            {/* Replacement Types */}
            <ReplacementTypesCard replacementTypes={data?.replacement_types} loading={loading} isAdmin={isAdminUser} />

            {/* Tickets Table */}
            <TicketsTable tickets={data?.tickets || []} loading={loading} description={`Período: ${dateRange.start} - ${dateRange.end}`} />
        </section>
    );
}
