"use client";

import { useState } from "react";
import { FilterLines, SearchLg, X } from "@untitledui/icons";
import { Input } from "@/components/base/input/input";
import { Button } from "@/components/base/buttons/button";
import { Badge } from "@/components/base/badges/badges";
import { Select } from "@/components/base/select/select";
import { DEVICE_STATUS_OPTIONS } from "@/constants/device-status";
import type { InventoryModelOption } from "@/lib/types";

interface StockFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  stateFilter: string;
  onStateFilterChange: (value: string) => void;
  distributorFilter: string;
  onDistributorFilterChange: (value: string) => void;
  statusDbFilter: string;
  onStatusDbFilterChange: (value: string) => void;
  modelFilter: string;
  onModelFilterChange: (value: string) => void;
  modelOptions: InventoryModelOption[];
  distributorOptions: Array<{ id: string; label: string }>;
}

export function StockFilters({
  searchQuery,
  onSearchChange,
  stateFilter,
  onStateFilterChange,
  distributorFilter,
  onDistributorFilterChange,
  statusDbFilter,
  onStatusDbFilterChange,
  modelFilter,
  onModelFilterChange,
  modelOptions,
  distributorOptions,
}: StockFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);

  const stateFilterOptions = [
    { id: "all", label: "Todos los estados" },
    { id: "available", label: "Disponibles" },
    { id: "assigned", label: "Asignados" },
  ];

  const statusDbFilterOptions = [
    { id: "all", label: "Todos los estados DB" },
    ...DEVICE_STATUS_OPTIONS.map((option) => ({ ...option })),
  ];

  const modelSelectOptions = [
    { id: "all", label: "Todos los modelos" },
    ...modelOptions.map((option) => ({
      id: option.id,
      label: option.label,
    })),
  ];

  const hasActiveFilters =
    stateFilter !== "all" ||
    distributorFilter !== "all" ||
    statusDbFilter !== "all" ||
    modelFilter !== "all";

  const clearFilters = () => {
    onStateFilterChange("all");
    onDistributorFilterChange("all");
    onStatusDbFilterChange("all");
    onModelFilterChange("all");
  };

  return (
    <div className="flex flex-col gap-4 border-b border-secondary px-4 py-4 md:px-6">
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
          <Input
            icon={SearchLg}
            aria-label="Buscar dispositivos"
            placeholder="Buscar por IMEI, nombre asignado, ticket, modelo o distribuidora..."
            value={searchQuery}
            onChange={onSearchChange}
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
                  (modelFilter !== "all" ? 1 : 0)}
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
              onSelectionChange={(key) => onModelFilterChange(key as string)}
              items={modelSelectOptions}
            >
              {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
            </Select>

            <Select
              label="Estado"
              selectedKey={stateFilter}
              onSelectionChange={(key) => onStateFilterChange(key as string)}
              items={stateFilterOptions as any}
            >
              {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
            </Select>

            <Select
              label="Distribuidora"
              selectedKey={distributorFilter}
              onSelectionChange={(key) => onDistributorFilterChange(key as string)}
              items={distributorOptions}
            >
              {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
            </Select>

            <Select
              label="Estado (DB)"
              selectedKey={statusDbFilter}
              onSelectionChange={(key) => onStatusDbFilterChange(key as string)}
              items={statusDbFilterOptions as any}
            >
              {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}





