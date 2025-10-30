"use client";

import Link from "next/link";
import { useState, useMemo, useEffect } from "react";
import { ArrowCircleRight, Box, CheckCircle, Database01, Plus, SearchLg, Send01, UploadCloud02, Eye } from "@untitledui/icons";
import type { SortDescriptor } from "react-aria-components";
import { PaginationCardMinimal } from "@/components/application/pagination/pagination";
import { Table, TableCard, TableRowActionsDropdown } from "@/components/application/table/table";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Input } from "@/components/base/input/input";
import { Badge, BadgeWithDot } from "@/components/base/badges/badges";
import { Tabs } from "@/components/application/tabs/tabs";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icons";
import { useFilteredStockData } from "@/hooks/use-stock-data";
import { CreateStockModal } from "@/features/stock/components/create/create-stock-modal";
import { AssignDeviceModal } from "@/features/stock/components/assign";
import { ViewAssignmentModal } from "@/features/stock/components/view-assignment";
import type { InventoryRecord } from "@/lib/types";
import { cx } from "@/utils/cx";
import { toast } from "sonner";

type StockView = "overview" | "pending_soti" | "in_transit" | "completed";

const COMPLETED_ASSIGNMENT_STATUSES = new Set(["completed", "closed", "finalized", "returned"]);

type StatusBadgeColor = "brand" | "success" | "warning" | "gray" | "blue-light" | "error";

interface DeviceStateBadge {
  label: string;
  color: StatusBadgeColor;
  description?: string;
}

const getLatestAssignment = (record: InventoryRecord) => {
  const assignments = (record.raw?.assignments as any[]) ?? [];
  return assignments[0] ?? null;
};

const getDeviceState = (record: InventoryRecord): DeviceStateBadge => {
  const latestAssignment = getLatestAssignment(record);
  const normalizedAssignmentStatus =
    typeof latestAssignment?.status === "string" ? latestAssignment.status.toLowerCase() : null;

  if (latestAssignment?.shipping_voucher_id && (!normalizedAssignmentStatus || normalizedAssignmentStatus === "active")) {
    return { label: "En envio", color: "blue-light", description: latestAssignment.shipping_voucher_id };
  }

  if (normalizedAssignmentStatus && COMPLETED_ASSIGNMENT_STATUSES.has(normalizedAssignmentStatus)) {
    return { label: "Cerrada", color: "success" };
  }

  if (record.is_assigned) {
    return { label: "Asignado", color: "brand" };
  }

  if (record.soti_info?.is_in_soti) {
    return { label: "Pendiente SOTI", color: "warning" };
  }

  if (record.status === "LOST") {
    return { label: "Perdido", color: "error" };
  }

  if (record.status === "NEW") {
    return { label: "Disponible", color: "success" };
  }

  return { label: record.status_label || "Sin estado", color: "gray" };
};

export function StockTable() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: "modelo",
    direction: "ascending",
  });
  const [activeView, setActiveView] = useState<StockView>("overview");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isViewAssignmentModalOpen, setIsViewAssignmentModalOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<InventoryRecord | null>(null);

  const { data, isLoading, error, lastUpdated, refresh } = useFilteredStockData(searchQuery);

  const categorizedData = useMemo(() => {
    const pendingSotiRecords: InventoryRecord[] = [];
    const inTransitRecords: InventoryRecord[] = [];
    const completedRecords: InventoryRecord[] = [];
    let assignedCount = 0;
    let availableCount = 0;

    data.forEach((record) => {
      if (record.is_assigned) {
        assignedCount += 1;
      } else {
        availableCount += 1;
      }

      if (record.soti_info?.is_in_soti && !record.is_assigned) {
        pendingSotiRecords.push(record);
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
      pendingSotiRecords,
      inTransitRecords,
      completedRecords,
      assignedCount,
      availableCount,
    };
  }, [data]);

  const {
    pendingSotiRecords,
    inTransitRecords,
    completedRecords,
    assignedCount,
    availableCount,
  } = categorizedData;

  const filteredData = useMemo(() => {
    switch (activeView) {
      case "pending_soti":
        return pendingSotiRecords;
      case "in_transit":
        return inTransitRecords;
      case "completed":
        return completedRecords;
      default:
        return data;
    }
  }, [activeView, data, pendingSotiRecords, inTransitRecords, completedRecords]);

  // Sort data
  const sortedItems = useMemo(() => {
    const items = [...filteredData];

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
  }, [filteredData, sortDescriptor]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return sortedItems.slice(startIndex, startIndex + pageSize);
  }, [sortedItems, page, pageSize]);

  const totalPages = Math.ceil(sortedItems.length / pageSize);

  const numberFormatter = useMemo(() => new Intl.NumberFormat("es-AR"), []);
  const totalDevices = data.length;
  const pendingSotiCount = pendingSotiRecords.length;
  const inTransitCount = inTransitRecords.length;
  const completedCount = completedRecords.length;

  const metrics = useMemo(() => {
    const formatValue = (value: number) => numberFormatter.format(value);

    if (isLoading) {
      return [
        { id: "total", label: "Inventario total", value: "...", icon: Database01, subtitle: "" },
        { id: "assigned", label: "Asignados activos", value: "...", icon: ArrowCircleRight, subtitle: "" },
        { id: "available", label: "Disponibles", value: "...", icon: Box, subtitle: "" },
        { id: "pending", label: "Pendientes SOTI", value: "...", icon: UploadCloud02, subtitle: "" },
        { id: "in_transit", label: "En envío", value: "...", icon: Send01, subtitle: "" },
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
        subtitle: "Con asignación vigente",
      },
      {
        id: "available",
        label: "Disponibles",
        value: formatValue(availableCount),
        icon: Box,
        subtitle: "Sin asignación activa",
      },
      {
        id: "pending",
        label: "Pendientes SOTI",
        value: formatValue(pendingSotiCount),
        icon: UploadCloud02,
        subtitle: "En SOTI sin asignación",
      },
      {
        id: "in_transit",
        label: "En envío",
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
    pendingSotiCount,
    inTransitCount,
    completedCount,
  ]);

  const tabItems = useMemo(
    () => [
      { id: "overview" as const, label: "Resumen", badge: totalDevices },
      { id: "pending_soti" as const, label: "Pendientes SOTI", badge: pendingSotiCount },
      { id: "in_transit" as const, label: "En envío", badge: inTransitCount },
      { id: "completed" as const, label: "Cerradas", badge: completedCount },
    ],
    [totalDevices, pendingSotiCount, inTransitCount, completedCount],
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
    if (!ticket) return;
    const url = `https://desasa.atlassian.net/browse/DESA-${ticket}`;
    window.open(url, "_blank");
  };

  const getDistribuidoraName = (fullPath: string) => {
    if (!fullPath) return "-";
    
    // Extract everything after the first backslash and before the second
    if (fullPath.startsWith("\\\\")) {
      // Remove the first two backslashes
      const withoutPrefix = fullPath.substring(2);
      const nextSlashIndex = withoutPrefix.indexOf("\\");
      
      if (nextSlashIndex !== -1) {
        return withoutPrefix.substring(0, nextSlashIndex);
      }
      return withoutPrefix;
    }
    
    return fullPath; // Return full path if doesn't match expected format
  };

  const getDistribuidoraBadge = (distribuidora: string) => {
    if (!distribuidora) return <Badge color="gray" size="sm">-</Badge>;
    
    return (
      <BadgeWithDot type="modern" color="brand" size="lg">
          {getDistribuidoraName(distribuidora)}
      </BadgeWithDot>
    );
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
        throw new Error('Respuesta inv?lida del servidor');
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
          sampleDescription = ` | Ejemplos: ${formattedSamples}${truncated ? ' (m?s errores omitidos)' : ''}`;
        }
        toast.error('Sincronizaci?n finalizada con errores', {
          description: `${baseSummary} | Errores: ${errors}${sampleDescription}`,
          duration: 6000,
        });
      } else {
        toast.success('Sincronizaci?n completada', {
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
          description={lastUpdated ? `Última actualización: ${formatDate(lastUpdated)}` : undefined}
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
            <Input
              icon={SearchLg}
              aria-label="Buscar dispositivos"
              placeholder="Buscar por IMEI, nombre asignado, ticket, modelo o distribuidora..."
              value={searchQuery}
              onChange={(val) => setSearchQuery(val)}
              className="w-full sm:w-80"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-3">Cargando datos...</span>
          </div>
        ) : (
          <>
            <Table 
              aria-label="Inventario de teléfonos" 

              
              sortDescriptor={sortDescriptor} 
              onSortChange={setSortDescriptor}
            >
              <Table.Header>
                <Table.Head id="modelo" label="Dispositivo" isRowHeader allowsSorting className="w-52" />
                <Table.Head id="estado" label="Estado" className="w-40" />
                <Table.Head id="asignado_a" label="Asignacion" allowsSorting />
                <Table.Head id="distribuidora" label="Logistica" allowsSorting />
                <Table.Head id="ticket" label="Tickets" allowsSorting className="hidden xl:table-cell" />
                <Table.Head id="actions" className="w-20" />
              </Table.Header>

              <Table.Body items={paginatedData}>
                {(item) => {
                  const latestAssignment = getLatestAssignment(item);
                  const deviceState = getDeviceState(item);
                  const assigneeName = latestAssignment?.assignee_name || item.asignado_a || null;
                  const assigneePhone = latestAssignment?.assignee_phone || null;
                  const deliveryLocation = latestAssignment?.delivery_location || null;
                  const assignmentDate = latestAssignment?.at ? formatDate(latestAssignment.at) : null;
                  const shippingVoucher = latestAssignment?.shipping_voucher_id || null;
                  const expectsReturn = Boolean(latestAssignment?.expects_return);

                  return (
                    <Table.Row id={item.imei}>
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
                        <div className="flex flex-col gap-1">
                          <BadgeWithDot type="modern" color={deviceState.color} size="lg">
                            {deviceState.label}
                          </BadgeWithDot>
                          <span className="text-xs text-tertiary">
                            {item.soti_info?.last_sync
                              ? `SOTI ${formatDate(item.soti_info.last_sync)}`
                              : `Actualizado ${formatDate(item.updated_at)}`}
                          </span>
                        </div>
                      </Table.Cell>
                      <Table.Cell>
                        <div className="flex flex-col gap-1">
                          {assigneeName ? (
                            <span className="font-medium text-primary">{assigneeName}</span>
                          ) : (
                            <span className="text-xs italic text-tertiary">Sin asignar</span>
                          )}
                          {assigneePhone ? (
                            <span className="text-xs text-tertiary">{assigneePhone}</span>
                          ) : null}
                          {deliveryLocation ? (
                            <span className="text-xs text-tertiary">{deliveryLocation}</span>
                          ) : null}
                          {assignmentDate ? (
                            <span className="text-xs text-tertiary">Ultimo mov. {assignmentDate}</span>
                          ) : null}
                        </div>
                      </Table.Cell>
                      <Table.Cell>
                        <div className="flex flex-col gap-1">
                          {getDistribuidoraBadge(item.distribuidora)}
                          {shippingVoucher ? (
                            <Badge size="sm" color="brand">
                              Vale {shippingVoucher}
                            </Badge>
                          ) : (
                            <span className="text-xs text-tertiary">Sin vale</span>
                          )}
                          {expectsReturn ? (
                            <Badge size="sm" color="warning">
                              Espera devolucion
                            </Badge>
                          ) : null}
                        </div>
                      </Table.Cell>
                      <Table.Cell className="hidden xl:table-cell">
                        {item.ticket ? (
                          <div className="cursor-pointer" onClick={() => openTicket(item.ticket)}>
                            <BadgeWithDot type="modern" color="blue-light" size="lg">
                              {`DESA-${item.ticket}`}
                            </BadgeWithDot>
                          </div>
                        ) : (
                          <BadgeWithDot type="modern" color="gray" size="lg">
                            Sin asignar
                          </BadgeWithDot>
                        )}
                      </Table.Cell>
                      <Table.Cell className="px-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button size="sm" color="secondary" href={`/stock/${item.imei}`}>
                            Ver mas
                          </Button>

                          {item.soti_info?.is_in_soti &&
                           item.status === 'NEW' &&
                           !item.is_assigned && (
                            <ButtonUtility
                              size="xs"
                              color="secondary"
                              tooltip="Asignar dispositivo"
                              icon={Send01}
                              onClick={() => {
                                setSelectedDevice(item);
                                setIsAssignModalOpen(true);
                              }}
                            />
                          )}

                          {item.is_assigned && (
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
      
      <AssignDeviceModal
        open={isAssignModalOpen}
        onOpenChange={setIsAssignModalOpen}
        deviceId={selectedDevice?.raw?.soti_device?.id || null}
        deviceName={selectedDevice?.soti_info?.device_name || null}
        deviceInfo={{
          device_name: selectedDevice?.soti_info?.device_name,
          imei: selectedDevice?.imei,
          model: selectedDevice?.modelo,
        }}
        onSuccess={refresh}
      />
      
      <ViewAssignmentModal
        open={isViewAssignmentModalOpen}
        onOpenChange={setIsViewAssignmentModalOpen}
        deviceId={selectedDevice?.raw?.soti_device?.id || null}
        deviceInfo={{
          device_name: selectedDevice?.soti_info?.device_name,
          imei: selectedDevice?.imei,
          model: selectedDevice?.modelo,
        }}
      />
    </div>
  );
}


