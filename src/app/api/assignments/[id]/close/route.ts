import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { withAdminOnly } from "@/lib/api-auth";

type RouteParams = {
  id: string;
};

// Schema de validación para cerrar asignación
const CloseAssignmentSchema = z.object({
  reason: z.string().optional(),
  device_returned: z.boolean().default(false),
});

// POST - Cerrar/finalizar una asignación activa
export const POST = withAdminOnly(async (request: Request, session, context: { params: Promise<RouteParams> }) => {
  const { id: assignmentId } = await context.params;

  if (!assignmentId) {
    return NextResponse.json(
      {
        success: false,
        error: "ID de asignación requerido",
      },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();

    // Validar datos de entrada
    const validationResult = CloseAssignmentSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Datos inválidos",
          details: validationResult.error.cause,
        },
        { status: 400 }
      );
    }

    const { reason, device_returned } = validationResult.data;

    // Verificar que la asignación existe
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        device: true,
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: `No se encontró la asignación con ID ${assignmentId}` },
        { status: 404 }
      );
    }

    // Verificar que la asignación está activa
    if (assignment.status !== "active") {
      return NextResponse.json(
        { error: "La asignación ya está cerrada" },
        { status: 400 }
      );
    }

    // Actualizar la asignación en una transacción
    await prisma.$transaction(async (tx) => {
      // Cerrar la asignación
      await tx.assignment.update({
        where: { id: assignmentId },
        data: {
          status: "completed",
          closure_reason: reason || null,
          closed_at: new Date(),
        },
      });

      // Si el dispositivo fue devuelto o simplemente cerramos la asignación,
      // actualizar el estado del dispositivo a USED
      if (assignment.device_id) {
        await tx.device.update({
          where: { id: assignment.device_id },
          data: {
            status: device_returned ? "USED" : "USED",
            assigned_to: null,
          },
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: `Asignación cerrada correctamente`,
    });
  } catch (error: any) {
    console.error(`POST /api/assignments/${assignmentId}/close error:`, error);

    if (error?.code === "P2025") {
      return NextResponse.json(
        {
          error: `No se encontró la asignación con ID ${assignmentId}`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Error interno del servidor",
      },
      { status: 500 }
    );
  }
});
