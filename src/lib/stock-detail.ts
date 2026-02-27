"use server";

import type { device_status } from "@/generated/prisma";
import prisma from "@/lib/prisma";
import type { InventoryRecord, InventoryStatus } from "@/lib/types";

const DEVICE_STATUS_TO_INVENTORY: Record<device_status, InventoryStatus> = {
    NEW: "NEW",
    ASSIGNED: "ASSIGNED",
    USED: "USED",
    REPAIRED: "REPAIRED",
    NOT_REPAIRED: "NOT_REPAIRED",
    DISPOSED: "NOT_REPAIRED",
    DONATED: "NOT_REPAIRED",
    SCRAPPED: "NOT_REPAIRED",
    LOST: "LOST",
};

const STATUS_LABELS: Record<InventoryStatus, string> = {
    NEW: "Nuevo",
    ASSIGNED: "Asignado",
    USED: "Usado",
    REPAIRED: "Reparado",
    DISPOSED: "Fuera de inventario",
    DONATED: "Fuera de inventario",
    SCRAPPED: "Fuera de inventario",
    NOT_REPAIRED: "Sin Reparación",
    LOST: "Perdido",
};

const DEVICE_INCLUDE = {
    model: {
        select: {
            id: true,
            brand: true,
            model: true,
            storage_gb: true,
            color: true,
        },
    },
    distributor: {
        select: {
            id: true,
            name: true,
        },
    },
    backup_distributor: {
        select: {
            id: true,
            name: true,
        },
    },
    assignments: {
        orderBy: { assigned_at: "desc" as const },
        include: {
            distributor: {
                select: {
                    id: true,
                    name: true,
                },
            },
            shipments: {
                orderBy: { created_at: "desc" as const },
            },
        },
    },
} as const;

const parseAssignmentContext = (raw: string | null): Record<string, unknown> => {
    if (!raw) {
        return {};
    }

    try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            return parsed as Record<string, unknown>;
        }
    } catch {
        return {};
    }

    return {};
};

const toOptionalString = (value: unknown): string | null => {
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
};

const pickShipmentByLeg = (shipments: Array<{ leg: string; status: string; delivered_at: Date | null; shipped_at: Date | null; voucher_id: string | null; notes: string | null }>, leg: "OUTBOUND" | "RETURN") => {
    return shipments.find((shipment) => shipment.leg === leg) || null;
};

const formatModelDisplay = (model: NonNullable<{ brand: string; model: string; storage_gb: number | null; color: string | null }>) => {
    const parts = [model.brand, model.model, model.storage_gb ? `${model.storage_gb}GB` : null, model.color ? `(${model.color})` : null].filter(Boolean);

    return parts.join(" ").replace(/\s+/g, " ").trim();
};

const buildInventoryRecord = (device: any, sotiDevice: any): InventoryRecord => {
    const inventoryStatus = DEVICE_STATUS_TO_INVENTORY[device!.status as "NEW"] || "NEW";
    const assignments = device?.assignments || [];
    const lastAssignment = assignments[0];
    const modelDisplay = formatModelDisplay(device!.model);

    return {
        id: device!.id,
        imei: device!.imei,
        status: inventoryStatus,
        status_label: STATUS_LABELS[inventoryStatus],
        estado: STATUS_LABELS[inventoryStatus],
        modelo: modelDisplay,
        model_id: device!.model_id,
        model_details: {
            id: device!.model.id,
            brand: device!.model.brand,
            model: device!.model.model,
            storage_gb: device!.model.storage_gb,
            color: device!.model.color,
            display_name: modelDisplay,
        },
        distribuidora: device!.distributor?.name || "",
        distribuidora_id: device!.distributor?.id || null,
        is_backup: device!.is_backup || false,
        backup_distributor_id: device!.backup_distributor_id || null,
        backup_distributor: device!.backup_distributor
            ? {
                  id: device!.backup_distributor.id,
                  name: device!.backup_distributor.name,
              }
            : null,
        asignado_a: lastAssignment?.assignee_name || device!.assigned_to || "",
        ticket: lastAssignment?.ticket_id || device!.ticket_id || "",
        is_assigned: Boolean(device!.assigned_to) || assignments.some((a: any) => a.type === "ASSIGN" && (!a.status || a.status === "active")),
        created_at: device!.created_at.toISOString(),
        updated_at: device!.updated_at.toISOString(),
        last_assignment_at: lastAssignment?.assigned_at?.toISOString() || null,
        assignments_count: assignments.length,
        soti_info: {
            is_in_soti: Boolean(sotiDevice),
            device_name: sotiDevice?.device_name || undefined,
            assigned_user: sotiDevice?.assigned_user || undefined,
            connection_date: sotiDevice?.connection_date || undefined,
            disconnection_date: sotiDevice?.disconnection_date || undefined,
            last_sync: sotiDevice?.last_sync?.toISOString() || undefined,
        },
        raw: {
            id: device!.id,
            is_deleted: device!.is_deleted ?? false,
        },
    };
};

export interface AssignmentDetail {
    id: string;
    type: string;
    status: string | null;
    assignee_name: string | null;
    assignee_phone: string | null;
    distributor: { id: string; name: string } | null;
    delivery_location: string | null;
    contact_details: string | null;
    shipping_voucher_id: string | null;
    shipping_status: string | null;
    shipped_at: string | null;
    delivered_at: string | null;
    expects_return: boolean;
    return_device_imei: string | null;
    return_status: string | null;
    return_received_at: string | null;
    ticket_id: string | null;
    at: string;
    soti_device: {
        id: string;
        device_name: string | null;
        assigned_user: string | null;
        status: string;
    } | null;
}

export interface TicketSummary {
    id: string;
    key: string;
    status: string;
    label: string;
    issue_type: string;
    enterprise: string;
    created: string;
    updated: string;
}

export interface SotiDeviceDetail {
    id: string;
    device_name: string;
    assigned_user: string | null;
    model: string | null;
    imei: string;
    route: string | null;
    status: string;
    is_active: boolean;
    last_sync: string;
    connection_date: string | null;
    disconnection_date: string | null;
    location: string | null;
}

export interface DeviceDetail {
    inventory: InventoryRecord;
    assignments: AssignmentDetail[];
    tickets: TicketSummary[];
    soti_device: SotiDeviceDetail | null;
}

export async function getDeviceDetailByImei(imei: string): Promise<DeviceDetail | null> {
    const device = await prisma.device.findUnique({
        where: { imei },
        include: DEVICE_INCLUDE,
    });

    if (!device) {
        return null;
    }

    const sotiDevice = await prisma.soti_device.findFirst({
        where: { imei },
    });

    const inventoryRecord = buildInventoryRecord(device, sotiDevice);

    const assignmentsSotiIds = (device.assignments || [])
        .map((assignment) => toOptionalString(parseAssignmentContext(assignment.closure_reason).soti_device_id))
        .filter((sotiId): sotiId is string => Boolean(sotiId));

    const assignmentSotiDevices =
        assignmentsSotiIds.length > 0
            ? await prisma.soti_device.findMany({
                  where: { id: { in: assignmentsSotiIds } },
                  select: {
                      id: true,
                      device_name: true,
                      assigned_user: true,
                      status: true,
                  },
              })
            : [];

    const assignmentSotiMap = new Map(assignmentSotiDevices.map((assignmentSotiDevice) => [assignmentSotiDevice.id, assignmentSotiDevice]));

    const assignments: AssignmentDetail[] = (device.assignments || []).map((assignment) => {
        const context = parseAssignmentContext(assignment.closure_reason);
        const outbound = pickShipmentByLeg(assignment.shipments, "OUTBOUND");
        const returnLeg = pickShipmentByLeg(assignment.shipments, "RETURN");
        const assignmentSotiId = toOptionalString(context.soti_device_id);
        const assignmentSotiDevice = assignmentSotiId ? assignmentSotiMap.get(assignmentSotiId) : null;

        return {
            id: assignment.id.toString(),
        type: assignment.type,
        status: assignment.status || null,
        assignee_name: assignment.assignee_name || null,
        assignee_phone: assignment.assignee_phone || null,
        distributor: assignment.distributor ? { id: assignment.distributor.id, name: assignment.distributor.name } : null,
        delivery_location: toOptionalString(context.delivery_location) || toOptionalString(context.city),
        contact_details: toOptionalString(context.contact_details) || toOptionalString(context.notes),
        shipping_voucher_id: outbound?.voucher_id || null,
        shipping_status: outbound?.status || null,
        shipped_at: outbound?.shipped_at?.toISOString() || null,
        delivered_at: outbound?.delivered_at?.toISOString() || null,
        expects_return: assignment.expects_return,
        return_device_imei: assignment.expected_return_imei || null,
        return_status: returnLeg?.status || null,
        return_received_at: returnLeg?.delivered_at?.toISOString() || null,
        ticket_id: assignment.ticket_id || null,
        at: assignment.assigned_at.toISOString(),
        soti_device: assignmentSotiDevice
            ? {
                  id: assignmentSotiDevice.id,
                  device_name: assignmentSotiDevice.device_name,
                  assigned_user: assignmentSotiDevice.assigned_user,
                  status: assignmentSotiDevice.status,
              }
            : null,
    };
    });

    const ticketIds = new Set<string>();
    if (device.ticket_id) {
        ticketIds.add(device.ticket_id);
    }
    assignments.forEach((assignment) => {
        if (assignment.ticket_id) {
            ticketIds.add(assignment.ticket_id);
        }
    });

    let tickets: TicketSummary[] = [];
    if (ticketIds.size > 0) {
        const dbTickets = await prisma.ticket.findMany({
            where: {
                key: { in: Array.from(ticketIds) },
            },
            orderBy: { updated: "desc" },
        });

        tickets = dbTickets.map((ticket) => ({
            id: ticket.id,
            key: ticket.key,
            status: ticket.status,
            label: ticket.label,
            issue_type: ticket.issue_type,
            enterprise: ticket.enterprise,
            created: ticket.created.toISOString(),
            updated: ticket.updated.toISOString(),
        }));
    }

    let sotiDetail: SotiDeviceDetail | null = null;
    if (sotiDevice) {
        sotiDetail = {
            id: sotiDevice.id,
            device_name: sotiDevice.device_name,
            assigned_user: sotiDevice.assigned_user,
            model: sotiDevice.model,
            imei: sotiDevice.imei,
            route: sotiDevice.route,
            status: sotiDevice.status,
            is_active: sotiDevice.is_active,
            last_sync: sotiDevice.last_sync.toISOString(),
            connection_date: sotiDevice.connection_date || null,
            disconnection_date: sotiDevice.disconnection_date || null,
            location: sotiDevice.location || null,
        };
    }

    return {
        inventory: inventoryRecord,
        assignments,
        tickets,
        soti_device: sotiDetail,
    };
}
