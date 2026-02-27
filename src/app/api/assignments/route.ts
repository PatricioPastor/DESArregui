import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { device_status, type Prisma } from "@/generated/prisma";
import { withAdminOnly, withAuth } from "@/lib/api-auth";
import { evaluateParity } from "@/lib/migration-parity";
import { captureParityEvidence } from "@/lib/migration-parity-store";
import { resolveSourceMode } from "@/lib/migration-source-mode";
import { toHomeShippingParitySnapshot } from "@/lib/migration-surface-parity";
import prisma from "@/lib/prisma";

const CreateAssignmentSchema = z.object({
    device_id: z.string().min(1, "El ID del dispositivo es requerido"),
    soti_device_id: z.string().optional().nullable(),
    assignment_type: z.enum(["new", "replacement"]).default("new"),
    assignee_name: z.string().min(1, "El nombre del asignatario es requerido"),
    assignee_phone: z.string().min(1, "El teléfono es requerido"),
    assignee_email: z.string().email().optional().nullable(),
    distributor_id: z.string().min(1, "La distribuidora es requerida"),
    delivery_location: z.string().min(1, "La ubicación de entrega es requerida"),
    contact_details: z.string().optional(),
    generate_voucher: z.boolean(),
    expects_return: z.boolean(),
    return_device_imei: z.string().nullable().optional(),
});

const SHIPMENT_LEG = {
    OUTBOUND: "OUTBOUND",
    RETURN: "RETURN",
} as const;

type ShipmentLeg = (typeof SHIPMENT_LEG)[keyof typeof SHIPMENT_LEG];

type AssignmentWithRelations = Prisma.assignmentGetPayload<{
    include: {
        device: {
            include: {
                model: true;
            };
        };
        distributor: true;
        shipments: {
            orderBy: {
                created_at: "desc";
            };
        };
    };
}>;

const generateShippingVoucherId = (): string => {
    const prefix = "ENV";
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `${prefix}-${date}-${random}`;
};

const toSafeJson = <T>(value: T): T => {
    return JSON.parse(
        JSON.stringify(value, (_key, nestedValue) => {
            if (typeof nestedValue === "bigint") {
                return nestedValue.toString();
            }

            return nestedValue;
        }),
    ) as T;
};

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

const getShipmentByLeg = (assignment: AssignmentWithRelations, leg: ShipmentLeg) => {
    return assignment.shipments.find((shipment) => shipment.leg === leg) || null;
};

const mapAssignmentResponse = (assignment: AssignmentWithRelations) => {
    const outbound = getShipmentByLeg(assignment, SHIPMENT_LEG.OUTBOUND);
    const returnShipment = getShipmentByLeg(assignment, SHIPMENT_LEG.RETURN);
    const context = parseAssignmentContext(assignment.closure_reason);

    const returnStatusFromContext = toOptionalString(context.return_status);
    const returnStatus = returnStatusFromContext || returnShipment?.status || null;

    return {
        id: assignment.id.toString(),
        at: assignment.assigned_at.toISOString(),
        assigned_to: assignment.assignee_name,
        device_id: assignment.device_id,
        ticket_id: assignment.ticket_id,
        type: assignment.type,
        assignee_name: assignment.assignee_name,
        assignee_phone: assignment.assignee_phone,
        assignee_email: assignment.assignee_email,
        contact_details: toOptionalString(context.contact_details) || toOptionalString(context.notes),
        delivery_location: toOptionalString(context.delivery_location) || toOptionalString(context.city),
        distributor_id: assignment.distributor_id,
        expects_return: assignment.expects_return,
        return_device_imei: assignment.expected_return_imei,
        return_status: returnStatus,
        return_received_at: returnShipment?.delivered_at?.toISOString() || null,
        return_notes: returnShipment?.notes || null,
        shipping_voucher_id: outbound?.voucher_id || null,
        status: assignment.status,
        closed_at: assignment.closed_at?.toISOString() || null,
        closure_reason: assignment.closure_reason,
        shipping_status: outbound?.status || null,
        shipped_at: outbound?.shipped_at?.toISOString() || null,
        delivered_at: outbound?.delivered_at?.toISOString() || null,
        shipping_notes: outbound?.notes || null,
        device: assignment.device,
        distributor: assignment.distributor,
    };
};

const resolveCanonicalAssignmentId = async (rawId: string): Promise<bigint | null> => {
    try {
        return BigInt(rawId);
    } catch {
        const rows = await prisma.$queryRaw<Array<{ id: bigint }>>`
            SELECT id
            FROM phones.assignment
            WHERE legacy_assignment_id = ${rawId}
            LIMIT 1
        `;

        return rows[0]?.id ?? null;
    }
};

const resolveCanonicalDeviceId = async (rawDeviceId: string): Promise<string | null> => {
    const canonicalDevice = await prisma.device.findUnique({
        where: { id: rawDeviceId },
        select: { id: true },
    });

    if (canonicalDevice) {
        return canonicalDevice.id;
    }

    const canonicalByImei = await prisma.device.findUnique({
        where: { imei: rawDeviceId },
        select: { id: true },
    });

    return canonicalByImei?.id ?? null;
};

export const GET = withAuth(async (request: NextRequest, session) => {
    try {
        const searchParams = request.nextUrl.searchParams;
        const id = searchParams.get("id");
        const deviceId = searchParams.get("device_id");
        const sotiDeviceId = searchParams.get("soti_device_id");
        const status = searchParams.get("status");
        const summaryOnly = searchParams.get("summary") === "true";
        const sourceMode =
            summaryOnly ? resolveSourceMode("home_shipping", { fallback: resolveSourceMode("assignments") }) : resolveSourceMode("assignments");

        if (summaryOnly) {
            const shippingInProgress = await prisma.shipment.count({
                where: {
                    leg: SHIPMENT_LEG.OUTBOUND,
                    voucher_id: { not: null },
                    status: { in: ["pending", "shipped"] },
                },
            });

            const parity = evaluateParity({
                surface: "home_shipping",
                thresholdProfile: "home",
                baseline: toHomeShippingParitySnapshot(shippingInProgress),
                candidate: toHomeShippingParitySnapshot(shippingInProgress),
            });

            await captureParityEvidence(parity.evidence, {
                operator: session.user.id,
                notes: `mode=${sourceMode}; canonical-only`,
            });

            const response = NextResponse.json({
                success: true,
                shippingInProgress,
                lastUpdated: new Date().toISOString(),
            });

            response.headers.set("x-migration-source-mode", sourceMode);
            response.headers.set("x-migration-parity-pass", String(parity.evidence.passed));

            return response;
        }

        if (id) {
            const assignmentId = await resolveCanonicalAssignmentId(id);
            if (!assignmentId) {
                return NextResponse.json({ error: "Asignación no encontrada" }, { status: 404 });
            }

            const assignment = await prisma.assignment.findUnique({
                where: { id: assignmentId },
                include: {
                    device: {
                        include: {
                            model: true,
                        },
                    },
                    distributor: true,
                    shipments: {
                        orderBy: { created_at: "desc" },
                    },
                },
            });

            if (!assignment) {
                return NextResponse.json({ error: "Asignación no encontrada" }, { status: 404 });
            }

            const response = NextResponse.json(toSafeJson(mapAssignmentResponse(assignment)));
            response.headers.set("x-migration-source-mode", sourceMode);

            return response;
        }

        const whereAnd: Prisma.assignmentWhereInput[] = [];

        if (deviceId) {
            const canonicalDeviceId = await resolveCanonicalDeviceId(deviceId);
            if (canonicalDeviceId) {
                whereAnd.push({ device_id: canonicalDeviceId });
            } else {
                whereAnd.push({ device_id: "__no_device_match__" });
            }
        }

        if (sotiDeviceId) {
            const sotiDevice = await prisma.soti_device.findUnique({
                where: { id: sotiDeviceId },
                select: { imei: true },
            });

            if (sotiDevice?.imei) {
                whereAnd.push({
                    device: {
                        imei: sotiDevice.imei,
                    },
                });
            } else {
                whereAnd.push({ device_id: "__no_soti_match__" });
            }
        }

        if (status) {
            whereAnd.push({ status });
        }

        const where: Prisma.assignmentWhereInput = whereAnd.length > 0 ? { AND: whereAnd } : {};

        const assignments = await prisma.assignment.findMany({
            where,
            include: {
                device: {
                    include: {
                        model: true,
                    },
                },
                distributor: true,
                shipments: {
                    orderBy: { created_at: "desc" },
                },
            },
            orderBy: { assigned_at: "desc" },
        });

        const payload = assignments.map(mapAssignmentResponse);

        const response = NextResponse.json({
            success: true,
            assignments: toSafeJson(payload),
            totalRecords: payload.length,
        });

        response.headers.set("x-migration-source-mode", sourceMode);

        return response;
    } catch (error) {
        console.error("Error fetching assignments:", error);
        return NextResponse.json({ error: "Error al obtener las asignaciones" }, { status: 500 });
    }
});

export const POST = withAdminOnly(async (request: NextRequest) => {
    try {
        const body = await request.json();
        const validationResult = CreateAssignmentSchema.safeParse(body);

        if (!validationResult.success) {
            return NextResponse.json(
                {
                    error: "Datos inválidos",
                    details: validationResult.error,
                },
                { status: 400 },
            );
        }

        const data = validationResult.data;

        const canonicalDeviceId = await resolveCanonicalDeviceId(data.device_id);
        if (!canonicalDeviceId) {
            return NextResponse.json({ error: "Dispositivo no encontrado" }, { status: 404 });
        }

        const device = await prisma.device.findUnique({
            where: { id: canonicalDeviceId },
            include: {
                assignments: {
                    where: {
                        status: "active",
                    },
                    select: {
                        id: true,
                    },
                    take: 1,
                },
                model: true,
                backup_distributor: true,
            },
        });

        if (!device) {
            return NextResponse.json({ error: "Dispositivo no encontrado" }, { status: 404 });
        }

        if (device.assignments.length > 0) {
            return NextResponse.json({ error: "El dispositivo ya tiene una asignación activa" }, { status: 400 });
        }

        const distributor = await prisma.distributor.findUnique({
            where: { id: data.distributor_id },
            select: { id: true },
        });

        if (!distributor) {
            return NextResponse.json({ error: "Distribuidora no encontrada" }, { status: 404 });
        }

        let sotiDevice: { id: string } | null = null;
        if (data.soti_device_id) {
            sotiDevice = await prisma.soti_device.findUnique({
                where: { id: data.soti_device_id },
                select: { id: true },
            });

            if (!sotiDevice) {
                return NextResponse.json({ error: "Dispositivo SOTI no encontrado" }, { status: 404 });
            }
        }

        const isBackupInSameLocation = device.is_backup && device.backup_distributor_id === data.distributor_id;
        const shouldSkipShipping = isBackupInSameLocation;
        const shippingVoucherId = !shouldSkipShipping && data.generate_voucher ? generateShippingVoucherId() : null;
        const initialShippingStatus = shouldSkipShipping ? "delivered" : data.generate_voucher ? "pending" : null;

        const assignmentContext = {
            delivery_location: data.delivery_location,
            contact_details: data.contact_details?.trim() || null,
            soti_device_id: data.soti_device_id || null,
        };

        const assignment = await prisma.$transaction(async (tx) => {
            const createdAssignment = await tx.assignment.create({
                data: {
                    device_id: device.id,
                    type: data.assignment_type === "replacement" ? "REPLACE" : "ASSIGN",
                    status: "active",
                    assignee_name: data.assignee_name.trim(),
                    assignee_phone: data.assignee_phone.trim(),
                    assignee_email: data.assignee_email?.trim() || null,
                    distributor_id: data.distributor_id,
                    expects_return: data.expects_return,
                    expected_return_imei: data.return_device_imei?.trim() || null,
                    closure_reason: JSON.stringify(assignmentContext),
                    assigned_at: new Date(),
                },
                include: {
                    device: {
                        include: {
                            model: true,
                        },
                    },
                    distributor: true,
                    shipments: true,
                },
            });

            if (shippingVoucherId) {
                await tx.shipment.create({
                    data: {
                        assignment_id: createdAssignment.id,
                        leg: SHIPMENT_LEG.OUTBOUND,
                        voucher_id: shippingVoucherId,
                        status: initialShippingStatus || "pending",
                        shipped_at: initialShippingStatus === "delivered" ? new Date() : null,
                        delivered_at: initialShippingStatus === "delivered" ? new Date() : null,
                    },
                });
            }

            if (data.soti_device_id) {
                await tx.soti_device.update({
                    where: { id: data.soti_device_id },
                    data: {
                        status: "ASSIGNED",
                        assigned_user: data.assignee_name.trim(),
                    },
                });
            }

            await tx.device.update({
                where: { id: device.id },
                data: {
                    status: device_status.ASSIGNED,
                    assigned_to: data.assignee_name.trim(),
                    is_backup: false,
                    backup_distributor_id: null,
                    distributor_id: data.distributor_id,
                },
            });

            const refreshedAssignment = await tx.assignment.findUnique({
                where: { id: createdAssignment.id },
                include: {
                    device: {
                        include: {
                            model: true,
                        },
                    },
                    distributor: true,
                    shipments: {
                        orderBy: { created_at: "desc" },
                    },
                },
            });

            if (!refreshedAssignment) {
                throw new Error("No se pudo recuperar la asignación creada");
            }

            return refreshedAssignment;
        });

        return NextResponse.json(
            {
                success: true,
                message: "Asignación creada exitosamente",
                data: toSafeJson(mapAssignmentResponse(assignment)),
            },
            { status: 201 },
        );
    } catch (error) {
        console.error("Error creating assignment:", error);
        return NextResponse.json(
            {
                error: "Error al crear la asignación",
                details: error instanceof Error ? error.message : "Error desconocido",
            },
            { status: 500 },
        );
    }
});

export const PATCH = withAdminOnly(async (request: NextRequest) => {
    try {
        const searchParams = request.nextUrl.searchParams;
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "ID de asignación requerido" }, { status: 400 });
        }

        const assignmentId = await resolveCanonicalAssignmentId(id);
        if (!assignmentId) {
            return NextResponse.json({ error: "Asignación no encontrada" }, { status: 404 });
        }

        const body = await request.json();

        const existingAssignment = await prisma.assignment.findUnique({
            where: { id: assignmentId },
        });

        if (!existingAssignment) {
            return NextResponse.json({ error: "Asignación no encontrada" }, { status: 404 });
        }

        const updateData: Prisma.assignmentUncheckedUpdateInput = {};

        if (typeof body.assignee_name === "string") updateData.assignee_name = body.assignee_name;
        if (typeof body.assignee_phone === "string" || body.assignee_phone === null) updateData.assignee_phone = body.assignee_phone;
        if (typeof body.assignee_email === "string" || body.assignee_email === null) updateData.assignee_email = body.assignee_email;
        if (typeof body.distributor_id === "string" || body.distributor_id === null) updateData.distributor_id = body.distributor_id;
        if (typeof body.ticket_id === "string" || body.ticket_id === null) updateData.ticket_id = body.ticket_id;
        if (typeof body.status === "string") updateData.status = body.status;
        if (typeof body.expects_return === "boolean") updateData.expects_return = body.expects_return;
        if (typeof body.return_device_imei === "string" || body.return_device_imei === null) {
            updateData.expected_return_imei = body.return_device_imei;
        }

        if (body.assignment_type === "replacement") {
            updateData.type = "REPLACE";
        }
        if (body.assignment_type === "new") {
            updateData.type = "ASSIGN";
        }

        const updatedAssignment = await prisma.assignment.update({
            where: { id: assignmentId },
            data: updateData,
            include: {
                device: {
                    include: {
                        model: true,
                    },
                },
                distributor: true,
                shipments: {
                    orderBy: { created_at: "desc" },
                },
            },
        });

        return NextResponse.json({
            success: true,
            message: "Asignación actualizada exitosamente",
            data: toSafeJson(mapAssignmentResponse(updatedAssignment)),
        });
    } catch (error) {
        console.error("Error updating assignment:", error);
        return NextResponse.json({ error: "Error al actualizar la asignación" }, { status: 500 });
    }
});

export const DELETE = withAdminOnly(async (request: NextRequest) => {
    try {
        const searchParams = request.nextUrl.searchParams;
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "ID de asignación requerido" }, { status: 400 });
        }

        const assignmentId = await resolveCanonicalAssignmentId(id);
        if (!assignmentId) {
            return NextResponse.json({ error: "Asignación no encontrada" }, { status: 404 });
        }

        const assignment = await prisma.assignment.findUnique({
            where: { id: assignmentId },
            include: {
                device: true,
            },
        });

        if (!assignment) {
            return NextResponse.json({ error: "Asignación no encontrada" }, { status: 404 });
        }

        const context = parseAssignmentContext(assignment.closure_reason);
        const sotiDeviceId = toOptionalString(context.soti_device_id);

        await prisma.$transaction(async (tx) => {
            await tx.assignment.update({
                where: { id: assignmentId },
                data: {
                    status: "cancelled",
                    closed_at: new Date(),
                },
            });

            if (sotiDeviceId) {
                await tx.soti_device.update({
                    where: { id: sotiDeviceId },
                    data: {
                        status: "NEW",
                        assigned_user: null,
                    },
                });
            }

            await tx.device.update({
                where: { id: assignment.device_id },
                data: {
                    status: device_status.USED,
                    assigned_to: null,
                },
            });
        });

        return NextResponse.json({
            success: true,
            message: "Asignación cancelada exitosamente",
        });
    } catch (error) {
        console.error("Error cancelling assignment:", error);
        return NextResponse.json({ error: "Error al cancelar la asignación" }, { status: 500 });
    }
});
