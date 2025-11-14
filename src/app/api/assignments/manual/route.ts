import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { device_status } from "@/generated/prisma";
import { z } from "zod";

// Schema de validación para asignación manual (sin SOTI)
const CreateManualAssignmentSchema = z.object({
  device_id: z.string().min(1, "El ID del dispositivo es requerido"),
  assignee_name: z.string().min(1, "El nombre del asignatario es requerido"),
  assignee_phone: z.string().min(1, "El teléfono es requerido"),
  assignee_email: z.string().email().optional().nullable(),
  distributor_id: z.string().min(1, "La distribuidora es requerida"),
  delivery_location: z.string().min(1, "La ubicación de entrega es requerida"),
  contact_details: z.string().optional(),
  generate_voucher: z.boolean().default(false),
  expects_return: z.boolean().default(false),
  return_device_imei: z.string().nullable().optional(),
});

// Función para generar un ID único de vale de envío
function generateShippingVoucherId(): string {
  const prefix = "ENV";
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${prefix}-${date}-${random}`;
}

// POST - Crear asignación manual (para dispositivos sin SOTI)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validar datos de entrada
    const validationResult = CreateManualAssignmentSchema.safeParse(body);
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

    // Verificar que el dispositivo existe
    const device = await prisma.device.findUnique({
      where: { id: data.device_id },
      include: {
        assignments: {
          where: {
            status: "active",
          },
        },
        model: true,
      },
    });

    if (!device) {
      return NextResponse.json(
        { error: "Dispositivo no encontrado" },
        { status: 404 }
      );
    }

    // Verificar que el dispositivo no está eliminado
    if ((device as any).is_deleted) {
      return NextResponse.json(
        { error: "El dispositivo está eliminado y no puede ser asignado" },
        { status: 400 }
      );
    }

    // Verificar que el dispositivo no está en estado ASSIGNED
    if (device.status === device_status.ASSIGNED) {
      return NextResponse.json(
        { error: "El dispositivo ya está asignado. Debe estar en estado NEW, USED, REPAIRED, etc." },
        { status: 400 }
      );
    }

    // Verificar que no tiene asignación activa
    if (device.assignments.length > 0) {
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

    // Validar IMEI de devolución si es necesario
    // if (data.expects_return) {
    //   if (!data.return_device_imei || data.return_device_imei.trim() === "") {
    //     return NextResponse.json(
    //       { error: "El IMEI del dispositivo a devolver es requerido cuando se espera devolución" },
    //       { status: 400 }
    //     );
    //   }

    //   // Verificar que el IMEI de devolución existe
    //   const returnDevice = await prisma.device.findUnique({
    //     where: { imei: data.return_device_imei },
    //   });

    //   if (!returnDevice) {
    //     return NextResponse.json(
    //       { error: `El IMEI de devolución ${data.return_device_imei} no existe en el inventario` },
    //       { status: 400 }
    //     );
    //   }
    // }

    // Generar ID de vale de envío si se solicitó
    const shippingVoucherId = data.generate_voucher
      ? generateShippingVoucherId()
      : null;

    // Determinar shipping_status inicial
    const initialShippingStatus = data.generate_voucher ? "pending" : null;

    // Crear la asignación en una transacción
    const result = await prisma.$transaction(async (tx) => {
      // 1. Crear la asignación
      const assignment = await tx.assignment.create({
        data: {
          device_id: data.device_id,
          soti_device_id: null, // No hay SOTI device
          assignee_name: data.assignee_name,
          assignee_phone: data.assignee_phone,
          assignee_email: data.assignee_email || null,
          distributor_id: data.distributor_id,
          delivery_location: data.delivery_location,
          contact_details: data.contact_details || null,
          shipping_voucher_id: shippingVoucherId,
          shipping_status: initialShippingStatus,
          expects_return: data.expects_return,
          return_device_imei: data.expects_return ? data.return_device_imei : null,
          return_status: null,
          type: "ASSIGN",
          status: "active", // Por ahora, hasta implementar FSM
        },
        include: {
          device: {
            include: {
              model: true,
            },
          },
          distributor: true,
        },
      });

      // 2. Actualizar el estado del dispositivo
      await tx.device.update({
        where: { id: data.device_id },
        data: {
          status: device_status.ASSIGNED,
          assigned_to: data.assignee_name,
        },
      });

      return assignment;
    });

    return NextResponse.json({
      success: true,
      message: `Asignación creada exitosamente${shippingVoucherId ? ` con vale ${shippingVoucherId}` : ""}`,
      data: result,
    });

  } catch (error) {
    console.error("Error creating manual assignment:", error);
    return NextResponse.json(
      {
        error: "Error al crear la asignación manual",
        details: error instanceof Error ? error.message : "Error desconocido"
      },
      { status: 500 }
    );
  }
}
