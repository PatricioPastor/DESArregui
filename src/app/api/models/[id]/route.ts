import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAdminOnly, withAuth } from "@/lib/api-auth";
import prisma from "@/lib/prisma";

const UpdateModelSchema = z
    .object({
        brand: z.string().trim().min(1, "La marca es requerida").optional(),
        model: z.string().trim().min(1, "El modelo es requerido").optional(),
        storage_gb: z.number().int().positive().nullable().optional(),
        color: z.string().trim().nullable().optional(),
    })
    .refine((value) => value.brand !== undefined || value.model !== undefined || value.storage_gb !== undefined || value.color !== undefined, {
        message: "No hay campos para actualizar",
    });

const getModelId = async (params: Promise<{ id: string }>) => {
    const { id } = await params;
    return id;
};

export const GET = withAuth(async (_request: NextRequest, _session, { params }: { params: Promise<{ id: string }> }) => {
    try {
        const id = await getModelId(params);

        const model = await prisma.phone_model.findUnique({
            where: { id },
        });

        if (!model) {
            return NextResponse.json({ success: false, error: "Modelo no encontrado" }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: model });
    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Error desconocido",
            },
            { status: 500 },
        );
    }
});

export const PATCH = withAdminOnly(async (request: NextRequest, _session, { params }: { params: Promise<{ id: string }> }) => {
    try {
        const id = await getModelId(params);
        const body = await request.json();
        const parsed = UpdateModelSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: parsed.error.issues[0]?.message || "Datos inválidos",
                },
                { status: 400 },
            );
        }

        const existing = await prisma.phone_model.findUnique({
            where: { id },
        });

        if (!existing) {
            return NextResponse.json({ success: false, error: "Modelo no encontrado" }, { status: 404 });
        }

        const brand = parsed.data.brand ?? existing.brand;
        const model = parsed.data.model ?? existing.model;
        const storage_gb = parsed.data.storage_gb !== undefined ? parsed.data.storage_gb : existing.storage_gb;
        const color = parsed.data.color !== undefined ? parsed.data.color || "" : existing.color || "";

        const duplicate = await prisma.phone_model.findFirst({
            where: {
                id: { not: id },
                brand,
                model,
                storage_gb,
                color,
            },
            select: { id: true },
        });

        if (duplicate) {
            return NextResponse.json({ success: false, error: "Ya existe otro modelo con esos datos" }, { status: 409 });
        }

        const updated = await prisma.phone_model.update({
            where: { id },
            data: {
                brand,
                model,
                storage_gb,
                color,
            },
        });

        return NextResponse.json({
            success: true,
            message: "Modelo actualizado",
            data: updated,
        });
    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Error desconocido",
            },
            { status: 500 },
        );
    }
});

export const DELETE = withAdminOnly(async (_request: NextRequest, _session, { params }: { params: Promise<{ id: string }> }) => {
    try {
        const id = await getModelId(params);

        const model = await prisma.phone_model.findUnique({
            where: { id },
            select: { id: true, brand: true, model: true },
        });

        if (!model) {
            return NextResponse.json({ success: false, error: "Modelo no encontrado" }, { status: 404 });
        }

        const [legacyUsage, n1Usage] = await Promise.all([
            prisma.device.count({ where: { model_id: id } }),
            prisma.device_n1.count({ where: { model_id: id } }),
        ]);

        const totalUsage = legacyUsage + n1Usage;

        if (totalUsage > 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: `No se puede eliminar porque está en uso por ${totalUsage} dispositivo(s)`,
                },
                { status: 409 },
            );
        }

        await prisma.phone_model.delete({ where: { id } });

        return NextResponse.json({
            success: true,
            message: `Modelo ${model.brand} ${model.model} eliminado`,
        });
    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Error desconocido",
            },
            { status: 500 },
        );
    }
});
