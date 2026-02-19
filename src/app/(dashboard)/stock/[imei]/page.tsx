import Link from "next/link";
import { notFound } from "next/navigation";
import { DEVICE_STATUS_LABELS } from "@/constants/device-status";
import prisma from "@/lib/prisma";
import { type AssignmentOperationalItem, DeviceOperationalClient, type DeviceOperationalData } from "./device-operational.client";

const STATUS_COLOR_BY_LABEL: Record<string, "success" | "brand" | "warning" | "gray" | "error"> = {
    Nuevo: "success",
    Asignado: "brand",
    Usado: "gray",
    Reparado: "success",
    "Sin reparacion": "warning",
    Perdido: "error",
};

type DeviceDetailPageParams = {
    imei: string;
};

const formatModelDisplay = (model: { brand: string; model: string; storage_gb: number | null; color: string | null }) => {
    const parts = [model.brand, model.model, model.storage_gb ? `${model.storage_gb}GB` : null, model.color ? `(${model.color})` : null].filter(Boolean);
    return parts.join(" ").replace(/\s+/g, " ").trim();
};

const parseAssignmentContext = (raw: string | null) => {
    if (!raw) {
        return null;
    }

    try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            return parsed as Record<string, unknown>;
        }
    } catch {
        return null;
    }

    return null;
};

const getStatusLabel = (status: string) => {
    return DEVICE_STATUS_LABELS[status as keyof typeof DEVICE_STATUS_LABELS] || status;
};

export default async function DeviceDetailPage({ params }: { params: Promise<DeviceDetailPageParams> }) {
    const { imei: rawImei } = await params;
    const imei = rawImei?.trim();

    if (!imei) {
        notFound();
    }

    const device = await prisma.device_n1.findUnique({
        where: { imei },
        include: {
            model: {
                select: {
                    brand: true,
                    model: true,
                    storage_gb: true,
                    color: true,
                },
            },
            distributor: {
                select: {
                    name: true,
                },
            },
            assignments_n1: {
                orderBy: {
                    assigned_at: "desc",
                },
                include: {
                    distributor: {
                        select: {
                            name: true,
                        },
                    },
                    shipments_n1: {
                        orderBy: {
                            created_at: "desc",
                        },
                    },
                },
            },
        },
    });

    if (!device) {
        notFound();
    }

    const statusLabel = getStatusLabel(device.status);
    const modelDisplay = formatModelDisplay(device.model);

    const history: AssignmentOperationalItem[] = device.assignments_n1.map((assignment) => {
        const outbound = assignment.shipments_n1.find((shipment) => (shipment.leg || "").toUpperCase() === "OUTBOUND") || null;
        const context = parseAssignmentContext(assignment.closure_reason);

        return {
            id: assignment.id.toString(),
            type: assignment.type,
            status: assignment.status,
            assigneeName: assignment.assignee_name,
            assigneeEmail: assignment.assignee_email || null,
            distributorName: assignment.distributor?.name || null,
            ticketId: assignment.ticket_id || null,
            assignedAt: assignment.assigned_at.toISOString(),
            closedAt: assignment.closed_at?.toISOString() || null,
            outboundShipmentStatus: outbound?.status || null,
            outboundVoucherId: outbound?.voucher_id || null,
            assignmentKind: typeof context?.assignment_kind === "string" ? context.assignment_kind : null,
            operationalLabel: typeof context?.operational_label === "string" ? context.operational_label : null,
            roleOrReason: typeof context?.role_or_reason === "string" ? context.role_or_reason : null,
            replacementReason: typeof context?.replacement_reason === "string" ? context.replacement_reason : null,
        };
    });

    const activeAssignment = history.find((assignment) => (assignment.status || "").toLowerCase() === "active") || null;

    const initialData: DeviceOperationalData = {
        device: {
            id: device.id,
            imei: device.imei,
            modelDisplay,
            distributorName: device.distributor?.name || null,
            assignedTo: device.assigned_to || null,
            ticketId: device.ticket_id || null,
            status: device.status,
            statusLabel,
            statusColor: STATUS_COLOR_BY_LABEL[statusLabel] || "gray",
            updatedAt: device.updated_at.toISOString(),
        },
        activeAssignment,
        history,
    };

    return (
        <section className="flex flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
            <header className="flex flex-col gap-4 border-b border-secondary pb-4">
                <div className="text-sm text-tertiary">
                    <Link href="/stock" className="transition hover:text-primary">
                        Inventario
                    </Link>
                    <span className="mx-2">/</span>
                    <span className="font-medium text-secondary">IMEI {device.imei}</span>
                </div>

                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-primary">{modelDisplay}</h1>
                    <p className="mt-1 text-sm text-tertiary">
                        IMEI <span className="font-mono text-secondary">{device.imei}</span>
                    </p>
                </div>
            </header>

            <DeviceOperationalClient initialData={initialData} />
        </section>
    );
}
