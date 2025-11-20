"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useMemo, useEffect } from "react";
import { ArrowCircleRight, Box, Database01, FilterLines, Plus, SearchLg, Send01, UploadCloud02, Eye, X, Edit01, CheckCircle } from "@untitledui/icons";
import type { SortDescriptor } from "react-aria-components";
import { PaginationCardMinimal } from "@/components/application/pagination/pagination";
import { Table, TableCard, TableRowActionsDropdown } from "@/components/application/table/table";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Input } from "@/components/base/input/input";
import { Badge, BadgeWithDot } from "@/components/base/badges/badges";
import { Tabs } from "@/components/application/tabs/tabs";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icons";
import { Select } from "@/components/base/select/select";
import { useFilteredStockData } from "@/hooks/use-stock-data";
import { CreateStockModal } from "@/features/stock/components/create/create-stock-modal";
import { ViewAssignmentModal } from "@/features/stock/components/view-assignment";
import { EditStockModal } from "@/features/stock/components/edit/edit-stock-modal";
import { RegisterReturnModal } from "@/features/stock/components/register-return";
import { EditShippingModal } from "@/features/stock/components/edit-shipping";
import { ShippingActions } from "@/components/shipping/shipping-actions";
import type { InventoryRecord } from "@/lib/types";
import { toast } from "sonner";
import { DEVICE_STATUS_OPTIONS } from "@/constants/device-status";

type StockView = "overview" | "linked_soti" | "in_transit" | "completed";

const COMPLETED_ASSIGNMENT_STATUSES = new Set(["completed", "closed", "finalized", "returned"]);

type StatusBadgeColor = "brand" | "success" | "warning" | "gray" | "blue-light" | "error";

interface DeviceStateBadge {
  label: string;
  color: StatusBadgeColor;
  description?: string;
}

const JIRA_BASE_URL = 'https://desasa.atlassian.net/browse/';

const normalizeDistributorName = (fullPath: string) =>
  getDistribuidoraName(fullPath).trim().toLowerCase();

const isDepot = (fullPath: string) => normalizeDistributorName(fullPath) === "deposito";

const getLatestAssignment = (record: InventoryRecord) => {
  const assignments = (record) ? record.raw?.assignments as any[] : [];
  return assignments[0] ?? null;
};

const getDeviceState = (record: InventoryRecord): DeviceStateBadge => {
  const latestAssignment = getLatestAssignment(record);
  const normalizedAssignmentStatus =
    typeof latestAssignment?.status === "string" ? latestAssignment.status.toLowerCase() : null;

  // Estados de envío y devolución
  if (latestAssignment && normalizedAssignmentStatus === "active") {
    const shippingStatus = (latestAssignment as any).shipping_status;
    const returnStatus = (latestAssignment as any).return_status;

    // ⚠️ Entregado pero pendiente de devolución
    if (shippingStatus === "delivered" && returnStatus === "pending") {
      return { label: "Pend. devolución", color: "warning" };
    }

    // ✅ Entregado y dispositivo devuelto (listo para cerrar)
    if (shippingStatus === "delivered" && returnStatus === "received") {
      return { label: "Listo para cerrar", color: "success" };
    }

    // 🚚 En envío con vale
    if (latestAssignment.shipping_voucher_id) {
      return { label: "En envio", color: "blue-light", description: latestAssignment.shipping_voucher_id };
    }
  }

  if (normalizedAssignmentStatus && COMPLETED_ASSIGNMENT_STATUSES.has(normalizedAssignmentStatus)) {
    return { label: "Cerrada", color: "success" };
  }

  const treatedAsAssigned = record.is_assigned && !isDepot(record.distribuidora);

  if (treatedAsAssigned) {
    return { label: "Asignado", color: "brand" };
  }

  if (!treatedAsAssigned && (record.status === "NEW" || record.status === "ASSIGNED")) {
    return { label: "Disponible", color: "success" };
  }

  if (record.status === "LOST") {
    return { label: "Perdido", color: "error" };
  }

  return { label: record.status_label || "Sin estado", color: "gray" };
};

interface TicketInfo {
  display: string;
  url: string | null;
}

const getDistribuidoraName = (fullPath: string) => {
  if (!fullPath) return "-";

  if (fullPath.startsWith("\\\\")) {
    const withoutPrefix = fullPath.substring(2);
    const nextSlashIndex = withoutPrefix.indexOf("\\");

    if (nextSlashIndex !== -1) {
      return withoutPrefix.substring(0, nextSlashIndex);
    }
    return withoutPrefix;
  }

  return fullPath;
};

const getDistribuidoraBadge = (distribuidora: string) => {
  if (!distribuidora) return <Badge color="gray" size="sm">-</Badge>;

  return (
    <BadgeWithDot type="modern" color="brand" size="lg">
      {getDistribuidoraName(distribuidora)}
    </BadgeWithDot>
  );
};

const getTicketInfo = (ticket: string | null | undefined): TicketInfo | null => {
  if (!ticket) return null;

  const trimmed = ticket.trim();
  if (!trimmed) return null;

  // Case: full URL already provided
  if (/^https?:\/\//i.test(trimmed)) {
    const match = trimmed.match(/DESA-\d+/i);
    const display = match ? match[0].toUpperCase() : trimmed.replace(/^https?:\/\//i, '');
    return { display, url: trimmed };
  }

  // Case: includes ticket key like DESA-12345
  const keyMatch = trimmed.match(/DESA-\d+/i);
  if (keyMatch) {
    const ticketKey = keyMatch[0].toUpperCase();
    return {
      display: ticketKey,
      url: `${JIRA_BASE_URL}${ticketKey}`,
    };
  }

  // Case: numeric only (e.g., 12345)
  const digits = trimmed.replace(/\D/g, '');
  if (digits) {
    const ticketKey = `DESA-${digits}`;
    return {
      display: ticketKey,
      url: `${JIRA_BASE_URL}${ticketKey}`,
    };
  }

  // Unknown format, just show string without link
  return {
    display: trimmed,
    url: null,
  };
};

const isRecordAssigned = (record: InventoryRecord) => {
  const latestAssignment = getLatestAssignment(record);
  return latestAssignment && latestAssignment.status === 'active';
};

const isRecordAvailable = (record: InventoryRecord) => !isRecordAssigned(record);

export function StockTable() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: "modelo",
    direction: "ascending",
  });
  const router = useRouter();
  const [activeView, setActiveView] = useState<StockView>("overview");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isViewAssignmentModalOpen, setIsViewAssignmentModalOpen] = useState(false);
  const [isRegisterReturnModalOpen, setIsRegisterReturnModalOpen] = useState(false);
  const [isUpdateShippingModalOpen, setIsUpdateShippingModalOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<InventoryRecord | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deviceToEdit, setDeviceToEdit] = useState<InventoryRecord | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [distributorFilter, setDistributorFilter] = useState<string>("all");
  const [statusDbFilter, setStatusDbFilter] = useState<string>("all");
  const [modelFilter, setModelFilter] = useState<string>("all");
  const [backupFilter, setBackupFilter] = useState<string>("all");
  const [backupDistributorFilter, setBackupDistributorFilter] = useState<string>("all");

  const serverFilters = useMemo(
    () => {
      const filters: any = {};
      if (modelFilter !== "all") {
        filters.modelId = modelFilter;
      }
      if (backupFilter === "true") {
        filters.backup = "true";
      } else if (backupFilter === "false") {
        filters.backup = "false";
      }
      if (backupDistributorFilter !== "all") {
        filters.backup_distributor = backupDistributorFilter;
      }
      return Object.keys(filters).length > 0 ? filters : undefined;
    },
    [modelFilter, backupFilter, backupDistributorFilter],
  );

  const { data, isLoading, error, lastUpdated, refresh, modelOptions } = useFilteredStockData(
    searchQuery,
    serverFilters,
  );

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

      // Vinculados con SOTI sin asignación formal = necesitan reconciliación
      if (record.soti_info?.is_in_soti && !isRecordAssigned(record)) {
        linkedSotiRecords.push(record);
      }

      const lastAssignment = record.raw?.assignments?.[0];
      if (lastAssignment) {
        const normalizedStatus =
          typeof lastAssignment.status === "string" ? lastAssignment.status.toLowerCase() : null;
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

  const {
    linkedSotiRecords,
    inTransitRecords,
    completedRecords,
    assignedCount,
    availableCount,
  } = categorizedData;

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

const stateFilterOptions = useMemo(
    () => [
      { id: "all", label: "Todos los estados" },
      { id: "available", label: "Disponibles" },
      { id: "assigned", label: "Asignados" },
    ],
    []
  );

  const statusDbFilterOptions = useMemo(
    () => [
      { id: "all", label: "Todos los estados DB" },
      ...DEVICE_STATUS_OPTIONS.map((option) => ({ ...option })),
    ],
    []
  );

  const modelSelectOptions = useMemo(() => {
    const options = (modelOptions ?? []).map((option) => ({
      id: option.id,
      label: option.label,
    }));

    return [
      { id: "all", label: "Todos los modelos" },
      ...options,
    ];
  }, [modelOptions]);

  const backupFilterOptions = useMemo(
    () => [
      { id: "all", label: "Todos" },
      { id: "true", label: "Solo backup" },
      { id: "false", label: "Excluir backup" },
    ],
    []
  );

  const backupDistributorOptions = useMemo(() => {
    const names = new Set<string>();

    data.forEach((record) => {
      if (record.is_backup && record.backup_distributor?.name) {
        names.add(record.backup_distributor.name);
      }
    });

    const sortedNames = Array.from(names).sort((a, b) =>
      a.localeCompare(b, "es", { sensitivity: "base" })
    );

    return [
      { id: "all", label: "Todas las distribuidoras de backup" },
      ...sortedNames.map((name) => ({ id: name, label: name })),
    ];
  }, [data]);

  const distributorOptions = useMemo(() => {
    const names = new Set<string>();

    data.forEach((record) => {
      const name = getDistribuidoraName(record.distribuidora);
      if (name && name !== "-") {
        names.add(name);
      }
    });

    const sortedNames = Array.from(names).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));

    return [
      { id: "all", label: "Todas las distribuidoras" },
      ...sortedNames.map((name) => ({ id: name, label: name })),
    ];
  }, [data]);

  const hasActiveFilters =
    stateFilter !== "all" ||
    distributorFilter !== "all" ||
    statusDbFilter !== "all" ||
    modelFilter !== "all" ||
    backupFilter !== "all" ||
    backupDistributorFilter !== "all";

  useEffect(() => {
    if (modelFilter !== "all" && !modelSelectOptions.some((option) => option.id === modelFilter)) {
      setModelFilter("all");
    }
  }, [modelFilter, modelSelectOptions]);

  useEffect(() => {
    setPage(1);
  }, [stateFilter, distributorFilter, statusDbFilter, activeView, modelFilter, backupFilter, backupDistributorFilter]);

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

  const clearFilters = () => {
    setStateFilter("all");
    setDistributorFilter("all");
    setStatusDbFilter("all");
    setModelFilter("all");
    setBackupFilter("all");
    setBackupDistributorFilter("all");
  };

  // Sort data
  const sortedItems = useMemo(() => {
    const items = [...filteredWithFilters];

    return items.sort((a, b) => {
      const first = a[sortDescriptor.column as keyof InventoryRecord] as string;
      const second = b[sortDescriptor.column as keyof InventoryRecord] as string;

      if (!first && !second) return 0;
      if (!first) return 1;
      if (!second) return -1;

      // Handle string sorting
      const cmp = first.localeCompare(second, 'es', { numeric: true });
      return sortDescriptor.direction === "descending" ? -cmp : cmp;
    });
  }, [filteredWithFilters, sortDescriptor]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return sortedItems.slice(startIndex, startIndex + pageSize);
  }, [sortedItems, page, pageSize]);

  const totalPages = Math.ceil(sortedItems.length / pageSize);

  const numberFormatter = useMemo(() => new Intl.NumberFormat("es-AR"), []);
  const totalDevices = data.length;
  const linkedSotiCount = linkedSotiRecords.length;
  const inTransitCount = inTransitRecords.length;
  const completedCount = completedRecords.length;

  const metrics = useMemo(() => {
    const formatValue = (value: number) => numberFormatter.format(value);

    if (isLoading) {
      return [
        { id: "total", label: "Inventario total", value: "...", icon: Database01, subtitle: "" },
        { id: "assigned", label: "Asignados activos", value: "...", icon: ArrowCircleRight, subtitle: "" },
        { id: "available", label: "Disponibles", value: "...", icon: Box, subtitle: "" },
        { id: "linked_soti", label: "Vinculados SOTI", value: "...", icon: UploadCloud02, subtitle: "" },
        { id: "in_transit", label: "En envio", value: "...", icon: Send01, subtitle: "" },
        { id: "completed", label: "Asignaciones cerradas", value: "...", icon: CheckCircle, subtitle: "" },
      ];
    }

    return [
      {
        id: "total",
        label: "Inventario total",
        value: formatValue(totalDevices),
        icon: Database01,
        subtitle: `${formatValue(assignedCount)} asignados`,
      },
      {
        id: "assigned",
        label: "Asignados activos",
        value: formatValue(assignedCount),
        icon: ArrowCircleRight,
        subtitle: "Con asignacion vigente",
      },
      {
        id: "available",
        label: "Disponibles",
        value: formatValue(availableCount),
        icon: Box,
        subtitle: "Sin asignacion activa",
      },
      {
        id: "linked_soti",
        label: "Vinculados SOTI",
        value: formatValue(linkedSotiCount),
        icon: UploadCloud02,
        subtitle: "En SOTI sin asignacion formal",
      },
      {
        id: "in_transit",
        label: "En envio",
        value: formatValue(inTransitCount),
        icon: Send01,
        subtitle: "Vale generado y activo",
      },
      {
        id: "completed",
        label: "Asignaciones cerradas",
        value: formatValue(completedCount),
        icon: CheckCircle,
        subtitle: "Proceso completado",
      },
    ];
  }, [
    isLoading,
    numberFormatter,
    totalDevices,
    assignedCount,
    availableCount,
    linkedSotiCount,
    inTransitCount,
    completedCount,
  ]);

  const tabItems = useMemo(
    () => [
      { id: "overview" as const, label: "Resumen", badge: totalDevices },
      { id: "linked_soti" as const, label: "Vinculados SOTI", badge: linkedSotiCount },
      { id: "in_transit" as const, label: "En envio", badge: inTransitCount },
      { id: "completed" as const, label: "Cerradas", badge: completedCount },
    ],
    [totalDevices, linkedSotiCount, inTransitCount, completedCount],
  );

  useEffect(() => {
    setPage(1);
  }, [activeView, searchQuery]);

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    try {
      return new Date(dateString).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const openTicket = (ticket: string) => {
    const info = getTicketInfo(ticket);
    if (info?.url) {
      window.open(info.url, "_blank");
    }
  };

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      const loadingToast = toast.loading('Sincronizando con Google Sheets...');
      const response = await fetch('/api/sync/stock', {
        method: 'POST',
      });
      const result = await response.json().catch(() => null);
      toast.dismiss(loadingToast);
      if (!response.ok) {
        const errorMessage =
          result && typeof result === 'object' && 'error' in result
            ? (result.error as string)
            : 'Error al sincronizar';
        throw new Error(errorMessage);
      }
      if (!result || typeof result !== 'object') {
        throw new Error('Respuesta invalida del servidor');
      }
      const {
        success,
        processed,
        created,
        updated,
        createdModels,
        createdDistributors,
        errors,
        details,
      } = result as {
        success: boolean;
        processed: number;
        created: number;
        updated: number;
        createdModels: number;
        createdDistributors: number;
        errors: number;
        details?: {
          totalErrors: number;
          truncated: boolean;
          sampledErrors: Array<{
            device: { imei?: string; modelo?: string };
            error: string;
          }>;
        };
      };
      const baseSummary = `Procesados: ${processed} | Creados: ${created} | Actualizados: ${updated} | Modelos: ${createdModels} | Distribuidoras: ${createdDistributors}`;
      if (!success || errors > 0) {
        const sampledErrors = details?.sampledErrors ?? [];
        const truncated = details?.truncated ?? false;
        let sampleDescription = '';
        if (sampledErrors.length > 0) {
          const formattedSamples = sampledErrors
            .slice(0, 3)
            .map(({ device, error }) => {
              const identifier = device.imei || device.modelo || 'Equipo sin IMEI';
              return `${identifier}: ${error}`;
            })
            .join(' | ');
          sampleDescription = ` | Ejemplos: ${formattedSamples}${truncated ? ' (mas errores omitidos)' : ''}`;
        }
        toast.error('Sincronizacion finalizada con errores', {
          description: `${baseSummary} | Errores: ${errors}${sampleDescription}`,
          duration: 6000,
        });
      } else {
        toast.success('Sincronizacion completada', {
          description: baseSummary,
          duration: 5000,
        });
      }
      await refresh();
    } catch (error) {
      console.error('Error syncing stock:', error);
      toast.error(error instanceof Error ? error.message : 'Error al sincronizar con la base de datos');
    } finally {
      setIsSyncing(false);
    }
  };



  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error loading stock data: {error}</p>
          <Button onClick={refresh} color="primary">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-h-screen ">
      <section className="space-y-3">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {metrics.map((metric) => (
            <div
              key={metric.id}
              className="flex flex-col gap-4 rounded-lg border border-surface bg-surface-1 p-4 shadow-xs"
            >
              <div className="flex items-center gap-3">
                <FeaturedIcon size="md" color="brand" theme="modern-neue" icon={metric.icon} />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-secondary">{metric.label}</span>
                  <span className="text-2xl font-semibold text-primary">{metric.value}</span>
                </div>
              </div>
              {metric.subtitle ? <p className="text-xs text-tertiary">{metric.subtitle}</p> : null}
            </div>
          ))}
        </div>
      </section>

      <TableCard.Root>
        <TableCard.Header
          title="Inventario de dispositivos"
          badge={`${sortedItems.length} ${sortedItems.length === 1 ? 'dispositivo' : 'dispositivos'}`}
          description={lastUpdated ? `Ultima actualizacion: ${formatDate(lastUpdated)}` : undefined}
          contentTrailing={
            <div className="absolute top-5 right-4 md:right-6 flex items-center justify-end gap-3">
              <ButtonUtility
                tooltip="Agregar Dispositivo" 
                size="sm"
                icon={Plus}
                onClick={() => setIsAddModalOpen(true)}
                disabled={isLoading || isSyncing}
              />
                
              
             <Button
                color="secondary"
                size="md"
                iconLeading={Database01}
                onClick={handleSync}
                disabled={isLoading || isSyncing}
              >
                {isSyncing ? "Sincronizando..." : "Sincronizar DB"}
              </Button>
              <TableRowActionsDropdown />
            </div>
          }
        />

        {/* Search and Filter Bar */}
        <div className="flex flex-col gap-4 border-b border-secondary px-4 py-4 md:px-6">
          <div className="w-full overflow-x-auto">
            <Tabs
              selectedKey={activeView}
              onSelectionChange={(key) => setActiveView(key as StockView)}
              className="w-full"
            >
              <Tabs.List type="button-minimal" items={tabItems} className="min-w-max">
                {(item) => <Tabs.Item key={item.id} {...item} />}
              </Tabs.List>
            </Tabs>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
              <Input
                icon={SearchLg}
                aria-label="Buscar dispositivos"
                placeholder="Buscar por IMEI, nombre asignado, ticket, modelo o distribuidora..."
                value={searchQuery}
                onChange={(val) => setSearchQuery(val)}
                className="w-full sm:w-80"
              />
              <Button
                size="md"
                color="secondary"
                iconLeading={FilterLines}
                className="w-full sm:w-auto whitespace-nowrap"
                onClick={() => setShowFilters((current) => !current)}
              >
                Filtros
                {hasActiveFilters && (
                  <Badge size="sm" color="brand" className="ml-2">
                    {(stateFilter !== "all" ? 1 : 0) +
                      (distributorFilter !== "all" ? 1 : 0) +
                      (statusDbFilter !== "all" ? 1 : 0) +
                      (modelFilter !== "all" ? 1 : 0) +
                      (backupFilter !== "all" ? 1 : 0) +
                      (backupDistributorFilter !== "all" ? 1 : 0)}
                  </Badge>
                )}
              </Button>
            </div>

            {hasActiveFilters && (
              <Button
                size="sm"
                color="secondary"
                iconLeading={X}
                onClick={clearFilters}
                className="self-start sm:self-auto"
              >
                Limpiar filtros
              </Button>
            )}
          </div>

          {showFilters && (
            <div className="flex flex-col gap-3 rounded-lg border border-surface bg-surface-1 p-4">
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                <Select
                  label="Modelo"
                  selectedKey={modelFilter}
                  onSelectionChange={(key) => setModelFilter(key as string)}
                  items={modelSelectOptions}
                >
                  {(item) => (
                    <Select.Item id={item.id}>
                      {item.label}
                    </Select.Item>
                  )}
                </Select>

                <Select
                  label="Estado"
                  selectedKey={stateFilter}
                  onSelectionChange={(key) => setStateFilter(key as string)}
                  items={stateFilterOptions as any}
                >
                  {(item) => (
                    <Select.Item id={item.id}>
                      {item.label}
                    </Select.Item>
                  )}
                </Select>

                <Select
                  label="Distribuidora"
                  selectedKey={distributorFilter}
                  onSelectionChange={(key) => setDistributorFilter(key as string)}
                  items={distributorOptions}
                >
                  {(item) => (
                    <Select.Item id={item.id}>
                      {item.label}
                    </Select.Item>
                  )}
                </Select>

                <Select
                  label="Estado (DB)"
                  selectedKey={statusDbFilter}
                  onSelectionChange={(key) => setStatusDbFilter(key as string)}
                  items={statusDbFilterOptions as any}
                >
                  {(item) => (
                    <Select.Item id={item.id}>
                      {item.label}
                    </Select.Item>
                  )}
                </Select>

                <Select
                  label="Backup"
                  selectedKey={backupFilter}
                  onSelectionChange={(key) => setBackupFilter(key as string)}
                  items={backupFilterOptions as any}
                >
                  {(item) => (
                    <Select.Item id={item.id}>
                      {item.label}
                    </Select.Item>
                  )}
                </Select>

                {backupFilter === "true" && (
                  <Select
                    label="Distribuidora de backup"
                    selectedKey={backupDistributorFilter}
                    onSelectionChange={(key) => setBackupDistributorFilter(key as string)}
                    items={backupDistributorOptions}
                  >
                    {(item) => (
                      <Select.Item id={item.id}>
                        {item.label}
                      </Select.Item>
                    )}
                  </Select>
                )}
              </div>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-3">Cargando datos...</span>
          </div>
        ) : (
          <>
            <Table className="min-w-full"
              aria-label="Inventario de telefonos" 

              
              sortDescriptor={sortDescriptor} 
              onSortChange={setSortDescriptor}
            >
              <Table.Header>
                <Table.Head id="modelo" label="Dispositivo" isRowHeader allowsSorting className="w-auto" />
                <Table.Head id="estado" label="Estado" className="w-40" />
                <Table.Head id="asignado_a" label="Asignacion" allowsSorting className="w-auto" />
                <Table.Head id="distribuidora" label="Logistica" allowsSorting className="w-auto" />
                <Table.Head id="ticket" label="Tickets" allowsSorting className="hidden xl:table-cell w-32" />
                <Table.Head id="actions" className="w-24" />
              </Table.Header>

              <Table.Body items={paginatedData}>
                {(item) => {
                  const latestAssignment = getLatestAssignment(item);
                  const deviceState = getDeviceState(item);
                  const hasActiveAssignment = latestAssignment && latestAssignment.status === 'active';
                  const assignmentCode = hasActiveAssignment ? latestAssignment.id.slice(-8).toUpperCase() : null;
                  const assigneeName = hasActiveAssignment ? (latestAssignment.assignee_name || item.asignado_a) : (item.asignado_a || null);
                  const assigneePhone = hasActiveAssignment ? latestAssignment.assignee_phone : null;
                  const deliveryLocation = hasActiveAssignment ? latestAssignment.delivery_location : null;
                  const assignmentDate = hasActiveAssignment && latestAssignment.at ? formatDate(latestAssignment.at) : null;
                  const shippingVoucher = latestAssignment?.shipping_voucher_id || null;
                  const expectsReturn = Boolean(latestAssignment?.expects_return);

                  return (
                    <Table.Row id={item.imei} className="align-top">
                      <Table.Cell>
                        <div className="flex flex-col gap-1">
                          <Link
                            href={`/stock/${item.imei}`}
                            className="font-medium text-primary transition hover:text-brand-primary hover:underline"
                          >
                            {item.modelo || "-"}
                          </Link>
                          <span className="font-mono text-xs text-secondary">{item.imei || "-"}</span>
                        </div>
                      </Table.Cell>
                      <Table.Cell>
                        <BadgeWithDot type="modern" color={deviceState.color} size="sm">
                          {deviceState.label}
                        </BadgeWithDot>
                      </Table.Cell>
                      <Table.Cell>
                        <div className="flex flex-col gap-0.5">
                          {assigneeName ? (
                            <>
                              <span className="text-sm font-medium text-primary truncate">{assigneeName}</span>
                              {assigneePhone && (
                                <span className="text-xs text-tertiary">{assigneePhone}</span>
                              )}
                            </>
                          ) : (
                            <Badge size="sm" color="gray">Sin asignacion</Badge>
                          )}
                        </div>
                      </Table.Cell>
                      <Table.Cell>
                        <div className="flex flex-col gap-0.5">
                          {item.is_backup && item.backup_distributor && (
                            <Badge size="sm" color="success" className="mb-1">
                              Backup: {item.backup_distributor.name}
                            </Badge>
                          )}
                          {getDistribuidoraBadge(item.distribuidora)}
                          {shippingVoucher && (
                            <span className="text-xs text-secondary font-mono">{shippingVoucher}</span>
                          )}
                          {expectsReturn && (
                            <Badge size="sm" color="warning">Espera devolucion</Badge>
                          )}
                        </div>
                      </Table.Cell>
                      <Table.Cell className="hidden w-[140px] xl:table-cell">
                        {(() => {
                          const ticketInfo = getTicketInfo(item.ticket);

                          if (!ticketInfo) {
                            return (
                              <BadgeWithDot type="modern" color="gray" size="lg">
                                Sin asignar
                              </BadgeWithDot>
                            );
                          }

                          const clickable = Boolean(ticketInfo.url);

                          return (
                            <div
                              className={clickable ? "cursor-pointer" : "cursor-default"}
                              onClick={clickable ? () => openTicket(item.ticket || "") : undefined}
                            >
                              <BadgeWithDot type="modern" color="blue-light" size="lg">
                                {ticketInfo.display}
                              </BadgeWithDot>
                            </div>
                          );
                        })()}
                      </Table.Cell>
                      <Table.Cell className="px-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <ButtonUtility
                            size="xs"
                            color="secondary"
                            tooltip="Editar dispositivo"
                            icon={Edit01}
                            onClick={() => {
                              setDeviceToEdit(item);
                              setIsEditModalOpen(true);
                            }}
                          />

                          <Button size="sm" color="secondary" href={`/stock/${item.imei}`}>
                            Ver mas
                          </Button>

                          {!isRecordAssigned(item) && (
                            <ButtonUtility
                              size="xs"
                              color="secondary"
                              tooltip={
                                item.soti_info?.is_in_soti
                                  ? "Asignar dispositivo (con datos SOTI)"
                                  : "Asignar dispositivo manualmente"
                              }
                              icon={Send01}
                              onClick={() => {
                                router.push(`/stock/assign/${item.imei}`);
                              }}
                            />
                          )}

                          {isRecordAssigned(item) && (
                            <ButtonUtility
                              size="xs"
                              color="secondary"
                              tooltip="Ver detalles de asignacion"
                              icon={Eye}
                              onClick={() => {
                                setSelectedDevice(item);
                                setIsViewAssignmentModalOpen(true);
                              }}
                            />
                          )}

                          <ShippingActions
                            assignment={getLatestAssignment(item) as any}
                            onEdit={() => {
                              setSelectedDevice(item);
                              setIsUpdateShippingModalOpen(true);
                            }}
                            onSuccess={refresh}
                            size="sm"
                            variant="utility"
                          />
                        </div>
                      </Table.Cell>
                    </Table.Row>
                  );
                }}
              </Table.Body>
            </Table>

            <PaginationCardMinimal
              align="right"
              page={page}
              total={totalPages}
              onPageChange={setPage}
              className="px-4 py-3 md:px-5 md:pt-3 md:pb-4"
            />
          </>
        )}
      </TableCard.Root>

      <CreateStockModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSuccess={refresh}
      />
      
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


