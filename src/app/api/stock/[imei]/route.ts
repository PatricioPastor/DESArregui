import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getDeviceDetailByImei } from "@/lib/stock-detail";
import type { device_status } from "@/generated/prisma/index";

interface RouteParams {
  params: {
    imei: string;
  };
}

export async function GET(_request: Request, { params }: RouteParams) {
  const imei = params?.imei?.trim();

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

export async function PUT(request: Request, { params }: RouteParams) {
  const imei = params?.imei?.trim();

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
