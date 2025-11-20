"use client";

import { DeviceCard } from "../device-card";
import type { InventoryRecord } from "@/lib/types";
import { PaginationCardMinimal } from "@/components/application/pagination/pagination";

interface DeviceGridProps {
  devices: InventoryRecord[];
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onAssign: (device: InventoryRecord) => void;
  onViewAssignment: (device: InventoryRecord) => void;
  onEdit: (device: InventoryRecord) => void;
  onUpdateShipping: (device: InventoryRecord) => void;
  onRegisterReturn: (device: InventoryRecord) => void;
}

export function DeviceGrid({
  devices,
  page,
  totalPages,
  onPageChange,
  onAssign,
  onViewAssignment,
  onEdit,
  onUpdateShipping,
  onRegisterReturn,
}: DeviceGridProps) {
  if (devices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-lg font-medium text-secondary">No se encontraron dispositivos</p>
        <p className="text-sm text-tertiary mt-2">
          Intenta ajustar los filtros de búsqueda
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {devices.map((device) => (
          <DeviceCard
            key={device.imei}
            record={device}
            onAssign={onAssign}
            onViewAssignment={onViewAssignment}
            onEdit={onEdit}
            onUpdateShipping={onUpdateShipping}
            onRegisterReturn={onRegisterReturn}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <PaginationCardMinimal
          align="right"
          page={page}
          total={totalPages}
          onPageChange={onPageChange}
          className="px-4 py-3 md:px-5 md:pt-3 md:pb-4"
        />
      )}
    </>
  );
}





