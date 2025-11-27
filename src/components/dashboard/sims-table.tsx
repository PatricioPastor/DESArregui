"use client";

import { useState, useMemo, useEffect } from "react";
import { SearchLg, FilterLines, UploadCloud02, X } from "@untitledui/icons";
import type { SortDescriptor } from "react-aria-components";
import { PaginationCardMinimal } from "@/components/application/pagination/pagination";
import { Table, TableCard } from "@/components/application/table/table";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Input } from "@/components/base/input/input";
import { Badge, BadgeWithDot } from "@/components/base/badges/badges";
import { Select } from "@/components/base/select/select";
import { useSimsData } from "@/hooks/use-sims-data";
import { useDebounce } from "@/hooks/use-debounce";
import type { SimRecord } from "@/lib/types";
import { toast } from "sonner";

export function SimsTable() {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: "icc",
    direction: "ascending",
  });
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [distributorFilter, setDistributorFilter] = useState<string>("all");
  const [isActiveFilter, setIsActiveFilter] = useState<string>("all");
  const [isSyncing, setIsSyncing] = useState(false);

  const filters = useMemo(
    () => ({
      status: statusFilter !== "all" ? statusFilter : undefined,
      provider: providerFilter !== "all" ? providerFilter : undefined,
      distributorId: distributorFilter !== "all" ? distributorFilter : undefined,
      isActive: isActiveFilter !== "all" ? isActiveFilter === "true" : undefined,
    }),
    [statusFilter, providerFilter, distributorFilter, isActiveFilter]
  );

  const { data, isLoading, error, totalRecords, metadata, refresh } = useSimsData(
    debouncedSearchQuery,
    filters
  );

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, providerFilter, distributorFilter, isActiveFilter, debouncedSearchQuery]);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch("/api/sync/sims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sims: [] }), // Empty array triggers sync from source
      });

      if (!response.ok) {
        throw new Error("Error al sincronizar SIMs");
      }

      const result = await response.json();
      toast.success("Sincronización completada", {
        description: `Procesadas: ${result.processed}, Creadas: ${result.created}, Actualizadas: ${result.updated}`,
      });
      refresh();
    } catch (error) {
      toast.error("Error al sincronizar", {
        description: error instanceof Error ? error.message : "Error desconocido",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const clearFilters = () => {
    setStatusFilter("all");
    setProviderFilter("all");
    setDistributorFilter("all");
    setIsActiveFilter("all");
    setSearchQuery("");
  };

  // Filter and sort data
  const filteredData = useMemo(() => {
    return data.filter((sim) => {
      // Client-side filtering is minimal since server handles most of it
      // But we can add additional client-side logic here if needed
      return true;
    });
  }, [data]);

  const sortedItems = useMemo(() => {
    const items = [...filteredData];

    return items.sort((a, b) => {
      const column = sortDescriptor.column as keyof SimRecord;
      const first = a[column];
      const second = b[column];

      if (!first && !second) return 0;
      if (!first) return 1;
      if (!second) return -1;

      // Handle string sorting
      const cmp = String(first).localeCompare(String(second), 'es', { numeric: true });
      return sortDescriptor.direction === "descending" ? -cmp : cmp;
    });
  }, [filteredData, sortDescriptor]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return sortedItems.slice(startIndex, startIndex + pageSize);
  }, [sortedItems, page, pageSize]);

  const totalPages = Math.ceil(sortedItems.length / pageSize);

  const getProviderBadge = (provider: string) => {
    const color = provider === "CLARO" ? "brand" : "success";
    return (
      <Badge color={color} size="sm">
        {provider}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const colorMap: Record<string, "success" | "warning" | "gray" | "brand"> = {
      Activado: "success",
      Inventario: "warning",
    };
    const color = colorMap[status] || "gray";
    return (
      <Badge color={color} size="sm">
        {status}
      </Badge>
    );
  };


  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-error">Error al cargar SIMs: {error}</p>
        <Button onClick={refresh}>Reintentar</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Gestión de SIMs</h1>
          <p className="text-sm text-secondary mt-1">
            Total: {totalRecords.toLocaleString()} SIMs
            {metadata && (
              <>
                {" "}
                • Activas: {metadata.totalActive.toLocaleString()} • Inactivas:{" "}
                {metadata.totalInactive.toLocaleString()}
              </>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <ButtonUtility
            icon={UploadCloud02}
            onClick={handleSync}
            disabled={isSyncing}
            tooltip="Sincronizar SIMs"
          />
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Buscar por ICC o IP..."
              value={searchQuery}
              onChange={(value) => setSearchQuery(value)}
              icon={SearchLg}
            />
          </div>
          <ButtonUtility
            icon={FilterLines}
            onClick={() => setShowFilters(!showFilters)}
            tooltip="Mostrar/Ocultar filtros"
            color={showFilters ? "secondary" : "tertiary"}
          />
        </div>

        {showFilters && (
          <div className="flex flex-col gap-3 rounded-lg border border-surface bg-surface-1 p-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Filtros</h4>
              {(providerFilter !== "all" || distributorFilter !== "all" || statusFilter !== "all" || isActiveFilter !== "all") && (
                <Button
                  size="sm"
                  color="secondary"
                  iconLeading={X}
                  onClick={clearFilters}
                >
                  Limpiar
                </Button>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Select
                label="Proveedor"
                selectedKey={providerFilter}
                onSelectionChange={(key) => setProviderFilter(key as string)}
                items={[
                  { id: "all", label: "Todos" },
                  ...(metadata?.providers.map((p) => ({ id: p, label: p })) || []),
                ]}
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
                items={[
                  { id: "all", label: "Todas" },
                  ...(metadata?.distributors.map((d) => ({
                    id: d.id,
                    label: d.name,
                  })) || []),
                ]}
              >
                {(item) => (
                  <Select.Item id={item.id}>
                    {item.label}
                  </Select.Item>
                )}
              </Select>
              <Select
                label="Estado"
                selectedKey={statusFilter}
                onSelectionChange={(key) => setStatusFilter(key as string)}
                items={[
                  { id: "all", label: "Todos" },
                  ...(metadata?.statuses.map((s) => ({ id: s, label: s })) || []),
                ]}
              >
                {(item) => (
                  <Select.Item id={item.id}>
                    {item.label}
                  </Select.Item>
                )}
              </Select>
              <Select
                label="Activo"
                selectedKey={isActiveFilter}
                onSelectionChange={(key) => setIsActiveFilter(key as string)}
                items={[
                  { id: "all", label: "Todos" },
                  { id: "true", label: "Activas" },
                  { id: "false", label: "Inactivas" },
                ]}
              >
                {(item) => (
                  <Select.Item id={item.id}>
                    {item.label}
                  </Select.Item>
                )}
              </Select>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <TableCard.Root>
        <Table
          aria-label="Tabla de SIMs"
          sortDescriptor={sortDescriptor}
          onSortChange={setSortDescriptor}
          selectionMode="none"
        >
          <Table.Header>
            <Table.Head id="icc" label="ICC" allowsSorting isRowHeader className="w-auto" />
            <Table.Head id="ip" label="IP" allowsSorting className="w-auto" />
            <Table.Head id="provider" label="Proveedor" allowsSorting className="w-32" />
            <Table.Head id="distributor" label="Distribuidora" allowsSorting className="w-auto" />
            <Table.Head id="status" label="Estado" allowsSorting className="w-32" />
          </Table.Header>
          <Table.Body items={paginatedData} >
            {(item: SimRecord) => (
              <Table.Row id={item.icc}>
                <Table.Cell>
                  <span className="font-mono text-sm">{item.icc}</span>
                </Table.Cell>
                <Table.Cell>
                  {item.ip ? (
                    <span className="font-mono text-sm">{item.ip}</span>
                  ) : (
                    <span className="text-quaternary">-</span>
                  )}
                </Table.Cell>
                <Table.Cell>
                  {getProviderBadge(item.provider)}
                </Table.Cell>
                <Table.Cell>
                  {item.distributor ? (
                    <BadgeWithDot type="modern" color="brand" size="lg">
                      {item.distributor.name}
                    </BadgeWithDot>
                  ) : (
                    <span className="text-quaternary">-</span>
                  )}
                </Table.Cell>
                <Table.Cell>
                  {getStatusBadge(item.status)}
                </Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        </Table>
      </TableCard.Root>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center">
          <PaginationCardMinimal
            page={page}
            total={totalPages}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}

