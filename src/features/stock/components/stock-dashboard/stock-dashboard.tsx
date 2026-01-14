"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "@untitledui/icons";
import { useRouter } from "next/navigation";
import { TableCard } from "@/components/application/table/table";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { ShippingActions } from "@/components/shipping/shipping-actions";
import { useDebounce } from "@/hooks/use-debounce";
import { useFilteredStockData } from "@/hooks/use-stock-data";
import type { InventoryRecord } from "@/lib/types";
import { formatDate, getDistribuidoraName, getLatestAssignment, isRecordAssigned, isRecordAvailable } from "@/utils/stock-utils";
import { CreateStockModal } from "../create/create-stock-modal";
import { DeviceGrid } from "../device-grid";
import { EditShippingModal } from "../edit-shipping";
import { EditStockModal } from "../edit/edit-stock-modal";
import { RegisterReturnModal } from "../register-return";
import { StockFilters } from "../stock-filters";
import { StockMetrics } from "../stock-metrics";
import { type StockView, StockViewTabs } from "../stock-view-tabs";
import { ViewAssignmentModal } from "../view-assignment";

const COMPLETED_ASSIGNMENT_STATUSES = new Set(["completed", "closed", "finalized", "returned"]);

export function StockDashboard() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");
    const debouncedSearchQuery = useDebounce(searchQuery, 300);
    const [activeView, setActiveView] = useState<StockView>("overview");
    const [page, setPage] = useState(1);
    const [pageSize] = useState(24); // Cards en grid, más items por página
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isViewAssignmentModalOpen, setIsViewAssignmentModalOpen] = useState(false);
    const [isRegisterReturnModalOpen, setIsRegisterReturnModalOpen] = useState(false);
    const [isUpdateShippingModalOpen, setIsUpdateShippingModalOpen] = useState(false);
    const [selectedDevice, setSelectedDevice] = useState<InventoryRecord | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [deviceToEdit, setDeviceToEdit] = useState<InventoryRecord | null>(null);
    const [stateFilter, setStateFilter] = useState<string>("all");
    const [distributorFilter, setDistributorFilter] = useState<string>("all");
    const [statusDbFilter, setStatusDbFilter] = useState<string>("all");
    const [modelFilter, setModelFilter] = useState<string>("all");

    const serverFilters = useMemo(() => (modelFilter !== "all" ? { modelId: modelFilter } : undefined), [modelFilter]);

    const { data, isLoading, error, lastUpdated, refresh, modelOptions } = useFilteredStockData(debouncedSearchQuery, serverFilters);

    const categorizedData = useMemo(() => {
        const linkedSotiRecords: InventoryRecord[] = [];
        const inTransitRecords: InventoryRecord[] = [];
        const completedRecords: InventoryRecord[] = [];
        let assignedCount = 0;
        let availableCount = 0;

        data.forEach((record) => {
            if (isRecordAssigned(record)) {
                assignedCount += 1;
            } else {
                availableCount += 1;
            }

            // Vinculados externamente sin asignación formal = necesitan reconciliación

            if (record.soti_info?.is_in_soti && !isRecordAssigned(record)) {
                linkedSotiRecords.push(record);
            }

            const lastAssignment = record.raw?.assignments?.[0];
            if (lastAssignment) {
                const normalizedStatus = typeof lastAssignment.status === "string" ? lastAssignment.status.toLowerCase() : null;
                const hasVoucher = Boolean(lastAssignment.shipping_voucher_id);

                if (hasVoucher && (!normalizedStatus || normalizedStatus === "active")) {
                    inTransitRecords.push(record);
                } else if (normalizedStatus && COMPLETED_ASSIGNMENT_STATUSES.has(normalizedStatus)) {
                    completedRecords.push(record);
                }
            }
        });

        return {
            linkedSotiRecords,
            inTransitRecords,
            completedRecords,
            assignedCount,
            availableCount,
        };
    }, [data]);

    const { linkedSotiRecords, inTransitRecords, completedRecords, assignedCount, availableCount } = categorizedData;

    const filteredData = useMemo(() => {
        switch (activeView) {
            case "linked_soti":
                return linkedSotiRecords;
            case "in_transit":
                return inTransitRecords;
            case "completed":
                return completedRecords;
            default:
                return data;
        }
    }, [activeView, data, linkedSotiRecords, inTransitRecords, completedRecords]);

    const distributorOptions = useMemo(() => {
        const names = new Set<string>();

        data.forEach((record) => {
            const name = getDistribuidoraName(record.distribuidora);
            if (name && name !== "-") {
                names.add(name);
            }
        });

        const sortedNames = Array.from(names).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));

        return [{ id: "all", label: "Todas las distribuidoras" }, ...sortedNames.map((name) => ({ id: name, label: name }))];
    }, [data]);

    useEffect(() => {
        setPage(1);
    }, [stateFilter, distributorFilter, statusDbFilter, activeView, modelFilter, debouncedSearchQuery]);

    const filteredWithFilters = useMemo(() => {
        return filteredData.filter((record) => {
            if (stateFilter === "available" && !isRecordAvailable(record)) {
                return false;
            }

            if (stateFilter === "assigned" && !isRecordAssigned(record)) {
                return false;
            }

            if (statusDbFilter !== "all" && record.status !== statusDbFilter) {
                return false;
            }

            if (modelFilter !== "all" && record.model_details?.id !== modelFilter) {
                return false;
            }

            if (distributorFilter !== "all") {
                const distributorName = getDistribuidoraName(record.distribuidora);
                if ((distributorName || "-") !== distributorFilter) {
                    return false;
                }
            }

            return true;
        });
    }, [filteredData, stateFilter, distributorFilter, statusDbFilter, modelFilter]);

    // Paginate data
    const paginatedData = useMemo(() => {
        const startIndex = (page - 1) * pageSize;
        return filteredWithFilters.slice(startIndex, startIndex + pageSize);
    }, [filteredWithFilters, page, pageSize]);

    const totalPages = Math.ceil(filteredWithFilters.length / pageSize);

    const numberFormatter = useMemo(() => new Intl.NumberFormat("es-AR"), []);
    const totalDevices = data.length;
    const linkedSotiCount = linkedSotiRecords.length;
    const inTransitCount = inTransitRecords.length;
    const completedCount = completedRecords.length;

    const metrics = useMemo(() => {
        const formatValue = (value: number) => numberFormatter.format(value);

        if (isLoading) {
            return [
                { id: "total", label: "Inventario total", value: "...", subtitle: "" },
                { id: "assigned", label: "Asignados activos", value: "...", subtitle: "" },
                { id: "available", label: "Disponibles", value: "...", subtitle: "" },
                { id: "linked_soti", label: "Vinculados", value: "...", subtitle: "" },
                { id: "in_transit", label: "En envio", value: "...", subtitle: "" },
                { id: "completed", label: "Asignaciones cerradas", value: "...", subtitle: "" },
            ];
        }

        return [
            {
                id: "total",
                label: "Inventario total",
                value: formatValue(totalDevices),
                subtitle: `${formatValue(assignedCount)} asignados`,
            },
            {
                id: "assigned",
                label: "Asignados activos",
                value: formatValue(assignedCount),
                subtitle: "Con asignación vigente",
            },
            {
                id: "available",
                label: "Disponibles",
                value: formatValue(availableCount),
                subtitle: "Sin asignación activa",
            },
            {
                id: "linked_soti",
                label: "Vinculados",
                value: formatValue(linkedSotiCount),
subtitle: "Sin asignación formal",

            },
            {
                id: "in_transit",
                label: "En envio",
                value: formatValue(inTransitCount),
                subtitle: "Vale generado y activo",
            },
            {
                id: "completed",
                label: "Asignaciones cerradas",
                value: formatValue(completedCount),
                subtitle: "Proceso completado",
            },
        ];
    }, [isLoading, numberFormatter, totalDevices, assignedCount, availableCount, linkedSotiCount, inTransitCount, completedCount]);

    const tabItems = useMemo(
        () => [
            { id: "overview" as const, label: "Resumen", badge: totalDevices },
            { id: "linked_soti" as const, label: "Vinculados", badge: linkedSotiCount },
            { id: "in_transit" as const, label: "En envio", badge: inTransitCount },
            { id: "completed" as const, label: "Cerradas", badge: completedCount },
        ],
        [totalDevices, linkedSotiCount, inTransitCount, completedCount],
    );

    if (error) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="text-center">
                    <p className="mb-4 text-red-600">Error loading stock data: {error}</p>
                    <button onClick={() => refresh()} className="rounded-lg bg-brand-primary px-4 py-2 text-white hover:bg-brand-primary/90">
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Metrics */}
            <section className="space-y-3">
                <StockMetrics isLoading={isLoading} metrics={metrics as any} />
            </section>

            {/* Main Content */}
            <TableCard.Root>
                <TableCard.Header
                    title="Inventario de dispositivos"
                    badge={`${filteredWithFilters.length} ${filteredWithFilters.length === 1 ? "dispositivo" : "dispositivos"}`}
                    description={lastUpdated ? `Última actualización: ${formatDate(lastUpdated)}` : undefined}
                    contentTrailing={
                        <div className="absolute top-5 right-4 flex items-center justify-end gap-3 md:right-6">
                            <ButtonUtility tooltip="Agregar Dispositivo" size="sm" icon={Plus} onClick={() => setIsAddModalOpen(true)} disabled={isLoading} />
                        </div>
                    }
                />

                {/* View Tabs */}
                <div className="border-b border-secondary px-4 py-4 md:px-6">
                    <StockViewTabs activeView={activeView} onViewChange={setActiveView} items={tabItems} />
                </div>

                {/* Filters */}
                <StockFilters
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    stateFilter={stateFilter}
                    onStateFilterChange={setStateFilter}
                    distributorFilter={distributorFilter}
                    onDistributorFilterChange={setDistributorFilter}
                    statusDbFilter={statusDbFilter}
                    onStatusDbFilterChange={setStatusDbFilter}
                    modelFilter={modelFilter}
                    onModelFilterChange={setModelFilter}
                    modelOptions={modelOptions || []}
                    distributorOptions={distributorOptions}
                />

                {/* Device Grid */}
                {isLoading ? (
                    <div className="flex items-center justify-center p-12">
                        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
                        <span className="ml-3">Cargando datos...</span>
                    </div>
                ) : (
                    <div className="px-4 py-4 md:px-6">
                        <DeviceGrid
                            devices={paginatedData}
                            page={page}
                            totalPages={totalPages}
                            onPageChange={setPage}
                            onAssign={(device) => {
                                router.push(`/stock/assign/${device.imei}`);
                            }}
                            onViewAssignment={(device) => {
                                setSelectedDevice(device);
                                setIsViewAssignmentModalOpen(true);
                            }}
                            onEdit={(device) => {
                                setDeviceToEdit(device);
                                setIsEditModalOpen(true);
                            }}
                            onUpdateShipping={(device) => {
                                setSelectedDevice(device);
                                setIsUpdateShippingModalOpen(true);
                            }}
                            onRegisterReturn={(device) => {
                                setSelectedDevice(device);
                                setIsRegisterReturnModalOpen(true);
                            }}
                        />
                    </div>
                )}
            </TableCard.Root>

            {/* Modals */}
            <CreateStockModal open={isAddModalOpen} onOpenChange={setIsAddModalOpen} onSuccess={refresh} />

            <ViewAssignmentModal
                open={isViewAssignmentModalOpen}
                onOpenChange={setIsViewAssignmentModalOpen}
                deviceId={selectedDevice?.raw?.soti_device?.id || null}
                imei={selectedDevice?.imei || null}
                deviceInfo={{
                    device_name: selectedDevice?.soti_info?.device_name,
                    imei: selectedDevice?.imei,
                    model: selectedDevice?.modelo,
                }}
            />

            <EditStockModal
                open={isEditModalOpen}
                onOpenChange={(open) => {
                    setIsEditModalOpen(open);
                    if (!open) {
                        setDeviceToEdit(null);
                    }
                }}
                device={deviceToEdit}
                onSuccess={refresh}
            />

            <RegisterReturnModal
                open={isRegisterReturnModalOpen}
                onOpenChange={setIsRegisterReturnModalOpen}
                assignmentInfo={{
                    id: (getLatestAssignment(selectedDevice!) as any)?.id || "",
                    assignee_name: (getLatestAssignment(selectedDevice!) as any)?.assignee_name || "",
                    return_device_imei: (getLatestAssignment(selectedDevice!) as any)?.return_device_imei || "",
                    at: (getLatestAssignment(selectedDevice!) as any)?.at || "",
                }}
                onSuccess={refresh}
            />

            <EditShippingModal
                open={isUpdateShippingModalOpen}
                onOpenChange={setIsUpdateShippingModalOpen}
                assignmentInfo={{
                    id: (getLatestAssignment(selectedDevice!) as any)?.id || "",
                    assignee_name: (getLatestAssignment(selectedDevice!) as any)?.assignee_name || "",
                    shipping_voucher_id: (getLatestAssignment(selectedDevice!) as any)?.shipping_voucher_id || null,
                    shipping_status: (getLatestAssignment(selectedDevice!) as any)?.shipping_status || null,
                    shipped_at: (getLatestAssignment(selectedDevice!) as any)?.shipped_at || null,
                    delivered_at: (getLatestAssignment(selectedDevice!) as any)?.delivered_at || null,
                    expects_return: (getLatestAssignment(selectedDevice!) as any)?.expects_return || false,
                    return_status: (getLatestAssignment(selectedDevice!) as any)?.return_status || null,
                    return_device_imei: (getLatestAssignment(selectedDevice!) as any)?.return_device_imei || null,
                }}
                onSuccess={refresh}
            />
        </div>
    );
}
