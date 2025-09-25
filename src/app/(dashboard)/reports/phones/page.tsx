"use client";

import { ArrowCircleRight, Box, Database02, HeartHand, Phone01, Plus, Stars01, Stars02 } from "@untitledui/icons";
import { DatePicker } from "@/components/application/date-picker/date-picker";
import { DateRangePicker } from "@/components/application/date-picker/date-range-picker";
import { Button } from "@/components/base/buttons/button";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { SyncTicketsButton } from "@/components/dashboard/sync-tickets-button";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icons";
import { PhoneTicketsChart } from "./components/phone-tickets-chart";
import { useKpiData } from "@/hooks/use-kpi-data";
import { useState } from "react";

export default function TelefonosTicketsDashboard() {
    const [dateRange, setDateRange] = useState<{start?: string; end?: string}>({
        start: "2025-01-01",
        end: "2025-12-31"
    });

    const { data: kpiData, loading, error, refetch } = useKpiData({
        startDate: dateRange.start,
        endDate: dateRange.end
    });

    const kpiTitles = [
        {
            label: "Solicitudes",
            Icon: HeartHand,
            value: loading ? "..." : kpiData?.requests || 0,
        },
        {
            label: "Recambios",
            Icon: ArrowCircleRight,
            value: loading ? "..." : kpiData?.replacements || 0,
        },
        {
            label: "Asignaciones",
            Icon: Plus,
            value: loading ? "..." : kpiData?.assignments || 0,
        },
        {
            label: "Stock",
            Icon: Box,
            value: loading ? "..." : kpiData?.stock_current || 0,
        },
    ];

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Teléfonos</h1>
                    <p className="text-muted-foreground text-sm">Dashboard con demanda de teléfonos y previsión</p>
                </div>

                <div className="flex items-center gap-2">
                    {/* Date Picker */}
                    <DateRangePicker
                        onChange={(range) => {
                            if (range?.start && range?.end) {
                                // Convert the calendar object format to ISO date strings
                                const startDate = `${range.start.year}-${String(range.start.month).padStart(2, '0')}-${String(range.start.day).padStart(2, '0')}`;
                                const endDate = `${range.end.year}-${String(range.end.month).padStart(2, '0')}-${String(range.end.day).padStart(2, '0')}`;

                                setDateRange({
                                    start: startDate,
                                    end: endDate
                                });
                            }
                        }}
                    />

                    {/* Export Button */}
                    <Button color="primary" size="sm">
                        Exportar
                    </Button>

                    {/* Sync Button */}
                    <SyncTicketsButton
                        onSyncComplete={() => {
                            refetch();
                        }}
                    />

                    <Button color="secondary" isDisabled iconLeading={Stars02} size="sm">
                        AI
                    </Button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {kpiTitles.map(({ label, Icon, value }, i) => (
                    <KpiCard key={i} label={label} value={value} icon={Icon} />
                ))}
            </div>

            {/* Middle Section: Chart + Right List */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                {/* Chart box */}
                <div className="col-span-2 h-80 rounded-lg border border-surface bg-surface-1">
                    <div className="h-full w-full">
                        <PhoneTicketsChart />
                    </div>
                </div>

                {/* Right side list */}
                <div className="space-y-4 rounded-lg border p-4">
                    {["Robo", "Obso", "Rotura", "Perdido"].map((item, i) => (
                        <div key={i} className="flex items-center justify-between rounded-md border px-3 py-2">
                            <span className="text-sm font-medium">{item}</span>
                            <span className="text-sm font-bold">--</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Tickets Table */}
            <div className="rounded-lg border p-4">
                <h3 className="mb-2 text-sm font-medium">Tickets</h3>
                <div className="max-h-[500px] overflow-x-auto overflow-y-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-background sticky top-0">
                            <tr>
                                <th className="border-b p-2 text-left">ID</th>
                                <th className="border-b p-2 text-left">Usuario</th>
                                <th className="border-b p-2 text-left">Dispositivo</th>
                                <th className="border-b p-2 text-left">Estado</th>
                                <th className="border-b p-2 text-left">Fecha</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Array.from({ length: 15 }).map((_, i) => (
                                <tr key={i} className="hover:bg-muted/50">
                                    <td className="border-b p-2">#00{i + 1}</td>
                                    <td className="border-b p-2">Usuario {i + 1}</td>
                                    <td className="border-b p-2">Modelo X</td>
                                    <td className="border-b p-2">Abierto</td>
                                    <td className="border-b p-2">2025-09-24</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
