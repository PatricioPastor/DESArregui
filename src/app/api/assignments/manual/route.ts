import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { device_status } from "@/generated/prisma";
import { withAdminOnly } from "@/lib/api-auth";
import prisma from "@/lib/prisma";

const ASSIGNMENT_KINDS = ["PERSONAL", "TERCERIZADO", "ROTATIVO", "CUADRILLA", "PRUEBAS"] as const;
const REPLACEMENT_REASONS = ["ROTURA", "ROBO", "OBSOLETO", "PERDIDA"] as const;

const toJSONSafe = <T>(value: T): T => {
    return JSON.parse(
        JSON.stringify(value, (_key, nestedValue) => {
            if (typeof nestedValue === "bigint") {
                return nestedValue.toString();
            }

            return nestedValue;
        }),
    ) as T;
};

const CreateManualAssignmentSchema = z
    .object({
        device_id: z.string().min(1, "El ID del dispositivo es requerido"),
        assignment_type: z.enum(["new", "replacement"]).default("new"),
        replacement_reason: z.enum(REPLACEMENT_REASONS).optional().nullable(),
        assignment_kind: z.enum(ASSIGNMENT_KINDS).optional().nullable(),
        operational_label: z.string().optional().nullable(),
        assignee_name: z.string().min(1, "El nombre del asignatario es requerido"),
        assignee_phone: z.string().optional().nullable(),
        assignee_email: z.string().email().optional().nullable(),
        distributor_id: z.string().min(1, "La distribuidora es requerida"),
        delivery_location: z.string().min(1, "La ubicación de entrega es requerida"),
        city: z.string().optional().nullable(),
        role_or_reason: z.string().optional().nullable(),
        ticket_id: z.string().optional().nullable(),
        contact_details: z.string().optional().nullable(),
        generate_voucher: z.boolean().default(false),
        expects_return: z.boolean().default(false),
        return_device_imei: z.string().nullable().optional(),
    })
    .superRefine((data, ctx) => {
        if (data.assignment_type === "replacement" && !data.replacement_reason) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "El motivo de recambio es requerido",
                path: ["replacement_reason"],
            });
        }

        const requiresOperationalLabel = data.assignment_kind && ["TERCERIZADO", "ROTATIVO", "CUADRILLA", "PRUEBAS"].includes(data.assignment_kind);

        if (requiresOperationalLabel && !data.operational_label?.trim()) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "La referencia operativa es requerida para este tipo de asignación",
                path: ["operational_label"],
            });
        }
    });

function generateShippingVoucherId(): string {
    const prefix = "ENV";
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `${prefix}-${date}-${random}`;
}

export const POST = withAdminOnly(async (request: NextRequest) => {
    try {
        const body = await request.json();

        const validationResult = CreateManualAssignmentSchema.safeParse(body);
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
        const normalizedDeliveryLocation = data.city?.trim() || data.delivery_location.trim();
        const normalizedTicketId = data.ticket_id?.trim() || null;
        const normalizedRoleOrReason = data.role_or_reason?.trim() || null;
        const normalizedOperationalLabel = data.operational_label?.trim() || null;
        const normalizedAssigneeName = data.assignee_name.trim();
        const normalizedAssigneePhone = data.assignee_phone?.trim() || null;
        const normalizedAssigneeEmail = data.assignee_email?.trim() || null;
        const normalizedReturnImei = data.expects_return ? data.return_device_imei?.trim() || null : null;
        const assignmentTypeValue = data.assignment_type === "replacement" ? "REPLACE" : "ASSIGN";

        const assignmentContext = {
            assignment_kind: data.assignment_kind || null,
            operational_label: normalizedOperationalLabel,
            role_or_reason: normalizedRoleOrReason,
            city: data.city?.trim() || null,
            replacement_reason: data.replacement_reason || null,
            notes: data.contact_details?.trim() || null,
        };

        const hasStructuredContext = Object.values(assignmentContext).some((value) => value);
        const serializedContext = hasStructuredContext ? JSON.stringify(assignmentContext) : null;

        const device = await prisma.device_n1.findUnique({
            where: { id: data.device_id },
            include: {
                assignments_n1: {
                    where: { status: "active" },
                    select: { id: true },
                    take: 1,
                },
            },
        });

        if (!device) {
            return NextResponse.json({ error: "Dispositivo N1 no encontrado" }, { status: 404 });
        }

        if (device.is_deleted) {
            return NextResponse.json({ error: "El dispositivo está eliminado y no puede ser asignado" }, { status: 400 });
        }

        if (device.status === device_status.ASSIGNED || device.assignments_n1.length > 0) {
            return NextResponse.json({ error: "El dispositivo ya tiene una asignación activa" }, { status: 400 });
        }

        const distributor = await prisma.distributor.findUnique({
            where: { id: data.distributor_id },
            select: { id: true },
        });

        if (!distributor) {
            return NextResponse.json({ error: "Distribuidora no encontrada" }, { status: 404 });
        }

        const shippingVoucherId = data.generate_voucher ? generateShippingVoucherId() : null;
        const initialShippingStatus = data.generate_voucher ? "pending" : null;

        const assignment = await prisma.$transaction(async (tx) => {
            const createdAssignment = await tx.assignment_n1.create({
                data: {
                    device_id: data.device_id,
                    type: assignmentTypeValue,
                    status: "active",
                    assignee_name: normalizedAssigneeName,
                    assignee_phone: normalizedAssigneePhone,
                    assignee_email: normalizedAssigneeEmail,
                    ticket_id: normalizedTicketId,
                    distributor_id: data.distributor_id,
                    expects_return: data.expects_return,
                    expected_return_imei: normalizedReturnImei,
                    assigned_at: new Date(),
                    closure_reason: serializedContext,
                },
                include: {
                    device: {
                        include: {
                            model: true,
                        },
                    },
                    distributor: true,
                },
            });

            if (shippingVoucherId) {
                await tx.shipment_n1.create({
                    data: {
                        assignment_id: createdAssignment.id,
                        leg: "OUTBOUND",
                        voucher_id: shippingVoucherId,
                        status: initialShippingStatus || "pending",
                    },
                });
            }

            await tx.device_n1.update({
                where: { id: data.device_id },
                data: {
                    status: device_status.ASSIGNED,
                    assigned_to: normalizedAssigneeName,
                    distributor_id: data.distributor_id,
                    ticket_id: normalizedTicketId,
                    is_backup: false,
                    backup_distributor_id: null,
                    updated_at: new Date(),
                },
            });

            return createdAssignment;
        });

        return NextResponse.json({
            success: true,
            message: `Asignación N1 creada exitosamente${shippingVoucherId ? ` con vale ${shippingVoucherId}` : ""}`,
            data: toJSONSafe(assignment),
        });
    } catch (error) {
        console.error("Error creating manual assignment N1:", error);
        return NextResponse.json(
            {
                error: "Error al crear la asignación manual N1",
                details: error instanceof Error ? error.message : "Error desconocido",
            },
            { status: 500 },
        );
    }
});
