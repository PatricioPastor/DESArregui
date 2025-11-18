import type { InventoryRecord } from "@/lib/types";

const COMPLETED_ASSIGNMENT_STATUSES = new Set(["completed", "closed", "finalized", "returned"]);
const JIRA_BASE_URL = 'https://desasa.atlassian.net/browse/';

export type StatusBadgeColor = "brand" | "success" | "warning" | "gray" | "blue-light" | "error";

export interface DeviceStateBadge {
  label: string;
  color: StatusBadgeColor;
  description?: string;
}

export interface TicketInfo {
  display: string;
  url: string | null;
}

export const getLatestAssignment = (record: InventoryRecord) => {
  const assignments = record?.raw?.assignments as any[] || [];
  return assignments[0] ?? null;
};

export const getDistribuidoraName = (fullPath: string): string => {
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

export const normalizeDistributorName = (fullPath: string): string =>
  getDistribuidoraName(fullPath).trim().toLowerCase();

export const isDepot = (fullPath: string): boolean =>
  normalizeDistributorName(fullPath) === "deposito";

export const getDeviceState = (record: InventoryRecord): DeviceStateBadge => {
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
      return { 
        label: "En envio", 
        color: "blue-light", 
        description: latestAssignment.shipping_voucher_id 
      };
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

export const getTicketInfo = (ticket: string | null | undefined): TicketInfo | null => {
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

export const isRecordAssigned = (record: InventoryRecord): boolean => {
  const latestAssignment = getLatestAssignment(record);
  return latestAssignment && latestAssignment.status === 'active';
};

export const isRecordAvailable = (record: InventoryRecord): boolean => 
  !isRecordAssigned(record);

export const formatDate = (dateString: string): string => {
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

export const openTicket = (ticket: string): void => {
  const info = getTicketInfo(ticket);
  if (info?.url) {
    window.open(info.url, "_blank");
  }
};



