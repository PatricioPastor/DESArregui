"use client";

import { useState, useMemo } from "react";
import { Edit01, FilterLines, RefreshCw01, SearchLg, Trash01 } from "@untitledui/icons";
import type { Key, SortDescriptor } from "react-aria-components";
import { PaginationCardMinimal } from "@/components/application/pagination/pagination";
import { Table, TableCard, TableRowActionsDropdown } from "@/components/application/table/table";
import { ButtonGroup, ButtonGroupItem } from "@/components/base/button-group/button-group";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Input } from "@/components/base/input/input";
import { Badge, BadgeWithDot } from "@/components/base/badges/badges";
import { useFilteredBaseData } from "@/hooks/use-base-data";
import { useOptimisticRecordActions } from "@/hooks/use-record-actions";
import { EditRecordModal } from "./edit-record-modal";
import type { IMEIRecord } from "@/lib/types";
import { cx } from "@/utils/cx";

type FilterType = "all" | "activos" | "inactivos";

export function IMEITable() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: "ultima_conexion",
    direction: "descending",
  });
  const [selectedFilter, setSelectedFilter] = useState<Set<Key>>(new Set(["all"]));
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [editingRecord, setEditingRecord] = useState<IMEIRecord | null>(null);
  const [localData, setLocalData] = useState<IMEIRecord[]>([]);

  const baseDataHook = useFilteredBaseData(searchQuery);
  const { data: fetchedData, isLoading, error, lastUpdated, totalRecords, refresh } = baseDataHook;
  
  // Use local data if available, otherwise use fetched data
  const data = localData.length > 0 ? localData : fetchedData;
  
  // Initialize local data when fetched data changes
  useState(() => {
    if (fetchedData.length > 0 && localData.length === 0) {
      setLocalData(fetchedData);
    }
  });

  const { optimisticBatchUpdate, isUpdating } = useOptimisticRecordActions(data, setLocalData);

  // Filter data based on selected filter
  const filteredData = useMemo(() => {
    let filtered = data;

    switch (selectedFilter.values().next().value) {
      case "activos":
        filtered = data.filter(record => 
          record.status_asignación?.toLowerCase().includes("usando") ||
          record.status_asignación?.toLowerCase().includes("activo")
        );
        break;
      case "inactivos":
        filtered = data.filter(record => 
          !record.status_asignación?.toLowerCase().includes("usando") &&
          !record.status_asignación?.toLowerCase().includes("activo")
        );
        break;
      default:
        filtered = data;
    }

    return filtered;
  }, [data, selectedFilter]);

  // Sort data
  const sortedItems = useMemo(() => {
    return filteredData.sort((a, b) => {
      const first = a[sortDescriptor.column as keyof IMEIRecord] as string;
      const second = b[sortDescriptor.column as keyof IMEIRecord] as string;

      if (!first && !second) return 0;
      if (!first) return 1;
      if (!second) return -1;

      // Handle date sorting for conexion fields
      if (sortDescriptor.column === "ultima_conexion" || sortDescriptor.column === "primera_conexion") {
        const firstDate = new Date(first).getTime();
        const secondDate = new Date(second).getTime();
        return sortDescriptor.direction === "descending" ? secondDate - firstDate : firstDate - secondDate;
      }

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

  const getStatusBadge = (status: string) => {
    if (!status) return <Badge color="gray" size="sm">-</Badge>;
    
    const isActive = status.toLowerCase().includes("usando") || status.toLowerCase().includes("activo");
    
    return (
      <BadgeWithDot 
        size="sm" 
        color={isActive ? "success" : "gray"} 
        type="modern"
      >
        {status}
      </BadgeWithDot>
    );
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

  const handleEditRecord = (record: IMEIRecord) => {
    setEditingRecord(record);
  };

  const handleSaveRecord = async (updates: Partial<IMEIRecord>) => {
    if (!editingRecord) return false;
    
    const success = await optimisticBatchUpdate({
      imei: editingRecord.imei,
      updates,
    });

    return success;
  };

  const handleRefresh = async () => {
    setLocalData([]); // Clear local data to force refresh from server
    await refresh();
  };

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error loading IMEI data: {error}</p>
          <Button onClick={refresh} color="primary">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 -mt-6">


      <TableCard.Root>
        <TableCard.Header
          title="IMEI y Dispositivos"
          badge={`${sortedItems.length} ${sortedItems.length === 1 ? 'dispositivo' : 'dispositivos'}`}
          description={lastUpdated ? `Última actualización: ${formatDate(lastUpdated)}` : undefined}
          contentTrailing={
            <div className="absolute top-5 flex items-center gap-4 right-4 md:right-6">
              <Button 
            color="secondary" 
            size="md" 
            iconLeading={RefreshCw01} 
            onClick={handleRefresh}
            disabled={isLoading || isUpdating}
          >
            {isLoading ? "Actualizando..." : "Actualizar"}
          </Button> 
              <TableRowActionsDropdown />
            </div>
          }
        />

        {/* Search and Filter Bar */}
        <div className="flex flex-col gap-4 border-b border-secondary px-4 py-4 md:px-6 md:flex-row md:items-center md:justify-between">
          <ButtonGroup 
            selectedKeys={selectedFilter} 
            onSelectionChange={setSelectedFilter}
          >
            <ButtonGroupItem id="all">Ver todos</ButtonGroupItem>
            <ButtonGroupItem id="activos">Activos</ButtonGroupItem>
            <ButtonGroupItem id="inactivos">Inactivos</ButtonGroupItem>
          </ButtonGroup>

          <div className="flex gap-3">
            <Input
              icon={SearchLg}
              aria-label="Buscar dispositivos"
              placeholder="Buscar IMEI, nombre, modelo..."
              value={searchQuery}
              onChange={(e:any) => setSearchQuery(e.target.value)}
              className="w-full md:w-80"
            />
            <Button size="md" color="secondary" iconLeading={FilterLines}>
              Filtros
            </Button>
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
              aria-label="Dispositivos IMEI" 
              selectionMode="multiple" 
              sortDescriptor={sortDescriptor} 
              onSortChange={setSortDescriptor}
            >
              <Table.Header>
                <Table.Head id="imei" label="IMEI" isRowHeader allowsSorting className="w-40" />
                <Table.Head id="nombre_soti" label="Usuario" allowsSorting />
                <Table.Head id="distribuidora_soti" label="Distribuidora" allowsSorting />
                <Table.Head id="modelo" label="Modelo" allowsSorting />
                <Table.Head id="status_asignación" label="Estado" allowsSorting />
                <Table.Head id="ultima_conexion" label="Última Conexión" allowsSorting className="w-44" />
                <Table.Head id="linea_e_tarifacion" label="Línea" allowsSorting className="hidden xl:table-cell" />
                <Table.Head id="ticket" label="Ticket" allowsSorting className="hidden lg:table-cell" />
                <Table.Head id="actions" className="w-20" />
              </Table.Header>

              <Table.Body items={paginatedData}>
                {(item) => (
                  <Table.Row id={item.imei}>
                    <Table.Cell>
                      <span className="font-mono text-xs">{item.imei || "-"}</span>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex flex-col">
                        <span className="font-medium text-primary">{item.nombre_soti || "-"}</span>
                        <span className="text-xs text-secondary">{item.id_soti || "-"}</span>
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <BadgeWithDot type="modern" color="brand">
                         {getDistribuidoraName(item.distribuidora_soti)}
                      </BadgeWithDot>
                    </Table.Cell>
                    <Table.Cell className="whitespace-nowrap">{item.modelo || "-"}</Table.Cell>
                    <Table.Cell>{getStatusBadge(item.status_asignación)}</Table.Cell>
                    <Table.Cell className="whitespace-nowrap text-sm">
                      {formatDate(item.ultima_conexion)}
                    </Table.Cell>
                    <Table.Cell className="whitespace-nowrap hidden xl:table-cell">
                      {item.linea_e_tarifacion || "-"}
                    </Table.Cell>
                    <Table.Cell className="whitespace-nowrap hidden lg:table-cell">
                      <span className={cx(
                        "px-2 py-1 rounded text-xs",
                        item.ticket 
                          ? "bg-orange-50 text-orange-700" 
                          : "text-gray-400"
                      )}>
                        {item.ticket || "Sin ticket"}
                      </span>
                    </Table.Cell>
                    <Table.Cell className="px-3">
                      <div className="flex justify-end gap-0.5">
                        <ButtonUtility 
                          size="xs" 
                          color="tertiary" 
                          tooltip="Editar" 
                          icon={Edit01}
                          onClick={() => handleEditRecord(item)}
                          disabled={isUpdating}
                        />
                        <ButtonUtility size="xs" color="tertiary" tooltip="Eliminar" icon={Trash01} />
                      </div>
                    </Table.Cell>
                  </Table.Row>
                )}
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

      <EditRecordModal
        isOpen={!!editingRecord}
        onClose={() => setEditingRecord(null)}
        record={editingRecord}
        onSave={handleSaveRecord}
        isLoading={isUpdating}
      />
    </div>
  );
}