import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getDeviceDetailByImei } from "@/lib/stock-detail";
import type { device_status } from "@/generated/prisma/index";
import { z } from "zod";

type RouteParams = {
  imei: string;
};

export async function GET(_request: Request, context: { params: Promise<RouteParams> }) {
  const { imei: rawImei } = await context.params;
  const imei = rawImei?.trim();

  if (!imei) {
    return NextResponse.json(
      {
        success: false,
        error: "IMEI requerido",
      },
      { status: 400 },
    );
  }

  try {
    const detail = await getDeviceDetailByImei(imei);

    if (!detail) {
      return NextResponse.json(
        {
          success: false,
          error: `No se encontró un dispositivo con IMEI ${imei}`,
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: detail,
    });
  } catch (error) {
    console.error(`GET /api/stock/${imei} error:`, error);
    return NextResponse.json(
      {
        success: false,
        error: "Error interno del servidor",
      },
      { status: 500 },
    );
  }
}

const DEVICE_STATUS_VALUES: device_status[] = ['NEW', 'ASSIGNED', 'USED', 'REPAIRED', 'NOT_REPAIRED', 'LOST'];

const LEGACY_STATUS_MAP: Record<string, device_status> = {
  NUEVO: "NEW",
  ASIGNADO: "ASSIGNED",
  USADO: "USED",
  REPARADO: "REPAIRED",
  SIN_REPARACION: "NOT_REPAIRED",
  NO_REPARADO: "NOT_REPAIRED",
  EN_ANALISIS: "ASSIGNED",
  PERDIDO: "LOST",
};

const normalizeStatusValue = (value: unknown): device_status | null => {
  if (typeof value !== "string") return null;

  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");

  if (normalized in LEGACY_STATUS_MAP) {
    return LEGACY_STATUS_MAP[normalized as keyof typeof LEGACY_STATUS_MAP];
  }

  return DEVICE_STATUS_VALUES.find((status) => status === normalized) || null;
};

export async function PUT(request: Request, context: { params: Promise<RouteParams> }) {
  const { imei: rawImei } = await context.params;
  const imei = rawImei?.trim();

  if (!imei) {
    return NextResponse.json(
      {
        success: false,
        error: "IMEI requerido",
      },
      { status: 400 },
    );
  }

  try {
    const body = await request.json();

    const updateData: Record<string, any> = {};

    if (body.modelo !== undefined) {
      if (!body.modelo || typeof body.modelo !== "string") {
        return NextResponse.json(
          { success: false, error: "Modelo invalido" },
          { status: 400 },
        );
      }

      const modelRecord = await prisma.phone_model.findUnique({
        where: { id: body.modelo },
      });

      if (!modelRecord) {
        return NextResponse.json(
          { success: false, error: `Modelo "${body.modelo}" no encontrado` },
          { status: 404 },
        );
      }

      updateData.model_id = modelRecord.id;
    }

    if (body.distribuidora !== undefined) {
      if (body.distribuidora && typeof body.distribuidora === "string") {
        const distributorRecord = await prisma.distributor.findUnique({
          where: { id: body.distribuidora },
        });

        if (!distributorRecord) {
          return NextResponse.json(
            { success: false, error: `Distribuidora "${body.distribuidora}" no encontrada` },
            { status: 404 },
          );
        }

        updateData.distributor_id = distributorRecord.id;
      } else {
        updateData.distributor_id = null;
      }
    }

    // Handle backup fields
    if (body.is_backup !== undefined) {
      updateData.is_backup = Boolean(body.is_backup);
    }

    if (body.backup_distributor_id !== undefined) {
      if (body.backup_distributor_id && typeof body.backup_distributor_id === "string") {
        const backupDistributorRecord = await prisma.distributor.findUnique({
          where: { id: body.backup_distributor_id },
        });

        if (!backupDistributorRecord) {
          return NextResponse.json(
            { success: false, error: `Distribuidora de backup "${body.backup_distributor_id}" no encontrada` },
            { status: 404 },
          );
        }

        // Validate that backup distributor is not DEPOSITO
        if (backupDistributorRecord.name.toUpperCase() === 'DEPOSITO') {
          return NextResponse.json(
            { success: false, error: 'DEPOSITO no puede ser una distribuidora de backup' },
            { status: 400 },
          );
        }

        updateData.backup_distributor_id = backupDistributorRecord.id;
      } else {
        updateData.backup_distributor_id = null;
      }
    }

    // Validate: if is_backup is true, backup_distributor_id is required
    if (updateData.is_backup === true && !updateData.backup_distributor_id) {
      return NextResponse.json(
        { success: false, error: 'Distribuidora de backup es requerida cuando el dispositivo es de backup' },
        { status: 400 },
      );
    }

    if (body.status !== undefined || body.estado !== undefined) {
      const statusValue = normalizeStatusValue(body.status ?? body.estado);
      if (!statusValue) {
        return NextResponse.json(
          {
            success: false,
            error: "Estado invalido",
          },
          { status: 400 },
        );
      }
      updateData.status = statusValue;
    }

    if (body.asignado_a !== undefined) {
      updateData.assigned_to = body.asignado_a ? String(body.asignado_a).trim() || null : null;
    }

    if (body.ticket !== undefined) {
      updateData.ticket_id = body.ticket ? String(body.ticket).trim() || null : null;
    }

    if (body.purchase_id !== undefined) {
      if (body.purchase_id && typeof body.purchase_id === "string") {
        const purchaseRecord = await prisma.purchase.findUnique({
          where: { id: body.purchase_id.trim() },
        });

        if (!purchaseRecord) {
          return NextResponse.json(
            { success: false, error: `Compra "${body.purchase_id}" no encontrada` },
            { status: 404 },
          );
        }

        updateData.purchase_id = purchaseRecord.id;
      } else {
        updateData.purchase_id = null;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No se recibieron cambios para actualizar",
        },
        { status: 400 },
      );
    }

    await prisma.device.update({
      where: { imei },
      data: updateData,
    });

    const detail = await getDeviceDetailByImei(imei);

    return NextResponse.json({
      success: true,
      message: "Dispositivo actualizado correctamente",
      data: detail,
    });
  } catch (error: any) {
    console.error(`PUT /api/stock/${imei} error:`, error);

    if (error?.code === "P2025") {
      return NextResponse.json(
        {
          success: false,
          error: `No se encontró un dispositivo con IMEI ${imei}`,
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error interno del servidor",
      },
      { status: 500 },
    );
  }
}

// Schema de validación para DELETE
const DeleteDeviceSchema = z.object({
  reason: z.string().optional(),
  final_status: z.enum(['DISPOSED', 'SCRAPPED', 'DONATED']).optional(),
});

// DELETE - Soft delete de un dispositivo
export async function DELETE(request: Request, context: { params: Promise<RouteParams> }) {
  const { imei: rawImei } = await context.params;
  const imei = rawImei?.trim();

  if (!imei) {
    return NextResponse.json(
      {
        success: false,
        error: "IMEI requerido",
      },
      { status: 400 },
    );
  }

  try {
    const body = await request.json();

    // Validar datos de entrada
    const validationResult = DeleteDeviceSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Datos inválidos",
          details: validationResult.error.cause
        },
        { status: 400 }
      );
    }

    const { reason, final_status } = validationResult.data;

    // Verificar que el dispositivo existe
    const device = await prisma.device.findUnique({
      where: { imei },
      include: {
        assignments: {
          where: {
            status: "active",
          },
        },
      },
    });

    if (!device) {
      return NextResponse.json(
        { error: `No se encontró un dispositivo con IMEI ${imei}` },
        { status: 404 }
      );
    }

    // Verificar que no está ya eliminado
    if (device.is_deleted) {
      return NextResponse.json(
        { error: "El dispositivo ya está eliminado" },
        { status: 400 }
      );
    }

    // Verificar que no tiene asignaciones activas
    if (device.assignments.length > 0) {
      return NextResponse.json(
        { error: "No se puede eliminar un dispositivo con asignaciones activas" },
        { status: 400 }
      );
    }

    // Preparar datos de actualización
    const updateData: any = {
      is_deleted: true,
      deleted_at: new Date(),
      deletion_reason: reason || null,
    };

    // Si se especifica un estado final, actualizarlo
    if (final_status) {
      updateData.status = final_status;
    }

    // Realizar el soft delete
    await prisma.device.update({
      where: { imei },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: `Dispositivo ${imei} eliminado correctamente`,
    });

  } catch (error: any) {
    console.error(`DELETE /api/stock/${imei} error:`, error);

    if (error?.code === "P2025") {
      return NextResponse.json(
        {
          error: `No se encontró un dispositivo con IMEI ${imei}`,
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Error interno del servidor",
      },
      { status: 500 },
    );
  }
}
