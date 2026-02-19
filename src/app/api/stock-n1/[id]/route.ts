import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withRoles } from "@/lib/api-auth";
import prisma from "@/lib/prisma";

type RouteParams = {
    id: string;
};

const DeleteDeviceN1Schema = z.object({
    reason: z.string().trim().max(500).optional().nullable(),
    final_status: z.enum(["USED", "REPAIRED", "NOT_REPAIRED", "LOST"]).optional().nullable(),
});

export const DELETE = withRoles(["stock-viewer"], async (request: NextRequest, _session, context: { params: Promise<RouteParams> }) => {
    const { id } = await context.params;

    if (!id) {
        return NextResponse.json({ success: false, error: "ID de dispositivo requerido" }, { status: 400 });
    }

    try {
        const body = await request.json();
        const parsed = DeleteDeviceN1Schema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: parsed.error.issues[0]?.message || "Datos inválidos",
                },
                { status: 400 },
            );
        }

        const reason = parsed.data.reason?.trim() || null;
        const finalStatus = parsed.data.final_status || null;

        const device = await prisma.device_n1.findUnique({
            where: { id },
            include: {
                assignments_n1: {
                    where: {
                        status: "active",
                    },
                    select: {
                        id: true,
                    },
                },
            },
        });

        if (!device) {
            return NextResponse.json({ success: false, error: "No se encontró el dispositivo" }, { status: 404 });
        }

        if (device.is_deleted) {
            return NextResponse.json({ success: false, error: "El dispositivo ya está eliminado" }, { status: 400 });
        }

        if (device.assignments_n1.length > 0) {
            return NextResponse.json({ success: false, error: "No se puede eliminar un dispositivo con asignación activa" }, { status: 400 });
        }

        await prisma.device_n1.update({
            where: { id },
            data: {
                is_deleted: true,
                deleted_at: new Date(),
                deletion_reason: reason,
                status: finalStatus || undefined,
                assigned_to: null,
                ticket_id: null,
                updated_at: new Date(),
            },
        });

        return NextResponse.json({
            success: true,
            message: `Dispositivo ${device.imei} eliminado correctamente`,
        });
    } catch (error) {
        console.error(`DELETE /api/stock-n1/${id} error:`, error);

        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Error interno del servidor",
            },
            { status: 500 },
        );
    }
});
