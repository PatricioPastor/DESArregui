"use client";

import { useState, useMemo, useCallback, useEffect, memo } from "react";
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

// Memoized table row component for better performance
const TableRow = memo<{ item: IMEIRecord; formatDate: (date: string) => string; getStatusBadge: (status: string) => any; getDistribuidoraName: (path: string) => string; onEdit: (record: IMEIRecord) => void; isUpdating: boolean }>(({ 
  item, 
  formatDate, 
  getStatusBadge, 
  getDistribuidoraName, 
  onEdit,
  isUpdating 
}) => {
  const handleEdit = useCallback(() => {
    onEdit(item);
  }, [item, onEdit]);

  return (
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
            onClick={handleEdit}
            disabled={isUpdating}
          />
          <ButtonUtility size="xs" color="tertiary" tooltip="Eliminar" icon={Trash01} />
        </div>
      </Table.Cell>
    </Table.Row>
  );
});

TableRow.displayName = 'TableRow';

// Memoized search and filter controls
const SearchFilterControls = memo<{
  selectedFilter: Set<Key>;
  onFilterChange: (filter: Set<Key>) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}>(({ selectedFilter, onFilterChange, searchQuery, onSearchChange }) => {
  const handleSearchChange = useCallback((e: any) => {
    onSearchChange(e.target.value);
  }, [onSearchChange]);

  return (
    <div className="flex flex-col gap-4 border-b border-secondary px-4 py-4 md:px-6 md:flex-row md:items-center md:justify-between">
      <ButtonGroup 
        selectedKeys={selectedFilter} 
        onSelectionChange={onFilterChange}
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
          onChange={handleSearchChange}
          className="w-full md:w-80"
        />
        <Button size="md" color="secondary" iconLeading={FilterLines}>
          Filtros
        </Button>
      </div>
    </div>
  );
});

SearchFilterControls.displayName = 'SearchFilterControls';

// Memoized table header
const TableHeader = memo<{
  totalItems: number;
  lastUpdated: string | null;
  formatDate: (date: string) => string;
  onRefresh: () => void;
  isLoading: boolean;
  isUpdating: boolean;
}>(({ totalItems, lastUpdated, formatDate, onRefresh, isLoading, isUpdating }) => {
  return (
    <TableCard.Header
      title="IMEI y Dispositivos"
      badge={`${totalItems} ${totalItems === 1 ? 'dispositivo' : 'dispositivos'}`}
      description={lastUpdated ? `Última actualización: ${formatDate(lastUpdated)}` : undefined}
      contentTrailing={
        <div className="absolute top-5 flex items-center gap-4 right-4 md:right-6">
          <Button 
            color="secondary" 
            size="md" 
            iconLeading={RefreshCw01} 
            onClick={onRefresh}
            disabled={isLoading || isUpdating}
          >
            {isLoading ? "Actualizando..." : "Actualizar"}
          </Button> 
          <TableRowActionsDropdown />
        </div>
      }
    />
  );
});

TableHeader.displayName = 'TableHeader';

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
  
  // Initialize local data when fetched data changes (using useEffect instead of useState)
  useEffect(() => {
    if (fetchedData.length > 0 && localData.length === 0) {
      setLocalData(fetchedData);
    }
  }, [fetchedData, localData.length]);

  const { optimisticBatchUpdate, isUpdating } = useOptimisticRecordActions(data, setLocalData);

  // Memoized filter functions for better performance
  const activeStatusFilter = useCallback((record: IMEIRecord) => {
    const status = record.status_asignación?.toLowerCase();
    return status?.includes("usando") || status?.includes("activo");
  }, []);

  const inactiveStatusFilter = useCallback((record: IMEIRecord) => {
    const status = record.status_asignación?.toLowerCase();
    return !status?.includes("usando") && !status?.includes("activo");
  }, []);

  // Optimized filter with specific filter type dependency
  const currentFilterType = useMemo(() => {
    return selectedFilter.values().next().value as FilterType;
  }, [selectedFilter]);

  const filteredData = useMemo(() => {
    if (!data.length) return [];
    
    switch (currentFilterType) {
      case "activos":
        return data.filter(activeStatusFilter);
      case "inactivos":
        return data.filter(inactiveStatusFilter);
      default:
        return data;
    }
  }, [data, currentFilterType, activeStatusFilter, inactiveStatusFilter]);

  // Optimized sorting with stable sort and better memoization
  const sortedItems = useMemo(() => {
    if (!filteredData.length) return [];
    
    const { column, direction } = sortDescriptor;
    const isDescending = direction === "descending";
    const isDateColumn = column === "ultima_conexion" || column === "primera_conexion";
    
    // Use slice to avoid mutating original array
    return [...filteredData].sort((a, b) => {
      const first = a[column as keyof IMEIRecord] as string;
      const second = b[column as keyof IMEIRecord] as string;

      // Handle null/undefined values
      if (!first && !second) return 0;
      if (!first) return 1;
      if (!second) return -1;

      let comparison = 0;
      
      if (isDateColumn) {
        // Optimize date parsing with direct comparison
        const firstTime = new Date(first).getTime();
        const secondTime = new Date(second).getTime();
        comparison = firstTime - secondTime;
      } else {
        // Cache locale comparison
        comparison = first.localeCompare(second, 'es', { numeric: true });
      }
      
      return isDescending ? -comparison : comparison;
    });
  }, [filteredData, sortDescriptor.column, sortDescriptor.direction]);

  // Optimized pagination with early calculation
  const paginationInfo = useMemo(() => {
    const totalItems = sortedItems.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const startIndex = (page - 1) * pageSize;
    const paginatedData = sortedItems.slice(startIndex, startIndex + pageSize);
    
    return { paginatedData, totalPages, totalItems };
  }, [sortedItems, page, pageSize]);

  // Memoized date formatter to avoid repeated date parsing
  const formatDate = useCallback((dateString: string) => {
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
  }, []);

  // Memoized status badge component
  const getStatusBadge = useCallback((status: string) => {
    if (!status) return <Badge color="gray" size="sm">-</Badge>;
    
    const lowerStatus = status.toLowerCase();
    const isActive = lowerStatus.includes("usando") || lowerStatus.includes("activo");
    
    return (
      <BadgeWithDot 
        size="sm" 
        color={isActive ? "success" : "gray"} 
        type="modern"
      >
        {status}
      </BadgeWithDot>
    );
  }, []);

  // Memoized distribuidora name extractor
  const getDistribuidoraName = useCallback((fullPath: string) => {
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
  }, []);

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
        <TableHeader
          totalItems={paginationInfo.totalItems}
          lastUpdated={lastUpdated}
          formatDate={formatDate}
          onRefresh={handleRefresh}
          isLoading={isLoading}
          isUpdating={isUpdating}
        />

        <SearchFilterControls
          selectedFilter={selectedFilter}
          onFilterChange={setSelectedFilter}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

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

              <Table.Body items={paginationInfo.paginatedData}>
                {(item) => (
                  <TableRow
                    key={item.imei}
                    item={item}
                    formatDate={formatDate}
                    getStatusBadge={getStatusBadge}
                    getDistribuidoraName={getDistribuidoraName}
                    onEdit={handleEditRecord}
                    isUpdating={isUpdating}
                  />
                )}
              </Table.Body>
            </Table>

            <PaginationCardMinimal
              align="right"
              page={page}
              total={paginationInfo.totalPages}
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