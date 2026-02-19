import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withRoles } from "@/lib/api-auth";
import prisma from "@/lib/prisma";

const AssignOwnerSchema = z.object({
    owner_user_id: z.string().min(1, "El usuario a cargo es requerido"),
    set_backup: z.boolean().default(true),
});

type RouteParams = {
    id: string;
};

export const PATCH = withRoles(["stock-viewer"], async (request: NextRequest, _session, context: { params: Promise<RouteParams> }) => {
    const { id } = await context.params;

    if (!id) {
        return NextResponse.json({ success: false, error: "ID de dispositivo requerido" }, { status: 400 });
    }

    const parsedBody = AssignOwnerSchema.safeParse(await request.json());

    if (!parsedBody.success) {
        return NextResponse.json(
            {
                success: false,
                error: parsedBody.error.issues[0]?.message || "Datos inválidos",
            },
            { status: 400 },
        );
    }

    const { owner_user_id, set_backup } = parsedBody.data;

    try {
        const [device, ownerUser] = await Promise.all([
            prisma.device_n1.findUnique({
                where: { id },
                select: { id: true, imei: true, is_deleted: true },
            }),
            prisma.user.findFirst({
                where: {
                    id: owner_user_id,
                    isActive: true,
                    roles: {
                        some: {
                            role: {
                                name: "stock-viewer",
                            },
                        },
                    },
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            }),
        ]);

        if (!device) {
            return NextResponse.json({ success: false, error: "Dispositivo no encontrado" }, { status: 404 });
        }

        if (device.is_deleted) {
            return NextResponse.json({ success: false, error: "No se puede actualizar un dispositivo eliminado" }, { status: 400 });
        }

        if (!ownerUser) {
            return NextResponse.json(
                {
                    success: false,
                    error: "El usuario seleccionado no está activo o no tiene rol stock-viewer",
                },
                { status: 404 },
            );
        }

        const updatedDevice = await prisma.device_n1.update({
            where: { id },
            data: {
                owner_user_id,
                is_backup: set_backup ? true : undefined,
                updated_at: new Date(),
            },
            select: {
                id: true,
                imei: true,
                owner_user_id: true,
                is_backup: true,
            },
        });

        return NextResponse.json({
            success: true,
            message: "Responsable de backup actualizado",
            data: {
                ...updatedDevice,
                owner_name: ownerUser.name,
                owner_email: ownerUser.email,
            },
        });
    } catch (error) {
        console.error(`PATCH /api/stock-n1/${id}/owner error:`, error);

        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Error interno del servidor",
            },
            { status: 500 },
        );
    }
});
