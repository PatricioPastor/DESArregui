import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

type RouteParams = {
  id: string;
};

// POST - Finalizar envío (marcar como entregado)
export async function POST(request: Request, context: { params: Promise<RouteParams> }) {
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
        { error: "Solo se puede finalizar el envío de asignaciones activas" },
        { status: 400 }
      );
    }

    // Verificar que tiene vale de envío
    if (!assignment.shipping_voucher_id) {
      return NextResponse.json(
        { error: "Esta asignación no tiene vale de envío" },
        { status: 400 }
      );
    }

    // Verificar que está en estado shipped
    if (assignment.shipping_status !== "shipped") {
      return NextResponse.json(
        { error: `El envío debe estar en estado "shipped" para poder finalizarlo` },
        { status: 400 }
      );
    }

    // Preparar datos de actualización
    const updateData: any = {
      shipping_status: "delivered",
      delivered_at: new Date(),
    };

    // Si no tenía shipped_at, establecerlo ahora
    if (!assignment.shipped_at) {
      updateData.shipped_at = new Date();
    }

    // Si espera devolución, auto-setear return_status a "pending"
    if (assignment.expects_return && !assignment.return_status) {
      updateData.return_status = "pending";
    }

    // Actualizar la asignación
    await prisma.assignment.update({
      where: { id: assignmentId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: "Envío marcado como entregado exitosamente",
    });
  } catch (error: any) {
    console.error(`POST /api/assignments/${assignmentId}/shipping/deliver error:`, error);

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

