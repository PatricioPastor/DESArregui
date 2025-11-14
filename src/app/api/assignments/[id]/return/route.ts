import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { device_status } from "@/generated/prisma";

type RouteParams = {
  id: string;
};

// Schema de validación para registrar devolución
const RegisterReturnSchema = z.object({
  return_received: z.boolean(),
  return_notes: z.string().optional(),
});

// PATCH - Registrar que se recibió el dispositivo de devolución
export async function PATCH(request: Request, context: { params: Promise<RouteParams> }) {
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
    const validationResult = RegisterReturnSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Datos inválidos",
          // details: validationResult.error.,
        },
        { status: 400 }
      );
    }

    const { return_received, return_notes } = validationResult.data;

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
        { error: "Solo se puede registrar devolución en asignaciones activas" },
        { status: 400 }
      );
    }

    // Verificar que la asignación espera devolución
    if (!assignment.expects_return) {
      return NextResponse.json(
        { error: "Esta asignación no espera devolución de dispositivo" },
        { status: 400 }
      );
    }

    // Verificar que no se haya registrado ya
    if (assignment.return_status === "received") {
      return NextResponse.json(
        { error: "La devolución ya fue registrada anteriormente" },
        { status: 400 }
      );
    }

    // Actualizar en transacción
    await prisma.$transaction(async (tx) => {
      // 1. Actualizar estado de devolución en la asignación
      await tx.assignment.update({
        where: { id: assignmentId },
        data: {
          return_status: return_received ? "received" : "pending",
          return_received_at: return_received ? new Date() : null,
          return_notes: return_notes || null,
        },
      });

      // 2. Si se recibió el dispositivo, actualizar su estado
      if (return_received && assignment.return_device_imei) {
        const returnedDevice = await tx.device.findUnique({
          where: { imei: assignment.return_device_imei },
        });

        if (returnedDevice) {
          await tx.device.update({
            where: { imei: assignment.return_device_imei },
            data: {
              status: device_status.USED,
              assigned_to: null,
            },
          });
        } else {
          console.warn(
            `[return] Device with IMEI ${assignment.return_device_imei} not found in inventory`
          );
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: return_received
        ? "Devolución registrada exitosamente"
        : "Estado de devolución actualizado",
    });
  } catch (error: any) {
    console.error(`PATCH /api/assignments/${assignmentId}/return error:`, error);

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
}
