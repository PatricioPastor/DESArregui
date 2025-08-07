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
import { useFilteredStockData } from "@/hooks/use-stock-data";
import type { StockRecord } from "@/lib/types";
import { cx } from "@/utils/cx";

type FilterType = "all" | "disponibles" | "asignados";

export function StockTable() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: "modelo",
    direction: "ascending",
  });
  const [selectedFilter, setSelectedFilter] = useState<Set<Key>>(new Set(["all"]));
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);

  const { data, isLoading, error, lastUpdated, totalRecords, refresh } = useFilteredStockData(searchQuery);

  // Filter data based on selected filter
  const filteredData = useMemo(() => {
    let filtered = data;

    switch (selectedFilter.values().next().value) {
      case "disponibles":
        filtered = data.filter(record => 
          !record.asignado_a || record.asignado_a.trim() === ""
        );
        break;
      case "asignados":
        filtered = data.filter(record => 
          record.asignado_a && record.asignado_a.trim() !== ""
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
      const first = a[sortDescriptor.column as keyof StockRecord] as string;
      const second = b[sortDescriptor.column as keyof StockRecord] as string;

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

  const getStatusBadge = (asignado: string) => {
    if (!asignado || asignado.trim() === "") {
      return <BadgeWithDot size="sm" color="success" type="modern">Disponible</BadgeWithDot>;
    }
    
    return <BadgeWithDot size="sm" color="gray" type="modern">Asignado</BadgeWithDot>;
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
    <div className="space-y-6 -mt-6">
      

      <TableCard.Root>
        <TableCard.Header
          title="Inventario de Stock"
          badge={`${sortedItems.length} ${sortedItems.length === 1 ? 'dispositivo' : 'dispositivos'}`}
          description={lastUpdated ? `Última actualización: ${formatDate(lastUpdated)}` : undefined}
          contentTrailing={
            <div className="absolute top-5 right-4 md:right-6 flex items-center justify-end gap-4">
              <Button 
                color="secondary" 
                size="md" 
                iconLeading={RefreshCw01} 
                onClick={refresh}
                disabled={isLoading}
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
            <ButtonGroupItem id="disponibles">Disponibles</ButtonGroupItem>
            <ButtonGroupItem id="asignados">Asignados</ButtonGroupItem>
          </ButtonGroup>

          <div className="flex gap-3">
            <Input
              icon={SearchLg}
              aria-label="Buscar dispositivos"
              placeholder="Buscar IMEI, modelo, asignado..."
              value={searchQuery}
              onChange={(e: any) => setSearchQuery(e.target.value)}
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
              aria-label="Stock de dispositivos" 
              selectionMode="multiple" 
              sortDescriptor={sortDescriptor} 
              onSortChange={setSortDescriptor}
            >
              <Table.Header>
                <Table.Head id="modelo" label="Modelo" isRowHeader allowsSorting className="w-48" />
                <Table.Head id="imei" label="IMEI" allowsSorting className="w-40" />
                <Table.Head id="distribuidora" label="Distribuidora" allowsSorting />
                <Table.Head id="asignado_a" label="Asignado A" allowsSorting />
                <Table.Head id="ticket" label="Ticket" allowsSorting className="hidden lg:table-cell" />
                <Table.Head id="actions" className="w-20" />
              </Table.Header>

              <Table.Body items={paginatedData}>
                {(item) => (
                  <Table.Row id={item.imei}>
                    <Table.Cell>
                      <div className="flex flex-col">
                        <span className="font-medium text-primary">{item.modelo || "-"}</span>
                        <span className="text-xs text-secondary">{getStatusBadge(item.asignado_a)}</span>
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <span className="font-mono text-xs">{item.imei || "-"}</span>
                    </Table.Cell>
                    <Table.Cell>
                      {getDistribuidoraBadge(item.distribuidora)}
                    </Table.Cell>
                    <Table.Cell className="whitespace-nowrap">
                      {item.asignado_a ? (
                        <span className="font-medium text-primary">{item.asignado_a}</span>
                      ) : (
                        <span className="text-gray-400 italic">No asignado</span>
                      )}
                    </Table.Cell>
                    <Table.Cell className="whitespace-nowrap hidden lg:table-cell">
                      <div className="cursor-pointer" onClick={() => openTicket(item.ticket)}>
                        <BadgeWithDot  type="modern" color={item.ticket ? 'blue-light' :"brand"} size="lg">
                          { 'DESA-'+ item.ticket || "Sin ticket"}
                        </BadgeWithDot>
                      </div>
                    </Table.Cell>
                    <Table.Cell className="px-3">
                      <div className="flex justify-end gap-0.5">
                        <ButtonUtility 
                          size="xs" 
                          color="tertiary" 
                          tooltip="Asignar" 
                          icon={Edit01}
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
    </div>
  );
}