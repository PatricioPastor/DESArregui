import { useMemo } from "react";
import { TimelineItem, TimelineItemStatus } from "@/components/application/timeline/timeline";

interface Assignment {
  id: string;
  type: string;
  status: string;
  at: string;
  shipping_voucher_id?: string | null;
  shipping_status?: string | null;
  shipped_at?: string | null;
  delivered_at?: string | null;
  expects_return: boolean;
  return_status?: string | null;
  return_received_at?: string | null;
  closed_at?: string | null;
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusForStep(
  assignment: Assignment,
  step: "created" | "shipped" | "delivered" | "returned" | "closed"
): TimelineItemStatus {
  const { shipping_status, return_status, status, closed_at } = assignment;

  switch (step) {
    case "created":
      return "completed";

    case "shipped":
      if (!assignment.shipping_voucher_id) return "pending"; // Sin envío
      if (shipping_status === "pending") return "current";
      if (shipping_status === "shipped" || shipping_status === "delivered") return "completed";
      return "pending";

    case "delivered":
      if (!assignment.shipping_voucher_id) {
        // Sin envío, se considera entregado inmediatamente
        return "completed";
      }
      if (shipping_status === "delivered") return "completed";
      if (shipping_status === "shipped") return "current";
      return "pending";

    case "returned":
      if (!assignment.expects_return) return "pending"; // No aplica
      if (return_status === "received") return "completed";
      if (shipping_status === "delivered" && return_status === "pending") return "current";
      return "pending";

    case "closed":
      if (closed_at) return "completed";
      if (status === "closed" || status === "completed") return "completed";
      // Si no espera devolución y ya fue entregado, está listo para cerrar
      if (!assignment.expects_return && shipping_status === "delivered") return "current";
      // Si espera devolución y ya se recibió, está listo para cerrar
      if (assignment.expects_return && return_status === "received") return "current";
      return "pending";
  }
}

export function useAssignmentTimeline(assignment: Assignment | null): TimelineItem[] {
  return useMemo(() => {
    if (!assignment) return [];

    const items: TimelineItem[] = [];

    // 1. Creación de la asignación
    items.push({
      id: "created",
      title: "Asignación creada",
      description: `Tipo: ${assignment.type === "ASSIGN" ? "Nueva asignación" : "Reemplazo"}`,
      timestamp: formatDate(assignment.at),
      status: getStatusForStep(assignment, "created"),
      metadata: assignment.shipping_voucher_id
        ? { "Vale de envío": assignment.shipping_voucher_id }
        : undefined,
    });

    // 2. Envío (solo si tiene vale)
    if (assignment.shipping_voucher_id) {
      items.push({
        id: "shipped",
        title: "En tránsito",
        description: "El dispositivo ha sido despachado",
        timestamp: formatDate(assignment.shipped_at),
        status: getStatusForStep(assignment, "shipped"),
      });
    }

    // 3. Entrega
    items.push({
      id: "delivered",
      title: assignment.shipping_voucher_id ? "Dispositivo entregado" : "Asignación confirmada",
      description: assignment.shipping_voucher_id
        ? "El dispositivo llegó a su destino"
        : "El dispositivo fue asignado en persona",
      timestamp: formatDate(assignment.delivered_at),
      status: getStatusForStep(assignment, "delivered"),
    });

    // 4. Devolución (solo si espera devolución)
    if (assignment.expects_return) {
      items.push({
        id: "returned",
        title: "Dispositivo devuelto",
        description: "Se recibió el dispositivo anterior",
        timestamp: formatDate(assignment.return_received_at),
        status: getStatusForStep(assignment, "returned"),
      });
    }

    // 5. Cierre
    items.push({
      id: "closed",
      title: "Asignación cerrada",
      description: "El proceso ha finalizado",
      timestamp: formatDate(assignment.closed_at),
      status: getStatusForStep(assignment, "closed"),
    });

    return items;
  }, [assignment]);
}
