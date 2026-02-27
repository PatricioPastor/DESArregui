import { NextResponse } from "next/server";
import { z } from "zod";
import { device_status } from "@/generated/prisma";
import { withAdminOnly } from "@/lib/api-auth";
import prisma from "@/lib/prisma";

type RouteParams = {
    id: string;
};

const CloseAssignmentSchema = z.object({
    reason: z.string().optional(),
    device_returned: z.boolean().default(false),
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

export const POST = withAdminOnly(async (request: Request, _session, context: { params: Promise<RouteParams> }) => {
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
        const validationResult = CloseAssignmentSchema.safeParse(await request.json());
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

        const { reason, device_returned } = validationResult.data;

        const assignment = await prisma.assignment.findUnique({
            where: { id: assignmentId },
            include: {
                device: true,
            },
        });

        if (!assignment) {
            return NextResponse.json({ error: `No se encontró la asignación con ID ${rawAssignmentId}` }, { status: 404 });
        }

        if (assignment.status !== "active") {
            return NextResponse.json({ error: "La asignación ya está cerrada" }, { status: 400 });
        }

        await prisma.$transaction(async (tx) => {
            const previousContext = parseContext(assignment.closure_reason);
            const mergedContext = {
                ...previousContext,
                close_reason: reason?.trim() || null,
                device_returned,
            };

            await tx.assignment.update({
                where: { id: assignment.id },
                data: {
                    status: "completed",
                    closed_at: new Date(),
                    closure_reason: JSON.stringify(mergedContext),
                },
            });

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
            message: "Asignación cerrada correctamente",
        });
    } catch (error) {
        console.error(`POST /api/assignments/${rawAssignmentId}/close error:`, error);

        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : "Error interno del servidor",
            },
            { status: 500 },
        );
    }
});
