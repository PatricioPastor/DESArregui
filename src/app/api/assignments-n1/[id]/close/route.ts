import { NextResponse } from "next/server";
import { z } from "zod";
import { device_status } from "@/generated/prisma";
import { withAdminOnly } from "@/lib/api-auth";
import prisma from "@/lib/prisma";

type RouteParams = {
    id: string;
};

const RELEASABLE_STATUSES = ["USED", "REPAIRED", "NOT_REPAIRED", "LOST"] as const;

const CloseAssignmentN1Schema = z.object({
    reason: z.string().trim().max(500).optional().nullable(),
    resulting_device_status: z.enum(RELEASABLE_STATUSES),
});

const parseContextJson = (raw: string | null) => {
    if (!raw) {
        return null;
    }

    try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            return parsed as Record<string, unknown>;
        }
    } catch {
        return null;
    }

    return null;
};

export const POST = withAdminOnly(async (request: Request, _session, context: { params: Promise<RouteParams> }) => {
    const { id } = await context.params;

    if (!id) {
        return NextResponse.json({ success: false, error: "ID de asignación requerido" }, { status: 400 });
    }

    let assignmentId: bigint;
    try {
        assignmentId = BigInt(id);
    } catch {
        return NextResponse.json({ success: false, error: "ID de asignación inválido" }, { status: 400 });
    }

    const validationResult = CloseAssignmentN1Schema.safeParse(await request.json());

    if (!validationResult.success) {
        return NextResponse.json(
            {
                success: false,
                error: "Datos inválidos",
                details: validationResult.error.issues,
            },
            { status: 400 },
        );
    }

    const { reason, resulting_device_status } = validationResult.data;
    const normalizedReason = reason?.trim() || null;

    try {
        const assignment = await prisma.assignment_n1.findUnique({
            where: { id: assignmentId },
            include: {
                device: {
                    select: { id: true, imei: true },
                },
            },
        });

        if (!assignment) {
            return NextResponse.json({ success: false, error: "Asignación N1 no encontrada" }, { status: 404 });
        }

        if ((assignment.status || "").toLowerCase() !== "active") {
            return NextResponse.json({ success: false, error: "La asignación ya no está activa" }, { status: 400 });
        }

        const previousContext = parseContextJson(assignment.closure_reason);
        const closurePayload = {
            ...(previousContext || {}),
            close_reason: normalizedReason,
            resulting_device_status,
            closed_at: new Date().toISOString(),
        };

        await prisma.$transaction(async (tx) => {
            await tx.assignment_n1.update({
                where: { id: assignmentId },
                data: {
                    status: "completed",
                    closed_at: new Date(),
                    closure_reason: JSON.stringify(closurePayload),
                },
            });

            await tx.device_n1.update({
                where: { id: assignment.device_id },
                data: {
                    status: resulting_device_status as device_status,
                    assigned_to: null,
                    ticket_id: null,
                    updated_at: new Date(),
                },
            });
        });

        return NextResponse.json({
            success: true,
            message: "Activo desvinculado correctamente",
            data: {
                assignment_id: assignment.id.toString(),
                device_id: assignment.device_id,
                imei: assignment.device.imei,
                resulting_device_status,
                closed_at: new Date().toISOString(),
            },
        });
    } catch (error) {
        console.error(`POST /api/assignments-n1/${id}/close error:`, error);

        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Error interno del servidor",
            },
            { status: 500 },
        );
    }
});
