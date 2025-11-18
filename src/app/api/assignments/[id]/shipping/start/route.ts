import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

type RouteParams = {
  id: string;
};

// POST - Iniciar envío (cambiar a shipped)
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
        { error: "Solo se puede iniciar el envío de asignaciones activas" },
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

    // Verificar que está en estado pendiente
    if (assignment.shipping_status && assignment.shipping_status !== "pending") {
      return NextResponse.json(
        { error: `El envío ya está en estado "${assignment.shipping_status}"` },
        { status: 400 }
      );
    }

    // Actualizar el estado de envío
    await prisma.assignment.update({
      where: { id: assignmentId },
      data: {
        shipping_status: "shipped",
        shipped_at: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Envío iniciado exitosamente",
    });
  } catch (error: any) {
    console.error(`POST /api/assignments/${assignmentId}/shipping/start error:`, error);

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

