import { NextRequest, NextResponse } from "next/server";

import { withAuth, withAdminOnly } from "@/lib/api-auth";
import prisma from "@/lib/prisma";



export const GET = withAuth(async (request: NextRequest, session) => {
  try {
    // Obtener todas las distribuidoras de la base de datos
    const distributors = await prisma.distributor.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            devices: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Convertir a formato para Select component
    const distributorOptions = distributors.map(distributor => ({
      value: distributor.name,
      label: `${distributor.name} (${distributor._count.devices} dispositivos)`,
      id: distributor.id,
      name: distributor.name,
      deviceCount: distributor._count.devices
    }));

    return NextResponse.json({
      success: true,
      data: distributorOptions,
      totalRecords: distributorOptions.length
    });

  } catch (error) {
    console.error("Distributors API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error"
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
});

export const POST = withAdminOnly(async (request: NextRequest, session) => {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name || name.trim() === "") {
      return NextResponse.json(
        { success: false, error: "Distributor name is required" },
        { status: 400 }
      );
    }

    // Verificar si la distribuidora ya existe
    const existingDistributor = await prisma.distributor.findUnique({
      where: { name: name.trim() }
    });

    if (existingDistributor) {
      return NextResponse.json(
        { success: false, error: "Distributor already exists" },
        { status: 409 }
      );
    }

    // Crear nueva distribuidora
    const distributor = await prisma.distributor.create({
      data: {
        name: name.trim()
      }
    });

    return NextResponse.json({
      success: true,
      message: "Distributor created successfully",
      data: distributor
    });

  } catch (error) {
    console.error("Create distributor error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error"
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
});