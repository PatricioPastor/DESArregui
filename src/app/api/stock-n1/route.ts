import { NextRequest, NextResponse } from "next/server";
import type { Prisma, device_status } from "@/generated/prisma/index";
import { withAuth, withRoles } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import type { InventoryRecord, InventoryResponse, InventoryStatus, InventoryStatusSummary, SOTIDeviceInfo } from "@/lib/types";

const INVENTORY_HEADERS = ["modelo", "imei", "estado", "distribuidora", "asignado_a", "ticket"] as const;

const DEVICE_STATUS_TO_INVENTORY: Record<device_status, InventoryStatus> = {
    NEW: "NEW",
    ASSIGNED: "ASSIGNED",
    USED: "USED",
    REPAIRED: "REPAIRED",
    NOT_REPAIRED: "NOT_REPAIRED",
    LOST: "LOST",
    DISPOSED: "DISPOSED",
    SCRAPPED: "SCRAPPED",
    DONATED: "DONATED",
} as const;

const INVENTORY_STATUSES: InventoryStatus[] = Object.values(DEVICE_STATUS_TO_INVENTORY);

const STATUS_LABELS: Record<InventoryStatus, string> = {
    NEW: "Nuevo",
    ASSIGNED: "Asignado",
    USED: "Usado",
    REPAIRED: "Reparado",
    NOT_REPAIRED: "Sin Reparación",
    LOST: "Perdido",
    DISPOSED: "Dado de Baja",
    SCRAPPED: "Chatarra",
    DONATED: "Donado",
} as const;

const LEGACY_STATUS_MAP: Record<string, device_status> = {
    NUEVO: "NEW",
    ASIGNADO: "ASSIGNED",
    USADO: "USED",
    REPARADO: "REPAIRED",
    SIN_REPARACION: "NOT_REPAIRED",
    SIN_REPARACIÓN: "NOT_REPAIRED",
    NO_REPARADO: "NOT_REPAIRED",
    EN_ANALISIS: "ASSIGNED",
    PERDIDO: "LOST",
} as const;

const SHIPMENT_N1_SELECT = {
    id: true,
    leg: true,
    voucher_id: true,
    status: true,
    shipped_at: true,
    delivered_at: true,
    notes: true,
} as const;

const ASSIGNMENT_N1_SELECT = {
    id: true,
    type: true,
    status: true,
    assignee_name: true,
    assignee_phone: true,
    ticket_id: true,
    expects_return: true,
    expected_return_imei: true,
    assigned_at: true,
    shipments_n1: {
        select: SHIPMENT_N1_SELECT,
        orderBy: { created_at: "desc" as const },
    },
} as const;

const DEVICE_N1_INCLUDE = {
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
    owner_user: {
        select: {
            id: true,
            name: true,
            image: true,
        },
    },
    created_by_user: {
        select: {
            id: true,
            name: true,
        },
    },
    assignments_n1: {
        orderBy: { assigned_at: "desc" as const },
        select: ASSIGNMENT_N1_SELECT,
        take: 10,
    },
} as const;

type DeviceN1WithRelations = Prisma.device_n1GetPayload<{ include: typeof DEVICE_N1_INCLUDE }>;
type AssignmentN1WithShipments = DeviceN1WithRelations["assignments_n1"][number];

const normalizeStatusValue = (value: unknown): device_status | null => {
    if (typeof value !== "string") return null;

    const normalized = value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "_");

    if (normalized in LEGACY_STATUS_MAP) {
        return LEGACY_STATUS_MAP[normalized as keyof typeof LEGACY_STATUS_MAP];
    }

    const enumValues = Object.keys(DEVICE_STATUS_TO_INVENTORY) as device_status[];
    return enumValues.find((status) => status === normalized) || null;
};

const formatModelDisplay = (model: DeviceN1WithRelations["model"]): string => {
    const parts = [model.brand, model.model, model.storage_gb ? `${model.storage_gb}GB` : null, model.color ? `(${model.color})` : null].filter(Boolean);
    return parts.join(" ").replace(/\s+/g, " ").trim();
};

const pickShipmentByLeg = (assignment: AssignmentN1WithShipments, leg: "OUTBOUND" | "RETURN") => {
    return assignment.shipments_n1.find((shipment) => shipment.leg === leg) || null;
};

const mapRawAssignment = (assignment: AssignmentN1WithShipments) => {
    const outbound = pickShipmentByLeg(assignment, "OUTBOUND");
    const returnLeg = pickShipmentByLeg(assignment, "RETURN");

    return {
        id: assignment.id.toString(),
        type: assignment.type,
        status: assignment.status,
        assignee_name: assignment.assignee_name,
        assignee_phone: assignment.assignee_phone,
        ticket_id: assignment.ticket_id,
        shipping_voucher_id: outbound?.voucher_id || null,
        shipping_status: outbound?.status || null,
        shipped_at: outbound?.shipped_at?.toISOString() || null,
        delivered_at: outbound?.delivered_at?.toISOString() || null,
        expects_return: assignment.expects_return,
        return_device_imei: assignment.expected_return_imei || null,
        return_status: returnLeg?.status || null,
        at: assignment.assigned_at.toISOString(),
    };
};

const buildInventoryRecord = (
    device: DeviceN1WithRelations,
    sotiDevice?: {
        id: string;
        device_name: string;
        assigned_user: string | null;
        connection_date: string | null;
        disconnection_date: string | null;
        last_sync: Date;
        is_active: boolean;
        updated_at: Date;
    },
): InventoryRecord => {
    const inventoryStatus = DEVICE_STATUS_TO_INVENTORY[device.status] || "NEW";
    const modelDisplay = formatModelDisplay(device.model);

    const rawAssignments = device.assignments_n1.map(mapRawAssignment);
    const latestAssignment = rawAssignments[0] || null;

    const sotiInfo: SOTIDeviceInfo = {
        is_in_soti: Boolean(sotiDevice),
        device_name: sotiDevice?.device_name || undefined,
        assigned_user: sotiDevice?.assigned_user || undefined,
        connection_date: sotiDevice?.connection_date || undefined,
        disconnection_date: sotiDevice?.disconnection_date || undefined,
        last_sync: sotiDevice?.last_sync?.toISOString() || undefined,
    };

    return {
        id: device.id,
        imei: device.imei,
        status: inventoryStatus,
        status_label: STATUS_LABELS[inventoryStatus],
        estado: STATUS_LABELS[inventoryStatus],
        modelo: modelDisplay,
        model_id: device.model_id,
        is_backup: device.is_backup || false,
        backup_distributor_id: device.backup_distributor_id || null,
        backup_distributor: device.backup_distributor
            ? {
                  id: device.backup_distributor.id,
                  name: device.backup_distributor.name,
              }
            : null,
        model_details: {
            id: device.model.id,
            brand: device.model.brand,
            model: device.model.model,
            storage_gb: device.model.storage_gb,
            color: device.model.color,
            display_name: modelDisplay,
        },
        distribuidora: device.distributor?.name || "",
        distribuidora_id: device.distributor?.id || null,
        owner_user_id: device.owner_user_id || null,
        owner_name: device.owner_user?.name || null,
        owner_image: device.owner_user?.image || null,
        created_by_user_id: device.created_by_user_id || null,
        created_by_name: device.created_by_user?.name || null,
        asignado_a: latestAssignment?.assignee_name || device.assigned_to || "",
        ticket: latestAssignment?.ticket_id || device.ticket_id || "",
        is_assigned: rawAssignments.some((assignment) => assignment.status === "active") || device.status === "ASSIGNED",
        created_at: device.created_at.toISOString(),
        updated_at: device.updated_at.toISOString(),
        last_assignment_at: latestAssignment?.at || null,
        assignments_count: device.assignments_n1.length,
        soti_info: sotiInfo,
        raw: {
            id: device.id,
            is_deleted: device.is_deleted ?? false,
            owner_user_id: device.owner_user_id || null,
            created_by_user_id: device.created_by_user_id || null,
            assignments: rawAssignments,
            soti_device: sotiDevice ? { id: sotiDevice.id } : null,
        },
    };
};

const buildStatusSummary = (records: InventoryRecord[]): InventoryStatusSummary[] => {
    const summaryMap = new Map<InventoryStatus, number>();
    INVENTORY_STATUSES.forEach((status) => summaryMap.set(status, 0));

    records.forEach((record) => {
        summaryMap.set(record.status, (summaryMap.get(record.status) ?? 0) + 1);
    });

    return INVENTORY_STATUSES.map((status) => ({
        status,
        label: STATUS_LABELS[status],
        count: summaryMap.get(status) ?? 0,
    }));
};

export const GET = withAuth(async (request: NextRequest, session) => {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get("search")?.trim();
        const status = searchParams.get("status");
        const distributor = searchParams.get("distributor");
        const assigned = searchParams.get("assigned");
        const modelId = searchParams.get("model");
        const includeDeleted = searchParams.get("include_deleted") === "true";
        const backup = searchParams.get("backup");
        const backupDistributor = searchParams.get("backup_distributor");
        const mine = searchParams.get("mine") === "true";
        const summaryOnly = searchParams.get("summary") === "true";

        const whereConditions: Prisma.device_n1WhereInput = {};

        if (!includeDeleted) {
            whereConditions.is_deleted = false;
        }

        if (mine) {
            whereConditions.owner_user_id = session.user.id;
        }

        if (search) {
            whereConditions.OR = [
                { imei: { contains: search, mode: "insensitive" } },
                { assigned_to: { contains: search, mode: "insensitive" } },
                { ticket_id: { contains: search, mode: "insensitive" } },
                { assignments_n1: { some: { assignee_name: { contains: search, mode: "insensitive" } } } },
                { assignments_n1: { some: { ticket_id: { contains: search, mode: "insensitive" } } } },
                { model: { brand: { contains: search, mode: "insensitive" } } },
                { model: { model: { contains: search, mode: "insensitive" } } },
                { distributor: { name: { contains: search, mode: "insensitive" } } },
                { owner_user: { name: { contains: search, mode: "insensitive" } } },
                { backup_distributor: { name: { contains: search, mode: "insensitive" } } },
            ];
        }

        const normalizedStatus = normalizeStatusValue(status);
        if (status && normalizedStatus) {
            whereConditions.status = normalizedStatus;
        }

        if (distributor) {
            whereConditions.distributor_id = distributor;
        }

        if (backup === "true") {
            whereConditions.is_backup = true;
        } else if (backup === "false") {
            whereConditions.is_backup = false;
        }

        if (backupDistributor) {
            whereConditions.backup_distributor_id = backupDistributor;
        }

        if (modelId) {
            whereConditions.model_id = modelId;
        }

        if (assigned === "true") {
            whereConditions.status = "ASSIGNED";
        } else if (assigned === "false") {
            whereConditions.status = { not: "ASSIGNED" };
        }

        if (summaryOnly) {
            const [totalCount, groupedByStatus] = await Promise.all([
                prisma.device_n1.count({ where: whereConditions }),
                prisma.device_n1.groupBy({
                    by: ["status"],
                    where: whereConditions,
                    _count: { _all: true },
                }),
            ]);

            const statusCounts = new Map<InventoryStatus, number>();
            INVENTORY_STATUSES.forEach((inventoryStatus) => statusCounts.set(inventoryStatus, 0));

            groupedByStatus.forEach((group) => {
                const inventoryStatus = DEVICE_STATUS_TO_INVENTORY[group.status] || "NEW";
                statusCounts.set(inventoryStatus, (statusCounts.get(inventoryStatus) ?? 0) + group._count._all);
            });

            const statusSummary: InventoryStatusSummary[] = INVENTORY_STATUSES.map((inventoryStatus) => ({
                status: inventoryStatus,
                label: STATUS_LABELS[inventoryStatus],
                count: statusCounts.get(inventoryStatus) ?? 0,
            }));

            const response: InventoryResponse = {
                success: true,
                data: [],
                headers: [...INVENTORY_HEADERS],
                totalRecords: totalCount,
                lastUpdated: new Date().toISOString(),
                statusSummary,
                modelOptions: [],
            };

            return NextResponse.json(response);
        }

        const modelWhereFilter = includeDeleted
            ? {
                  devices_n1: {
                      some: {},
                  },
              }
            : {
                  devices_n1: {
                      some: {
                          is_deleted: false,
                      },
                  },
              };

        const [devices, distinctModels] = await Promise.all([
            prisma.device_n1.findMany({
                where: whereConditions,
                include: DEVICE_N1_INCLUDE,
                orderBy: { created_at: "desc" },
            }),
            prisma.phone_model.findMany({
                where: modelWhereFilter,
                select: {
                    id: true,
                    brand: true,
                    model: true,
                    storage_gb: true,
                    color: true,
                },
                orderBy: [{ brand: "asc" }, { model: "asc" }, { storage_gb: "asc" }, { color: "asc" }],
            }),
        ]);

        const deviceImeis = devices.map((device) => device.imei);
        const sotiDevices = await prisma.soti_device.findMany({
            where: { imei: { in: deviceImeis } },
            select: {
                id: true,
                imei: true,
                device_name: true,
                assigned_user: true,
                connection_date: true,
                disconnection_date: true,
                last_sync: true,
                is_active: true,
                updated_at: true,
            },
        });

        const sotiDeviceMap = new Map<string, (typeof sotiDevices)[number]>();
        sotiDevices.forEach((sotiDevice) => {
            const current = sotiDeviceMap.get(sotiDevice.imei);
            if (!current) {
                sotiDeviceMap.set(sotiDevice.imei, sotiDevice);
                return;
            }

            const shouldReplace =
                (sotiDevice.is_active && !current.is_active) ||
                (sotiDevice.is_active === current.is_active && sotiDevice.updated_at.getTime() >= current.updated_at.getTime());

            if (shouldReplace) {
                sotiDeviceMap.set(sotiDevice.imei, sotiDevice);
            }
        });

        const inventoryRecords = devices.map((device) => buildInventoryRecord(device, sotiDeviceMap.get(device.imei)));
        const statusSummary = buildStatusSummary(inventoryRecords);

        const modelOptions = distinctModels
            .map((model) => ({
                id: model.id,
                label: formatModelDisplay(model),
            }))
            .sort((a, b) => a.label.localeCompare(b.label, "es", { sensitivity: "base" }));

        const response: InventoryResponse = {
            success: true,
            data: inventoryRecords,
            headers: [...INVENTORY_HEADERS],
            totalRecords: inventoryRecords.length,
            lastUpdated: new Date().toISOString(),
            statusSummary,
            modelOptions,
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error("GET /api/stock-n1 error:", error);

        return NextResponse.json<InventoryResponse>(
            {
                success: false,
                error: error instanceof Error ? error.message : "Failed to fetch inventory N1",
            },
            { status: 500 },
        );
    }
});

export const POST = withRoles(["stock-viewer"], async (request: NextRequest, session) => {
    try {
        const body = await request.json();
        const { imei, modelo, distribuidora, asignado_a, ticket, purchase_id, is_backup, backup_distributor_id } = body;

        if (!imei?.trim()) {
            return NextResponse.json({ success: false, error: "IMEI es obligatorio" }, { status: 400 });
        }

        if (!modelo) {
            return NextResponse.json({ success: false, error: "Modelo es obligatorio" }, { status: 400 });
        }

        if (!distribuidora) {
            return NextResponse.json({ success: false, error: "Distribuidora es obligatoria" }, { status: 400 });
        }

        const statusInput = normalizeStatusValue(body.estado ?? body.status);
        if ((body.estado || body.status) && !statusInput) {
            const validStatuses = Object.values(STATUS_LABELS).join(", ");
            return NextResponse.json(
                {
                    success: false,
                    error: `Estado inválido. Valores permitidos: ${validStatuses}`,
                },
                { status: 400 },
            );
        }

        if (is_backup && !backup_distributor_id) {
            return NextResponse.json({ success: false, error: "Debe indicar distribuidora de backup" }, { status: 400 });
        }

        const trimmedImei = imei.trim();
        const assignedTo = asignado_a?.trim() || null;
        const normalizedTicket = ticket?.trim() || null;

        const existingDevice = await prisma.device_n1.findUnique({
            where: { imei: trimmedImei },
            select: { id: true },
        });

        if (existingDevice) {
            return NextResponse.json({ success: false, error: `El IMEI ${trimmedImei} ya está registrado` }, { status: 409 });
        }

        const modelRecord = await prisma.phone_model.findUnique({
            where: { id: modelo },
            select: { id: true },
        });

        if (!modelRecord) {
            return NextResponse.json({ success: false, error: `Modelo "${modelo}" no encontrado` }, { status: 404 });
        }

        const distributorRecord = await prisma.distributor.findUnique({
            where: { id: distribuidora },
            select: { id: true },
        });

        if (!distributorRecord) {
            return NextResponse.json({ success: false, error: `Distribuidora "${distribuidora}" no encontrada` }, { status: 404 });
        }

        if (backup_distributor_id) {
            const backupDistributorRecord = await prisma.distributor.findUnique({
                where: { id: backup_distributor_id },
                select: { id: true },
            });

            if (!backupDistributorRecord) {
                return NextResponse.json({ success: false, error: `Distribuidora backup "${backup_distributor_id}" no encontrada` }, { status: 404 });
            }
        }

        if (purchase_id) {
            const purchaseRecord = await prisma.purchase.findUnique({
                where: { id: purchase_id },
                select: { id: true },
            });

            if (!purchaseRecord) {
                return NextResponse.json({ success: false, error: `Compra "${purchase_id}" no encontrada` }, { status: 404 });
            }
        }

        const baseStatus: device_status = statusInput || "NEW";
        const resolvedStatus: device_status = assignedTo ? "ASSIGNED" : baseStatus;

        const createdDevice = await prisma.$transaction(async (tx) => {
            const device = await tx.device_n1.create({
                data: {
                    imei: trimmedImei,
                    model_id: modelRecord.id,
                    distributor_id: distributorRecord.id,
                    purchase_id: purchase_id || null,
                    status: resolvedStatus,
                    assigned_to: assignedTo,
                    ticket_id: normalizedTicket,
                    is_backup: Boolean(is_backup),
                    backup_distributor_id: backup_distributor_id || null,
                    owner_user_id: session.user.id,
                    created_by_user_id: session.user.id,
                },
                select: {
                    id: true,
                    imei: true,
                    status: true,
                    owner_user_id: true,
                    created_by_user_id: true,
                },
            });

            if (assignedTo) {
                await tx.assignment_n1.create({
                    data: {
                        device_id: device.id,
                        type: "ASSIGN",
                        status: "active",
                        assignee_name: assignedTo,
                        ticket_id: normalizedTicket,
                        distributor_id: distributorRecord.id,
                    },
                });
            }

            return device;
        });

        return NextResponse.json({
            success: true,
            message: "Dispositivo N1 creado exitosamente",
            data: createdDevice,
        });
    } catch (error) {
        console.error("POST /api/stock-n1 error:", error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Error interno del servidor",
            },
            { status: 500 },
        );
    }
});
