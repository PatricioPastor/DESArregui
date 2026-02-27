import { NextResponse } from "next/server";
import { z } from "zod";
import { withAdminOnly } from "@/lib/api-auth";
import prisma from "@/lib/prisma";

type RouteParams = {
    id: string;
};

const SHIPMENT_LEG = {
    OUTBOUND: "OUTBOUND",
    RETURN: "RETURN",
} as const;

const UpdateShippingSchema = z.object({
    shipping_status: z.enum(["pending", "shipped", "delivered"]),
    shipping_notes: z.string().optional(),
});

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

export const PATCH = withAdminOnly(async (request: Request, _session, context: { params: Promise<RouteParams> }) => {
    const { id: rawAssignmentId } = await context.params;

    if (!rawAssignmentId) {
        return NextResponse.json(
            {
                success: false,
                error: "ID de asignación requerido",
            },
            { status: 400 },
        );
    }

    try {
        const validationResult = UpdateShippingSchema.safeParse(await request.json());
        if (!validationResult.success) {
            return NextResponse.json(
                {
                    error: "Datos inválidos",
                    details: validationResult.error.issues,
                },
                { status: 400 },
            );
        }

        const assignmentId = await resolveCanonicalAssignmentId(rawAssignmentId);
        if (!assignmentId) {
            return NextResponse.json({ error: `No se encontró la asignación con ID ${rawAssignmentId}` }, { status: 404 });
        }

        const { shipping_status, shipping_notes } = validationResult.data;

        const assignment = await prisma.assignment.findUnique({
            where: { id: assignmentId },
            include: {
                shipments: true,
            },
        });

        if (!assignment) {
            return NextResponse.json({ error: `No se encontró la asignación con ID ${rawAssignmentId}` }, { status: 404 });
        }

        if (assignment.status !== "active") {
            return NextResponse.json({ error: "Solo se puede actualizar el estado de envío de asignaciones activas" }, { status: 400 });
        }

        const outboundShipment = assignment.shipments.find((shipment) => shipment.leg === SHIPMENT_LEG.OUTBOUND) || null;
        const now = new Date();

        await prisma.$transaction(async (tx) => {
            if (outboundShipment) {
                await tx.shipment.update({
                    where: { id: outboundShipment.id },
                    data: {
                        status: shipping_status,
                        notes: shipping_notes || null,
                        shipped_at: shipping_status === "shipped" || shipping_status === "delivered" ? outboundShipment.shipped_at || now : null,
                        delivered_at: shipping_status === "delivered" ? outboundShipment.delivered_at || now : null,
                    },
                });
            } else {
                await tx.shipment.create({
                    data: {
                        assignment_id: assignment.id,
                        leg: SHIPMENT_LEG.OUTBOUND,
                        status: shipping_status,
                        notes: shipping_notes || null,
                        shipped_at: shipping_status === "shipped" || shipping_status === "delivered" ? now : null,
                        delivered_at: shipping_status === "delivered" ? now : null,
                    },
                });
            }

            if (shipping_status === "delivered" && assignment.expects_return) {
                const returnShipment = assignment.shipments.find((shipment) => shipment.leg === SHIPMENT_LEG.RETURN);
                if (!returnShipment) {
                    await tx.shipment.create({
                        data: {
                            assignment_id: assignment.id,
                            leg: SHIPMENT_LEG.RETURN,
                            status: "pending",
                        },
                    });
                }
            }
        });

        return NextResponse.json({
            success: true,
            message: `Estado de envío actualizado a "${shipping_status}"`,
        });
    } catch (error) {
        console.error(`PATCH /api/assignments/${rawAssignmentId}/shipping error:`, error);
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : "Error interno del servidor",
            },
            { status: 500 },
        );
    }
});
