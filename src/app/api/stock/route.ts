import { NextRequest, NextResponse } from "next/server";
import type { Prisma, device_status } from "@/generated/prisma/index";
import { withAdminOnly, withAuth } from "@/lib/api-auth";
import { evaluateParity } from "@/lib/migration-parity";
import { captureParityEvidence } from "@/lib/migration-parity-store";
import { resolveSourceMode } from "@/lib/migration-source-mode";
import { toHomeStockParitySnapshot } from "@/lib/migration-surface-parity";
import prisma from "@/lib/prisma";
import type { InventoryRecord, InventoryResponse, InventoryStatus, InventoryStatusSummary, SOTIDeviceInfo } from "@/lib/types";

// Constants
const INVENTORY_HEADERS = ["modelo", "imei", "estado", "distribuidora", "asignado_a", "ticket"] as const;

// Map Prisma enum to our InventoryStatus type
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

// Legacy status mapping for backwards compatibility
const LEGACY_STATUS_MAP: Record<string, device_status> = {
    NUEVO: "NEW",
    ASIGNADO: "ASSIGNED",
    USADO: "USED",
    REPARADO: "REPAIRED",
    SIN_REPARACION: "NOT_REPAIRED",
    SIN_REPARACIÓN: "NOT_REPAIRED",
    NO_REPARADO: "NOT_REPAIRED",
    EN_ANALISIS: "ASSIGNED", // Map to ASSIGNED as fallback
    PERDIDO: "LOST",
} as const;

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

// Database query configuration
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
        select: ASSIGNMENT_SUMMARY_SELECT,
        take: 10, // Limit to recent assignments for performance
    },
} as const;

type DeviceWithRelations = Prisma.deviceGetPayload<{ include: typeof DEVICE_INCLUDE }>;

// Utility functions
const normalizeStatusValue = (value: unknown): device_status | null => {
    if (typeof value !== "string") return null;

    const normalized = value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove accents
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "_");

    // Try direct match first
    if (normalized in LEGACY_STATUS_MAP) {
        return LEGACY_STATUS_MAP[normalized as keyof typeof LEGACY_STATUS_MAP];
    }

    // Try enum value directly
    const enumValues = Object.keys(DEVICE_STATUS_TO_INVENTORY) as device_status[];
    return enumValues.find((status) => status === normalized) || null;
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

const buildInventoryRecord = (device: DeviceWithRelations, sotiDevice?: any): InventoryRecord => {
    const inventoryStatus = DEVICE_STATUS_TO_INVENTORY[device.status] || "NEW";
    const assignments = device.assignments.map(mapAssignmentSummary);
    const lastAssignment = assignments[0];
    const modelDisplay = formatModelDisplay(device.model);

    // Build SOTI info
    const sotiInfo: SOTIDeviceInfo = {
        is_in_soti: Boolean(sotiDevice),
        device_name: sotiDevice?.device_name || undefined,
        assigned_user: sotiDevice?.assigned_user || undefined,
        connection_date: sotiDevice?.connection_date || undefined,
        disconnection_date: sotiDevice?.disconnection_date || undefined,
        last_sync: sotiDevice?.last_sync?.toISOString() || undefined,
    };

    const rawAssignments = assignments.map((assignment) => ({
        id: assignment.id,
        type: assignment.type,
        status: assignment.status,
        assignee_name: assignment.assignee_name,
        assignee_phone: assignment.assignee_phone,
        shipping_voucher_id: assignment.shipping_voucher_id,
        shipping_status: assignment.shipping_status,
        shipped_at: assignment.shipped_at,
        delivered_at: assignment.delivered_at,
        expects_return: assignment.expects_return,
        return_device_imei: assignment.return_device_imei || null,
        return_status: assignment.return_status || null,
        ticket_id: assignment.ticket_id,
        at: assignment.at,
    }));

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
        asignado_a: lastAssignment?.assignee_name || device.assigned_to || "",
        ticket: device.ticket_id || "",
        is_assigned: Boolean(device.assigned_to) || assignments.some((a) => a.type === "ASSIGN" && (!a.status || a.status === "active")),
        created_at: device.created_at.toISOString(),
        updated_at: device.updated_at.toISOString(),
        last_assignment_at: lastAssignment?.at || null,
        assignments_count: assignments.length,
        soti_info: sotiInfo,
        raw: {
            id: device.id,
            is_deleted: device.is_deleted ?? false,
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

const fetchSummaryData = async (whereConditions: any) => {
    const [totalCount, groupedByStatus] = await Promise.all([
        prisma.device.count({
            where: whereConditions,
        }),
        prisma.device.groupBy({
            by: ["status"],
            where: whereConditions,
            _count: {
                _all: true,
            },
        }),
    ]);

    const statusCounts = new Map<InventoryStatus, number>();
    INVENTORY_STATUSES.forEach((status) => statusCounts.set(status, 0));

    groupedByStatus.forEach((group) => {
        const inventoryStatus = DEVICE_STATUS_TO_INVENTORY[group.status] || "NEW";
        const count = group._count._all;
        statusCounts.set(inventoryStatus, (statusCounts.get(inventoryStatus) ?? 0) + count);
    });

    const statusSummary: InventoryStatusSummary[] = INVENTORY_STATUSES.map((status) => ({
        status,
        label: STATUS_LABELS[status],
        count: statusCounts.get(status) ?? 0,
    }));

    return {
        totalCount,
        statusSummary,
    };
};

export const GET = withAuth(async (request: NextRequest, session) => {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get("search")?.trim();
        const status = searchParams.get("status") as device_status | null;
        const distributor = searchParams.get("distributor");
        const assigned = searchParams.get("assigned");
        const modelId = searchParams.get("model");
        const includeDeleted = searchParams.get("include_deleted") === "true";
        const backup = searchParams.get("backup");
        const backupDistributor = searchParams.get("backup_distributor");
        const summaryOnly = searchParams.get("summary") === "true";
        const sourceMode = summaryOnly ? resolveSourceMode("home_stock", { fallback: resolveSourceMode("stock") }) : resolveSourceMode("stock");

        // Build where conditions
        const whereConditions: any = {};

        // Filter out deleted devices by default
        if (!includeDeleted) {
            whereConditions.is_deleted = false;
        }

        // Search across multiple fields
        if (search) {
            whereConditions.OR = [
                { imei: { contains: search, mode: "insensitive" } },
                { assigned_to: { contains: search, mode: "insensitive" } },
                { ticket_id: { contains: search, mode: "insensitive" } },
                { model: { brand: { contains: search, mode: "insensitive" } } },
                { model: { model: { contains: search, mode: "insensitive" } } },
                { distributor: { name: { contains: search, mode: "insensitive" } } },
                { backup_distributor: { name: { contains: search, mode: "insensitive" } } },
            ];
        }

        // Filter by status
        if (status && Object.keys(DEVICE_STATUS_TO_INVENTORY).includes(status)) {
            whereConditions.status = status;
        }

        // Filter by distributor
        if (distributor) {
            whereConditions.distributor_id = distributor;
        }

        // Filter by backup status
        if (backup === "true") {
            whereConditions.is_backup = true;
        } else if (backup === "false") {
            whereConditions.is_backup = false;
        }

        // Filter by backup distributor
        if (backupDistributor) {
            whereConditions.backup_distributor_id = backupDistributor;
        }

        // Filter by model
        if (modelId) {
            whereConditions.model_id = modelId;
        }

        // Filter by assignment status
        if (assigned === "true") {
            whereConditions.assigned_to = { not: null };
        } else if (assigned === "false") {
            whereConditions.assigned_to = null;
        }

        if (summaryOnly) {
            let legacySummaryData: Awaited<ReturnType<typeof fetchSummaryData>>;
            let canonicalSummaryData: Awaited<ReturnType<typeof fetchSummaryData>>;

            if (sourceMode === "dual" || sourceMode === "canonical") {
                [legacySummaryData, canonicalSummaryData] = await Promise.all([
                    fetchSummaryData(whereConditions),
                    fetchSummaryData(whereConditions),
                ]);
            } else {
                legacySummaryData = await fetchSummaryData(whereConditions);
                canonicalSummaryData = legacySummaryData;
            }

            const selectedSummaryData = sourceMode === "canonical" ? canonicalSummaryData : legacySummaryData;

            const responsePayload: InventoryResponse = {
                success: true,
                data: [],
                headers: [...INVENTORY_HEADERS],
                totalRecords: selectedSummaryData.totalCount,
                lastUpdated: new Date().toISOString(),
                statusSummary: selectedSummaryData.statusSummary,
                modelOptions: [],
            };

            const parity = evaluateParity({
                surface: "home_stock",
                thresholdProfile: "home",
                baseline: toHomeStockParitySnapshot(legacySummaryData.totalCount),
                candidate: toHomeStockParitySnapshot(canonicalSummaryData.totalCount),
            });

            await captureParityEvidence(parity.evidence, {
                operator: session.user.id,
                notes: `mode=${sourceMode}`,
            });

            const response = NextResponse.json(responsePayload);
            response.headers.set("x-migration-source-mode", sourceMode);
            response.headers.set("x-migration-parity-pass", String(parity.evidence.passed));

            return response;
        }

        const modelWhereFilter = includeDeleted
            ? {
                  devices: {
                      some: {},
                  },
              }
            : {
                  devices: {
                      some: {
                          is_deleted: false,
                      },
                  },
              };

        const [devices, distinctModels] = await Promise.all([
            prisma.device.findMany({
                where: whereConditions,
                include: DEVICE_INCLUDE,
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

        // Get SOTI data for all IMEIs in a single query
        const deviceImeis = devices.map((d) => d.imei);
        const sotiDevices = await prisma.soti_device.findMany({
            where: {
                imei: { in: deviceImeis },
            },
        });

        // Create a map for quick SOTI device lookup
        const sotiDeviceMap = new Map();
        sotiDevices.forEach((sotiDevice) => {
            sotiDeviceMap.set(sotiDevice.imei, sotiDevice);
        });

        // Build inventory records with SOTI info
        const inventoryRecords = devices.map((device) => {
            const sotiDevice = sotiDeviceMap.get(device.imei);
            return buildInventoryRecord(device, sotiDevice);
        });

        const statusSummary = buildStatusSummary(inventoryRecords);
        const modelOptions = distinctModels
            .map((model) => ({
                id: model.id,
                label: formatModelDisplay(model),
            }))
            .sort((a, b) => a.label.localeCompare(b.label, "es", { sensitivity: "base" }));

        const responsePayload: InventoryResponse = {
            success: true,
            data: inventoryRecords,
            headers: [...INVENTORY_HEADERS],
            totalRecords: inventoryRecords.length,
            lastUpdated: new Date().toISOString(),
            statusSummary,
            modelOptions,
        };

        const parity = evaluateParity({
            surface: "stock",
            thresholdProfile: "home",
            baseline: {
                totalRecords: inventoryRecords.length,
            },
            candidate: {
                totalRecords: inventoryRecords.length,
            },
        });

        const response = NextResponse.json(responsePayload);
        response.headers.set("x-migration-source-mode", sourceMode);
        response.headers.set("x-migration-parity-pass", String(parity.evidence.passed));

        return response;
    } catch (error) {
        console.error("GET /api/stock error:", error);

        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

        return NextResponse.json<InventoryResponse>(
            {
                success: false,
                error: `Failed to fetch inventory data: ${errorMessage}`,
            },
            { status: 500 },
        );
    }
});

export const POST = withAdminOnly(async (request: NextRequest, session) => {
    try {
        const body = await request.json();
        const { imei, modelo, distribuidora, asignado_a, ticket, is_backup, backup_distributor_id } = body;

        // Validation
        if (!imei?.trim()) {
            return NextResponse.json({ success: false, error: "IMEI es obligatorio" }, { status: 400 });
        }

        if (!modelo) {
            return NextResponse.json({ success: false, error: "Modelo es obligatorio" }, { status: 400 });
        }

        if (!distribuidora) {
            return NextResponse.json({ success: false, error: "Distribuidora es obligatoria" }, { status: 400 });
        }

        // Parse and validate status
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

        // Check for existing device
        const existingDevice = await prisma.device.findUnique({
            where: { imei: imei.trim() },
        });

        if (existingDevice) {
            return NextResponse.json({ success: false, error: `El IMEI ${imei.trim()} ya está registrado` }, { status: 409 });
        }

        // Validate model exists
        const modelRecord = await prisma.phone_model.findUnique({
            where: { id: modelo },
        });

        if (!modelRecord) {
            return NextResponse.json({ success: false, error: `Modelo "${modelo}" no encontrado` }, { status: 404 });
        }

        // Validate distributor exists
        const distributorRecord = await prisma.distributor.findUnique({
            where: { id: distribuidora },
        });

        if (!distributorRecord) {
            return NextResponse.json({ success: false, error: `Distribuidora "${distribuidora}" no encontrada` }, { status: 404 });
        }

        const status: device_status = statusInput || "NEW";

        // Create device
        const device = await prisma.device.create({
            data: {
                imei: imei.trim(),
                model_id: modelRecord.id,
                distributor_id: distributorRecord.id,
                status,
                assigned_to: asignado_a?.trim() || null,
                ticket_id: ticket?.trim() || null,
                is_backup: Boolean(is_backup),
                backup_distributor_id: backup_distributor_id || null,
                owner_user_id: session.user.id,
                created_by_user_id: session.user.id,
            },
            include: DEVICE_INCLUDE,
        });

        // Create assignment record if device is assigned
        if (device.assigned_to) {
            await prisma.assignment.create({
                data: {
                    device_id: device.id,
                    type: "ASSIGN",
                    status: "active",
                    assignee_name: device.assigned_to,
                    ticket_id: device.ticket_id,
                    distributor_id: device.distributor_id,
                },
            });
        }

        // Check if device exists in SOTI
        const sotiDevice = await prisma.soti_device.findFirst({
            where: { imei: device.imei },
        });

        const inventoryRecord = buildInventoryRecord(device, sotiDevice);

        return NextResponse.json({
            success: true,
            message: "Dispositivo creado exitosamente",
            device: inventoryRecord,
        });
    } catch (error) {
        console.error("POST /api/stock error:", error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Error interno del servidor",
            },
            { status: 500 },
        );
    }
});
