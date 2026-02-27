import { NextResponse } from "next/server";
import { withAdminOnly } from "@/lib/api-auth";
import prisma from "@/lib/prisma";

type RouteParams = {
    id: string;
};

const SHIPMENT_LEG = {
    OUTBOUND: "OUTBOUND",
} as const;

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

export const POST = withAdminOnly(async (_request: Request, _session, context: { params: Promise<RouteParams> }) => {
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
        const assignmentId = await resolveCanonicalAssignmentId(rawAssignmentId);
        if (!assignmentId) {
            return NextResponse.json({ error: `No se encontró la asignación con ID ${rawAssignmentId}` }, { status: 404 });
        }

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
            return NextResponse.json({ error: "Solo se puede iniciar el envío de asignaciones activas" }, { status: 400 });
        }

        const outboundShipment = assignment.shipments.find((shipment) => shipment.leg === SHIPMENT_LEG.OUTBOUND) || null;

        if (!outboundShipment || !outboundShipment.voucher_id) {
            return NextResponse.json({ error: "Esta asignación no tiene vale de envío" }, { status: 400 });
        }

        if (outboundShipment.status !== "pending") {
            return NextResponse.json({ error: `El envío ya está en estado "${outboundShipment.status}"` }, { status: 400 });
        }

        await prisma.shipment.update({
            where: { id: outboundShipment.id },
            data: {
                status: "shipped",
                shipped_at: outboundShipment.shipped_at || new Date(),
            },
        });

        return NextResponse.json({
            success: true,
            message: "Envío iniciado exitosamente",
        });
    } catch (error) {
        console.error(`POST /api/assignments/${rawAssignmentId}/shipping/start error:`, error);

        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : "Error interno del servidor",
            },
            { status: 500 },
        );
    }
});
