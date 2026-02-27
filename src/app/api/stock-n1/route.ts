import { NextRequest, NextResponse } from "next/server";
import type { Prisma, device_status } from "@/generated/prisma/index";
import { withRoles } from "@/lib/api-auth";
import prisma from "@/lib/prisma";

const STOCK_N1_MISSING_COLUMN_HEADER = "x-stock-n1-fallback-column";
const INVENTORY_HEADERS = ["modelo", "imei", "estado", "distribuidora", "asignado_a", "ticket"] as const;
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

const STOCK_N1_CATEGORY = {
    NEW: "NEW",
    USED: "USED",
    ASSIGNED: "ASSIGNED",
} as const;

type StockN1Category = (typeof STOCK_N1_CATEGORY)[keyof typeof STOCK_N1_CATEGORY];

const SHIPMENT_SUMMARY_SELECT = {
    id: true,
    leg: true,
    voucher_id: true,
    status: true,
    shipped_at: true,
    delivered_at: true,
} as const;

const ASSIGNMENT_SUMMARY_SELECT = {
    id: true,
    type: true,
    status: true,
    assignee_name: true,
    assignee_phone: true,
    ticket_id: true,
    expects_return: true,
    expected_return_imei: true,
    assigned_at: true,
    shipments: {
        select: SHIPMENT_SUMMARY_SELECT,
        orderBy: { created_at: "desc" as const },
    },
} as const;

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
    assignments: {
        orderBy: { assigned_at: "desc" as const },
        select: ASSIGNMENT_SUMMARY_SELECT,
        take: 10,
    },
} as const;

type DeviceWithRelations = Prisma.deviceGetPayload<{ include: typeof DEVICE_INCLUDE }>;

const STATUS_LABELS = {
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
};

const DEVICE_STATUS_VALUES: device_status[] = ["NEW", "ASSIGNED", "USED", "REPAIRED", "NOT_REPAIRED", "LOST", "DISPOSED", "SCRAPPED", "DONATED"];

const DEVICE_STATUS_TO_INVENTORY = {
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

type InventoryStatus = (typeof DEVICE_STATUS_TO_INVENTORY)[keyof typeof DEVICE_STATUS_TO_INVENTORY];

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

    return DEVICE_STATUS_VALUES.find((status) => status === normalized) || null;
};

const normalizeCategoryValue = (value: unknown): StockN1Category | null => {
    if (typeof value !== "string") {
        return null;
    }

    const normalized = value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "_");

    if (normalized === STOCK_N1_CATEGORY.NEW) {
        return STOCK_N1_CATEGORY.NEW;
    }

    if (normalized === STOCK_N1_CATEGORY.USED) {
        return STOCK_N1_CATEGORY.USED;
    }

    if (normalized === STOCK_N1_CATEGORY.ASSIGNED || normalized === "ASIGNADOS") {
        return STOCK_N1_CATEGORY.ASSIGNED;
    }

    return null;
};

const extractMissingColumn = (error: unknown): string | null => {
    if (!error || typeof error !== "object") {
        return null;
    }

    const maybeError = error as {
        code?: string;
        message?: string;
        meta?: {
            column?: unknown;
        };
    };

    if (maybeError.code !== "P2022") {
        return null;
    }

    if (typeof maybeError.meta?.column === "string" && maybeError.meta.column.trim().length > 0) {
        return maybeError.meta.column;
    }

    if (typeof maybeError.message === "string") {
        const quotedColumn = maybeError.message.match(/column\s+[`"]?([^`"\s]+)[`"]?/i);
        if (quotedColumn?.[1]) {
            return quotedColumn[1];
        }
    }

    return "not-available";
};

const missingColumnResponse = (columnName: string, message: string) => {
    return NextResponse.json(
        {
            success: false,
            error: message,
            missing_column: columnName,
        },
        {
            status: 503,
            headers: {
                [STOCK_N1_MISSING_COLUMN_HEADER]: columnName,
            },
        },
    );
};

const getTableColumns = async (schema: string, table: string): Promise<Set<string>> => {
    const rows = await prisma.$queryRaw<Array<{ column_name: string }>>`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = ${schema}
          AND table_name = ${table}
    `;

    return new Set(rows.map((row) => row.column_name));
};

const parseBoundedPositiveInt = (rawValue: string | null, fallback: number, max: number) => {
    const parsed = Number.parseInt(rawValue ?? String(fallback), 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return fallback;
    }

    return Math.min(parsed, max);
};

const withBaseWhere = (baseWhere: Prisma.deviceWhereInput, extraWhere: Prisma.deviceWhereInput): Prisma.deviceWhereInput => {
    return {
        AND: [baseWhere, extraWhere],
    };
};

const resolveCategoryWhere = (category: StockN1Category): Prisma.deviceWhereInput => {
    if (category === STOCK_N1_CATEGORY.ASSIGNED) {
        return {
            assignments: {
                some: {
                    status: "active",
                },
            },
        };
    }

    return {
        status: category,
    };
};

const formatModelDisplay = (model: DeviceWithRelations["model"]): string => {
    const parts = [model.brand, model.model, model.storage_gb ? `${model.storage_gb}GB` : null, model.color ? `(${model.color})` : null].filter(Boolean);
    return parts.join(" ").replace(/\s+/g, " ").trim();
};

const pickShipmentByLeg = (assignment: DeviceWithRelations["assignments"][number], leg: "OUTBOUND" | "RETURN") => {
    return assignment.shipments.find((shipment) => shipment.leg === leg) || null;
};

const mapAssignmentSummary = (assignment: DeviceWithRelations["assignments"][number]) => {
    const outbound = pickShipmentByLeg(assignment, "OUTBOUND");
    const returnLeg = pickShipmentByLeg(assignment, "RETURN");

    return {
        id: assignment.id.toString(),
        type: assignment.type,
        status: assignment.status,
        assignee_name: assignment.assignee_name,
        assignee_phone: assignment.assignee_phone,
        shipping_voucher_id: outbound?.voucher_id || null,
        shipping_status: outbound?.status || null,
        shipped_at: outbound?.shipped_at?.toISOString() || null,
        delivered_at: outbound?.delivered_at?.toISOString() || null,
        expects_return: assignment.expects_return,
        return_device_imei: assignment.expected_return_imei || null,
        return_status: returnLeg?.status || null,
        ticket_id: assignment.ticket_id || null,
        at: assignment.assigned_at.toISOString(),
    };
};

const mapDeviceToInventoryRecord = (device: DeviceWithRelations) => {
    const inventoryStatus = DEVICE_STATUS_TO_INVENTORY[device.status] || "NEW";
    const assignments = device.assignments.map(mapAssignmentSummary);
    const lastAssignment = assignments[0] || null;
    const modelDisplay = formatModelDisplay(device.model);

    return {
        id: device.id,
        imei: device.imei,
        status: inventoryStatus,
        status_label: STATUS_LABELS[inventoryStatus],
        estado: STATUS_LABELS[inventoryStatus],
        modelo: modelDisplay,
        model_id: device.model_id,
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
        asignado_a: lastAssignment?.assignee_name || device.assigned_to || "",
        ticket: device.ticket_id || "",
        is_assigned: Boolean(device.assigned_to) || assignments.some((assignment) => assignment.type === "ASSIGN" && assignment.status === "active"),
        created_at: device.created_at.toISOString(),
        updated_at: device.updated_at.toISOString(),
        last_assignment_at: lastAssignment?.at || null,
        assignments_count: assignments.length,
        soti_info: {
            is_in_soti: false,
        },
        raw: {
            id: device.id,
            is_deleted: device.is_deleted ?? false,
            assignments,
        },
    };
};

export const GET = withRoles(["stock-viewer"], async (request: NextRequest, session) => {
    try {
        const { searchParams } = new URL(request.url);
        const mine = searchParams.get("mine") === "true";
        const ownerId = searchParams.get("owner_id")?.trim();
        const imei = searchParams.get("imei")?.trim();
        const search = searchParams.get("search")?.trim();
        const statusFilter = normalizeStatusValue(searchParams.get("status"));
        const categoryFilter = normalizeCategoryValue(searchParams.get("category"));
        const rawPage = searchParams.get("page");
        const rawLimit = searchParams.get("limit");
        const page = parseBoundedPositiveInt(rawPage, DEFAULT_PAGE, Number.MAX_SAFE_INTEGER);
        const limit = parseBoundedPositiveInt(rawLimit, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
        const sessionUserId = session.user.id;

        if (searchParams.has("status") && !statusFilter) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Estado inválido para filtro status",
                },
                { status: 400 },
            );
        }

        if (searchParams.has("category") && !categoryFilter) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Categoría inválida para filtro category",
                },
                { status: 400 },
            );
        }

        const deviceColumns = await getTableColumns("phones", "device");

        if (!deviceColumns.has("id") || !deviceColumns.has("created_at")) {
            return missingColumnResponse("phones.device.id|created_at", "El esquema de phones.device no tiene columnas base requeridas para GET /api/stock-n1");
        }

        if (mine && !deviceColumns.has("owner_user_id")) {
            return missingColumnResponse("phones.device.owner_user_id", "No se puede aplicar mine=true porque phones.device.owner_user_id no existe en esta base");
        }

        if (ownerId && !deviceColumns.has("owner_user_id")) {
            return missingColumnResponse("phones.device.owner_user_id", "No se puede aplicar owner_id porque phones.device.owner_user_id no existe en esta base");
        }

        if (imei && !deviceColumns.has("imei")) {
            return missingColumnResponse("phones.device.imei", "No se puede aplicar filtro imei porque phones.device.imei no existe en esta base");
        }

        if (mine && ownerId && ownerId !== sessionUserId) {
            return NextResponse.json(
                {
                    success: false,
                    error: "owner_id no coincide con el usuario autenticado para mine=true",
                },
                { status: 403 },
            );
        }

        const baseWhere: Prisma.deviceWhereInput = {
            is_deleted: false,
        };

        if (mine) {
            baseWhere.owner_user_id = sessionUserId;
        } else if (ownerId) {
            baseWhere.owner_user_id = ownerId;
        }

        if (imei) {
            baseWhere.imei = {
                equals: imei,
                mode: "insensitive",
            };
        }

        if (statusFilter) {
            baseWhere.status = statusFilter;
        }

        if (search) {
            baseWhere.OR = [
                {
                    imei: {
                        contains: search,
                        mode: "insensitive",
                    },
                },
                {
                    assigned_to: {
                        contains: search,
                        mode: "insensitive",
                    },
                },
                {
                    ticket_id: {
                        contains: search,
                        mode: "insensitive",
                    },
                },
                {
                    model: {
                        brand: {
                            contains: search,
                            mode: "insensitive",
                        },
                    },
                },
                {
                    model: {
                        model: {
                            contains: search,
                            mode: "insensitive",
                        },
                    },
                },
                {
                    distributor: {
                        name: {
                            contains: search,
                            mode: "insensitive",
                        },
                    },
                },
                {
                    owner_user: {
                        name: {
                            contains: search,
                            mode: "insensitive",
                        },
                    },
                },
                {
                    assignments: {
                        some: {
                            assignee_name: {
                                contains: search,
                                mode: "insensitive",
                            },
                        },
                    },
                },
            ];
        }

        const effectiveWhere = categoryFilter ? withBaseWhere(baseWhere, resolveCategoryWhere(categoryFilter)) : baseWhere;

        const skip = (page - 1) * limit;

        const assignedDevicesWhere = withBaseWhere(baseWhere, {
            assignments: {
                some: {
                    status: "active",
                },
            },
        });

        const usedDevicesWhere = withBaseWhere(baseWhere, {
            status: "USED",
        });

        const newDevicesWhere = withBaseWhere(baseWhere, {
            status: "NEW",
        });

        const [total, baseTotal, assignedDevices, activeAssignments, usedDevices, newDevices, devices] = await Promise.all([
            prisma.device.count({ where: effectiveWhere }),
            prisma.device.count({ where: baseWhere }),
            prisma.device.count({ where: assignedDevicesWhere }),
            prisma.assignment.count({
                where: {
                    status: "active",
                    device: baseWhere,
                },
            }),
            prisma.device.count({ where: usedDevicesWhere }),
            prisma.device.count({ where: newDevicesWhere }),
            prisma.device.findMany({
                where: effectiveWhere,
                include: DEVICE_INCLUDE,
                orderBy: [{ created_at: "desc" }, { id: "desc" }],
                skip,
                take: limit,
            }),
        ]);

        const records = devices.map(mapDeviceToInventoryRecord);
        const totalPages = Math.max(1, Math.ceil(total / limit));
        const availableDevices = Math.max(0, baseTotal - assignedDevices);

        const response = {
            success: true,
            data: records,
            headers: [...INVENTORY_HEADERS],
            totalRecords: total,
            lastUpdated: new Date().toISOString(),
            summary: {
                totalDevices: baseTotal,
                assignedDevices,
                activeAssignments,
                availableDevices,
                usedDevices,
                newDevices,
            },
            pagination: {
                page,
                limit,
                total,
                totalPages,
            },
        };

        return NextResponse.json(response);
    } catch (error) {
        const missingColumn = extractMissingColumn(error);
        if (missingColumn) {
            console.error("GET /api/stock-n1 missing column detected", {
                missingColumn,
                mine: request.nextUrl.searchParams.get("mine") === "true",
                ownerIdPresent: Boolean(request.nextUrl.searchParams.get("owner_id")?.trim()),
            });
            return missingColumnResponse(missingColumn, "No se pudo leer stock-n1 por deriva de esquema (columna faltante)");
        }

        console.error("GET /api/stock-n1 error:", error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Failed to fetch stock-n1 devices",
            },
            { status: 500 },
        );
    }
});

export const POST = withRoles(["stock-viewer"], async (request: NextRequest, session) => {
    try {
        const body = await request.json();
        const { imei, modelo, distribuidora, asignado_a, ticket, is_backup, backup_distributor_id } = body;

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

        const existingDevice = await prisma.device.findUnique({
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

        const baseStatus: device_status = statusInput || "NEW";
        const resolvedStatus: device_status = assignedTo ? "ASSIGNED" : baseStatus;

        const createdDevice = await prisma.$transaction(async (tx) => {
            const device = await tx.device.create({
                data: {
                    imei: trimmedImei,
                    model_id: modelRecord.id,
                    distributor_id: distributorRecord.id,
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
                await tx.assignment.create({
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
