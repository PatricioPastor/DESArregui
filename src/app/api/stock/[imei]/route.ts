import { NextResponse } from "next/server";
import { getDeviceDetailByImei } from "@/lib/stock-detail";

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

