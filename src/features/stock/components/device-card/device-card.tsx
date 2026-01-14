"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Edit01, Eye, Send01 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Badge, BadgeWithDot } from "@/components/base/badges/badges";
import type { InventoryRecord } from "@/lib/types";
import {
  getLatestAssignment,
  getDeviceState,
  getDistribuidoraName,
  getTicketInfo,
  isRecordAssigned,
  formatDate,
} from "@/utils/stock-utils";
import { ShippingActions } from "@/components/shipping/shipping-actions";

interface DeviceCardProps {
  record: InventoryRecord;
  onAssign: (device: InventoryRecord) => void;
  onViewAssignment: (device: InventoryRecord) => void;
  onEdit: (device: InventoryRecord) => void;
  onUpdateShipping: (device: InventoryRecord) => void;
  onRegisterReturn: (device: InventoryRecord) => void;
}

export function DeviceCard({
  record,
  onAssign,
  onViewAssignment,
  onEdit,
  onUpdateShipping,
  onRegisterReturn,
}: DeviceCardProps) {
  const router = useRouter();
  const latestAssignment = getLatestAssignment(record);
  const deviceState = getDeviceState(record);
  const hasActiveAssignment = latestAssignment && latestAssignment.status === "active";
  const assigneeName = hasActiveAssignment
    ? latestAssignment.assignee_name || record.asignado_a
    : record.asignado_a || null;
  const assigneePhone = hasActiveAssignment ? latestAssignment.assignee_phone : null;
  const shippingVoucher = latestAssignment?.shipping_voucher_id || null;
  const expectsReturn = Boolean(latestAssignment?.expects_return);
  const ticketInfo = getTicketInfo(record.ticket);

  const assignment = getLatestAssignment(record);
  const shippingStatus = (assignment as any)?.shipping_status;
  const returnStatus = (assignment as any)?.return_status;
  const shippingVoucherId = (assignment as any)?.shipping_voucher_id;

  const handleAssign = () => {
    router.push(`/stock/assign/${record.imei}`);
  };

  return (
    <div className="flex flex-col h-full rounded-lg border border-surface bg-surface-1 shadow-xs transition-shadow hover:shadow-sm">
      {/* Content - Flex grow para empujar acciones al fondo */}
      <div className="flex-1 p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <Link
              href={`/stock/${record.imei}`}
              className="block text-lg font-semibold text-primary transition hover:text-brand-primary hover:underline truncate"
            >
              {record.modelo || "-"}
            </Link>
            <p className="font-mono text-xs text-secondary mt-0.5">{record.imei || "-"}</p>
          </div>
          <BadgeWithDot type="modern" color={deviceState.color} size="sm" className="shrink-0">
            {deviceState.label}
          </BadgeWithDot>
        </div>

        {/* Badges - Compactos */}
        <div className="flex flex-wrap gap-1.5">
          {record.is_backup && record.backup_distributor && (
            <Badge size="sm" color="success">
              Backup: {record.backup_distributor.name}
            </Badge>
          )}
          {getDistribuidoraName(record.distribuidora) && (
            <Badge size="sm" color="brand">
              {getDistribuidoraName(record.distribuidora)}
            </Badge>
          )}
          {shippingVoucher && (
            <Badge size="sm" color="blue-light" className="font-mono text-xs">
              {shippingVoucher}
            </Badge>
          )}
          {expectsReturn && (
            <Badge size="sm" color="warning">
              Espera devolución
            </Badge>
          )}
        </div>

        {/* Asignación */}
        {assigneeName ? (
          <div>
            <p className="text-sm font-medium text-primary truncate">{assigneeName}</p>
            {assigneePhone && <p className="text-xs text-tertiary mt-0.5">{assigneePhone}</p>}
          </div>
        ) : (
          <Badge size="sm" color="gray">
            Sin asignación
          </Badge>
        )}

        {/* Ticket */}
        {ticketInfo && (
          <div
            className={ticketInfo.url ? "cursor-pointer" : "cursor-default"}
            onClick={() => ticketInfo.url && window.open(ticketInfo.url, "_blank")}
          >
            <Badge size="sm" color="blue-light">
              {ticketInfo.display}
            </Badge>
          </div>
        )}
      </div>

      {/* Actions - Siempre al fondo */}
      <div className="flex items-center gap-1.5 border-t border-surface bg-surface-2 px-3 py-2.5 rounded-b-lg">
        <ButtonUtility
          size="xs"
          color="secondary"
          tooltip="Editar dispositivo"
          icon={Edit01}
          onClick={() => onEdit(record)}
        />

        {!isRecordAssigned(record) && (
          <ButtonUtility
            size="xs"
            color="secondary"
            tooltip={
              record.soti_info?.is_in_soti
                 ? "Asignar dispositivo (con datos externos)"

                : "Asignar dispositivo manualmente"
            }
            icon={Send01}
            onClick={handleAssign}
          />
        )}

        {isRecordAssigned(record) && (
          <ButtonUtility
            size="xs"
            color="secondary"
            tooltip="Ver detalles de asignación"
            icon={Eye}
            onClick={() => onViewAssignment(record)}
          />
        )}

        <ShippingActions
          assignment={assignment as any}
          onEdit={() => onUpdateShipping(record)}
          onSuccess={() => {
            // Refresh handled by parent
          }}
          size="sm"
          variant="utility"
        />

        <div className="flex-1" />

        <Button size="sm" color="secondary" href={`/stock/${record.imei}`}>
          Ver más
        </Button>
      </div>
    </div>
  );
}



