import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { device_status } from "@/generated/prisma";
import { z } from "zod";

// Schema de validación para la creación de asignaciones
const CreateAssignmentSchema = z.object({
  soti_device_id: z.string().min(1, "El ID del dispositivo es requerido"),
  assignee_name: z.string().min(1, "El nombre del asignatario es requerido"),
  assignee_phone: z.string().min(1, "El teléfono es requerido"),
  distributor_id: z.string().min(1, "La distribuidora es requerida"),
  delivery_location: z.string().min(1, "La ubicación de entrega es requerida"),
  contact_details: z.string().optional(),
  generate_voucher: z.boolean(),
  expects_return: z.boolean(),
  return_device_imei: z.string().nullable().optional(),
});

// Función para generar un ID único de vale de envío
function generateShippingVoucherId(): string {
  const prefix = "ENV";
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${prefix}-${date}-${random}`;
}

// GET - Obtener todas las asignaciones o una específica
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");
    const deviceId = searchParams.get("device_id");
    const sotiDeviceId = searchParams.get("soti_device_id");
    const status = searchParams.get("status");

    if (id) {
      // Obtener una asignación específica
      const assignment = await prisma.assignment.findUnique({
        where: { id },
        include: {
          device: true,
          soti_device: true,
          distributor: true,
        },
      });

      if (!assignment) {
        return NextResponse.json(
          { error: "Asignación no encontrada" },
          { status: 404 }
        );
      }

      return NextResponse.json(assignment);
    }

    // Construir filtros
    const where: any = {};
    if (deviceId) where.device_id = deviceId;
    if (sotiDeviceId) where.soti_device_id = sotiDeviceId;
    if (status) where.status = status;

    // Obtener todas las asignaciones con filtros opcionales
    const assignments = await prisma.assignment.findMany({
      where,
      include: {
        device: {
          include: {
            model: true,
          },
        },
        soti_device: true,
        distributor: true,
      },
      orderBy: { at: "desc" },
    });

    return NextResponse.json({
      success: true,
      assignments: assignments,
      totalRecords: assignments.length
    });
  } catch (error) {
    console.error("Error fetching assignments:", error);
    return NextResponse.json(
      { error: "Error al obtener las asignaciones" },
      { status: 500 }
    );
  }
}

// POST - Crear una nueva asignación
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validar datos de entrada
    const validationResult = CreateAssignmentSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: "Datos inválidos", 
          details: validationResult.error 
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Verificar que el dispositivo existe y cumple las condiciones
    const sotiDevice = await prisma.soti_device.findUnique({
      where: { id: data.soti_device_id },
      include: {
        assignments: {
          where: {
            status: "active",
          },
        },
      },
    });

    if (!sotiDevice) {
      return NextResponse.json(
        { error: "Dispositivo no encontrado" },
        { status: 404 }
      );
    }

    // Verificar condiciones del dispositivo
    if (!sotiDevice.is_active) {
      return NextResponse.json(
        { error: "El dispositivo no está activo" },
        { status: 400 }
      );
    }

    if (sotiDevice.status !== "NEW") {
      return NextResponse.json(
        { error: `El dispositivo no está en estado NEW (estado actual: ${sotiDevice.status})` },
        { status: 400 }
      );
    }

    if (sotiDevice.assignments.length > 0) {
      return NextResponse.json(
        { error: "El dispositivo ya tiene una asignación activa" },
        { status: 400 }
      );
    }

    // Verificar que la distribuidora existe
    const distributor = await prisma.distributor.findUnique({
      where: { id: data.distributor_id },
    });

    if (!distributor) {
      return NextResponse.json(
        { error: "Distribuidora no encontrada" },
        { status: 404 }
      );
    }

    // Buscar el device correspondiente por IMEI
    const device = await prisma.device.findFirst({
      where: { imei: sotiDevice.imei },
    });

    if (!device) {
      return NextResponse.json(
        { error: "No se encontró el dispositivo correspondiente en la tabla device" },
        { status: 404 }
      );
    }

    // Iniciar transacción para crear la asignación y actualizar el dispositivo
    const result = await prisma.$transaction(async (tx) => {
      // Generar ID de vale de envío si es necesario
      const shippingVoucherId = data.generate_voucher
        ? generateShippingVoucherId()
        : null;

      // Crear la asignación
      const assignment = await tx.assignment.create({
        data: {
          device_id: device.id, // Agregar el device_id
          soti_device_id: data.soti_device_id,
          assignee_name: data.assignee_name,
          assignee_phone: data.assignee_phone,
          distributor_id: data.distributor_id,
          delivery_location: data.delivery_location,
          contact_details: data.contact_details || null,
          shipping_voucher_id: shippingVoucherId,
          expects_return: data.expects_return,
          return_device_imei: data.return_device_imei || null,
          type: "ASSIGN",
          status: "active",
        },
        include: {
          soti_device: true,
          distributor: true,
        },
      });

      // Actualizar el estado del dispositivo SOTI
      await tx.soti_device.update({
        where: { id: data.soti_device_id },
        data: {
          status: "ASSIGNED",
          assigned_user: data.assignee_name,
        },
      });

      // Actualizar el estado del dispositivo en la tabla device
      await tx.device.update({
        where: { id: device.id },
        data: {
          status: device_status.ASSIGNED,
          assigned_to: data.assignee_name,
        },
      });

      return assignment;
    });

    return NextResponse.json(
      {
        success: true,
        message: "Asignación creada exitosamente",
        data: result,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating assignment:", error);
    return NextResponse.json(
      { 
        error: "Error al crear la asignación",
        details: error instanceof Error ? error.message : "Error desconocido"
      },
      { status: 500 }
    );
  }
}

// PATCH - Actualizar una asignación
export async function PATCH(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID de asignación requerido" },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Verificar que la asignación existe
    const existingAssignment = await prisma.assignment.findUnique({
      where: { id },
    });

    if (!existingAssignment) {
      return NextResponse.json(
        { error: "Asignación no encontrada" },
        { status: 404 }
      );
    }

    // Actualizar la asignación
    const updatedAssignment = await prisma.assignment.update({
      where: { id },
      data: body,
      include: {
        device: true,
        soti_device: true,
        distributor: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Asignación actualizada exitosamente",
      data: updatedAssignment,
    });
  } catch (error) {
    console.error("Error updating assignment:", error);
    return NextResponse.json(
      { error: "Error al actualizar la asignación" },
      { status: 500 }
    );
  }
}

// DELETE - Cancelar una asignación (soft delete)
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID de asignación requerido" },
        { status: 400 }
      );
    }

    // Verificar que la asignación existe
    const exiAssignment = await prisma.assignment.findUnique({
      where: { id },
      include: { soti_device: true },
    });

    if (!exiAssignment) {
      return NextResponse.json(
        { error: "Asignación no encontrada" },
        { status: 404 }
      );
    }

    // Verificar que el dispositivo SOTI existe y está activo
    const sotiDevice = await prisma.soti_device.findUnique({
      where: { id: exiAssignment.soti_device_id! },
    });

    if (!sotiDevice || !sotiDevice.is_active) {
      return NextResponse.json(
        { error: "Dispositivo SOTI no encontrado o inactivo" },
        { status: 404 }
      );
    }

    // Buscar el device correspondiente por IMEI
    const device = await prisma.device.findFirst({
      where: { imei: sotiDevice.imei },
    });

    if (!device) {
      return NextResponse.json(
        { error: "No se encontró el dispositivo correspondiente en la tabla device" },
        { status: 404 }
      );
    }

    // Verificar que no tenga asignación activa
    const exisAssignment:any = await prisma.assignment.findFirst({
      where: {
        OR: [
          { device_id: device.id, status: "active" }
        ]
      },
    });

    if (exisAssignment) {
      return NextResponse.json(
        { error: "El dispositivo ya tiene una asignación activa" },
        { status: 409 }
      );
    }

    // Iniciar transacción para cancelar la asignación y actualizar el dispositivo
    await prisma.$transaction(async (tx) => {
      // Marcar la asignación como cancelada
      await tx.assignment.update({
        where: { id },
        data: { status: "cancelled" },
      });

      // Si hay un dispositivo asociado, actualizar su estado
      if (exisAssignment.soti_device_id) {
        await tx.soti_device.update({
          where: { id: exisAssignment.soti_device_id },
          data: {
            status: "NEW",
            assigned_user: null,
          },
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: "Asignación cancelada exitosamente",
    });
  } catch (error) {
    console.error("Error cancelling assignment:", error);
    return NextResponse.json(
      { error: "Error al cancelar la asignación" },
      { status: 500 }
    );
  }
}
