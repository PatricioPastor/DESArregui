import { NextResponse } from "next/server";
import { z } from "zod";
import { device_status } from "@/generated/prisma";
import { withAdminOnly } from "@/lib/api-auth";
import prisma from "@/lib/prisma";

type RouteParams = {
    id: string;
};

const SHIPMENT_LEG = {
    RETURN: "RETURN",
} as const;

const RegisterReturnSchema = z.object({
    return_received: z.boolean(),
    return_notes: z.string().optional(),
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

const parseContext = (raw: string | null): Record<string, unknown> => {
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
        const validationResult = RegisterReturnSchema.safeParse(await request.json());
        if (!validationResult.success) {
            return NextResponse.json(
                {
                    error: "Datos inválidos",
                },
                { status: 400 },
            );
        }

        const assignmentId = await resolveCanonicalAssignmentId(rawAssignmentId);
        if (!assignmentId) {
            return NextResponse.json({ error: `No se encontró la asignación con ID ${rawAssignmentId}` }, { status: 404 });
        }

        const { return_received, return_notes } = validationResult.data;

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
            return NextResponse.json({ error: "Solo se puede registrar devolución en asignaciones activas" }, { status: 400 });
        }

        if (!assignment.expects_return) {
            return NextResponse.json({ error: "Esta asignación no espera devolución de dispositivo" }, { status: 400 });
        }

        const returnShipment = assignment.shipments.find((shipment) => shipment.leg === SHIPMENT_LEG.RETURN) || null;

        if (returnShipment?.status === "received" && return_received) {
            return NextResponse.json({ error: "La devolución ya fue registrada anteriormente" }, { status: 400 });
        }

        const now = new Date();

        await prisma.$transaction(async (tx) => {
            if (returnShipment) {
                await tx.shipment.update({
                    where: { id: returnShipment.id },
                    data: {
                        status: return_received ? "received" : "pending",
                        delivered_at: return_received ? returnShipment.delivered_at || now : null,
                        notes: return_notes || null,
                    },
                });
            } else {
                await tx.shipment.create({
                    data: {
                        assignment_id: assignment.id,
                        leg: SHIPMENT_LEG.RETURN,
                        status: return_received ? "received" : "pending",
                        delivered_at: return_received ? now : null,
                        notes: return_notes || null,
                    },
                });
            }

            const contextData = parseContext(assignment.closure_reason);
            const mergedContext = {
                ...contextData,
                return_status: return_received ? "received" : "pending",
            };

            await tx.assignment.update({
                where: { id: assignment.id },
                data: {
                    closure_reason: JSON.stringify(mergedContext),
                },
            });

            if (return_received && assignment.expected_return_imei) {
                const returnedDevice = await tx.device.findUnique({
                    where: { imei: assignment.expected_return_imei },
                    select: { id: true },
                });

                if (returnedDevice) {
                    await tx.device.update({
                        where: { id: returnedDevice.id },
                        data: {
                            status: device_status.USED,
                            assigned_to: null,
                        },
                    });
                } else {
                    console.warn(`[return] Device with IMEI ${assignment.expected_return_imei} not found in inventory`);
                }
            }
        });

        return NextResponse.json({
            success: true,
            message: return_received ? "Devolución registrada exitosamente" : "Estado de devolución actualizado",
        });
    } catch (error) {
        console.error(`PATCH /api/assignments/${rawAssignmentId}/return error:`, error);

        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : "Error interno del servidor",
            },
            { status: 500 },
        );
    }
});
