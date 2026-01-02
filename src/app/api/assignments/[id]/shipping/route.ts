import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { withAdminOnly } from "@/lib/api-auth";

type RouteParams = {
  id: string;
};

// Schema de validación para actualizar estado de envío
const UpdateShippingSchema = z.object({
  shipping_status: z.enum(["pending", "shipped", "delivered"]),
  shipping_notes: z.string().optional(),
});

// PATCH - Actualizar estado de envío de una asignación
export const PATCH = withAdminOnly(async (request: Request, session, context: { params: Promise<RouteParams> }) => {
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
    const validationResult = UpdateShippingSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Datos inválidos",
          details: validationResult.error.cause,
        },
        { status: 400 }
      );
    }

    const { shipping_status, shipping_notes } = validationResult.data;

    // Verificar que la asignación existe
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
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
        { error: "Solo se puede actualizar el estado de envío de asignaciones activas" },
        { status: 400 }
      );
    }

    // Preparar datos de actualización
    const updateData: any = {
      shipping_status,
      shipping_notes: shipping_notes || null,
    };

    // Agregar timestamp según el estado
    if (shipping_status === "shipped" && !assignment.shipped_at) {
      updateData.shipped_at = new Date();
    }
    if (shipping_status === "delivered" && !assignment.delivered_at) {
      updateData.delivered_at = new Date();
      // Si se marca como entregado, también marcar como enviado si no lo estaba
      if (!assignment.shipped_at) {
        updateData.shipped_at = new Date();
      }

      // ✅ Si espera devolución, auto-setear return_status a "pending"
      if (assignment.expects_return && !assignment.return_status) {
        updateData.return_status = "pending";
      }
    }

    // Actualizar la asignación
    await prisma.assignment.update({
      where: { id: assignmentId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: `Estado de envío actualizado a "${shipping_status}"`,
    });
  } catch (error: any) {
    console.error(`PATCH /api/assignments/${assignmentId}/shipping error:`, error);

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
