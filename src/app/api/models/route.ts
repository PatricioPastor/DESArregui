import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAdminOnly, withAuth } from "@/lib/api-auth";
import prisma from "@/lib/prisma";

const CreateModelSchema = z.object({
    brand: z.string().trim().min(1, "La marca es requerida"),
    model: z.string().trim().min(1, "El modelo es requerido"),
    storage_gb: z.number().int().positive().optional().nullable(),
    color: z.string().trim().optional().nullable(),
});

const buildModelLabel = (record: { brand: string; model: string; storage_gb: number | null; color: string | null }) => {
    const base = record.storage_gb ? `${record.brand} ${record.model} ${record.storage_gb}GB` : `${record.brand} ${record.model}`;
    const color = record.color?.trim();
    return color ? `${base} (${color})` : base;
};

export const GET = withAuth(async (_request: NextRequest) => {
    try {
        const [phoneModels, usageRows] = await Promise.all([
            prisma.phone_model.findMany({
                select: {
                    id: true,
                    brand: true,
                    model: true,
                    storage_gb: true,
                    color: true,
                },
                orderBy: [{ brand: "asc" }, { model: "asc" }, { storage_gb: "asc" }, { color: "asc" }],
            }),
            prisma.device_n1.groupBy({
                by: ["model_id"],
                where: {
                    is_deleted: false,
                },
                _count: { _all: true },
            }),
        ]);

        const usageMap = new Map<string, number>();
        usageRows.forEach((row) => usageMap.set(row.model_id, row._count._all));

        const data = phoneModels.map((record) => {
            const label = buildModelLabel(record).trim();

            return {
                id: record.id,
                value: label,
                label,
                brand: record.brand,
                model: record.model,
                storage_gb: record.storage_gb,
                color: record.color,
                usage_count: usageMap.get(record.id) ?? 0,
            };
        });

        return NextResponse.json({
            success: true,
            data,
            totalRecords: data.length,
        });
    } catch (error) {
        console.error("Models API error:", error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Internal server error",
            },
            { status: 500 },
        );
    }
});

export const POST = withAdminOnly(async (request: NextRequest) => {
    try {
        const body = await request.json();
        const parsed = CreateModelSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: parsed.error.issues[0]?.message || "Datos inválidos",
                },
                { status: 400 },
            );
        }

        const { brand, model, storage_gb, color } = parsed.data;
        const normalizedColor = color?.trim() || "";

        const existingModel = await prisma.phone_model.findFirst({
            where: {
                brand,
                model,
                storage_gb: storage_gb || null,
                color: normalizedColor,
            },
            select: { id: true },
        });

        if (existingModel) {
            return NextResponse.json(
                {
                    success: false,
                    error: "El modelo ya existe",
                },
                { status: 409 },
            );
        }

        const createdModel = await prisma.phone_model.create({
            data: {
                brand,
                model,
                storage_gb: storage_gb || null,
                color: normalizedColor,
            },
        });

        return NextResponse.json({
            success: true,
            message: "Modelo creado exitosamente",
            data: createdModel,
        });
    } catch (error) {
        console.error("Create model error:", error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Internal server error",
            },
            { status: 500 },
        );
    }
});
