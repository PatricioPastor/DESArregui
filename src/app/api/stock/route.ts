import { NextRequest, NextResponse } from 'next/server';
import type { StockRecord } from '@/lib/types';
import { PrismaClient } from '@/generated/prisma';
import type { StockSheetResponse } from '@/lib/types';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    // Build search conditions
    const whereConditions: any = {};

    if (search && search.trim()) {
      const searchTerm = search.trim();
      whereConditions.OR = [
        // Search by IMEI
        {
          imei: {
            contains: searchTerm,
            mode: 'insensitive'
          }
        },
        // Search by assigned name
        {
          assigned_to: {
            contains: searchTerm,
            mode: 'insensitive'
          }
        },
        // Search by ticket
        {
          ticket_id: {
            contains: searchTerm,
            mode: 'insensitive'
          }
        },
        // Search by model brand
        {
          model: {
            brand: {
              contains: searchTerm,
              mode: 'insensitive'
            }
          }
        },
        // Search by model name
        {
          model: {
            model: {
              contains: searchTerm,
              mode: 'insensitive'
            }
          }
        },
        // Search by distributor name
        {
          distributor: {
            name: {
              contains: searchTerm,
              mode: 'insensitive'
            }
          }
        }
      ];
    }

    // Fetch stock records from database
    const devices = await prisma.device.findMany({
      where: whereConditions,
      include: {
        model: true,
        distributor: true,
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    // Convert database records to StockRecord format
    const stockRecords: StockRecord[] = devices.map(device => ({
      modelo: `${device.model.brand} ${device.model.model}`.trim(),
      imei: device.imei,
      distribuidora: device.distributor?.name || "",
      asignado_a: device.assigned_to || "",
      ticket: device.ticket_id || "",
      raw: {...device}
    }));

    const response: StockSheetResponse = {
      success: true,
      data: stockRecords,
      headers: ['modelo', 'imei', 'distribuidora', 'asignado_a', 'ticket'],
      totalRecords: stockRecords.length,
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('API Error fetching stock data from database:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json<StockSheetResponse>(
      {
        success: false,
        error: `Failed to fetch stock data from database: ${errorMessage}`,
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imei, modelo, distribuidora, asignado_a, ticket } = body;

    // Validación básica
    if (!imei || !modelo || !distribuidora) {
      return NextResponse.json(
        { success: false, error: "IMEI, modelo y distribuidora son obligatorios" },
        { status: 400 }
      );
    }

    // Verificar si el IMEI ya existe
    const existingDevice = await prisma.device.findUnique({
      where: { imei: imei }
    });

    if (existingDevice) {
      return NextResponse.json(
        { success: false, error: `El IMEI ${imei} ya está registrado en el sistema` },
        { status: 409 }
      );
    }

    // Buscar modelo que coincida con el valor seleccionado en el Select
    // Obtenemos todos los modelos y generamos el mismo formato que en /api/models
    const model = await prisma.phone_model.findFirst({
      where: {
        id: {
          equals: modelo,
          
        }
      }
    });

    if (!model) {
      return NextResponse.json(
        { success: false, error: `El modelo "${modelo}" no existe en el sistema. Debe crear el modelo primero.` },
        { status: 404 }
      );
    }

    // Buscar distribuidora existente
    const distributorRecord = await prisma.distributor.findFirst({
      where: {
        id: {
          equals: distribuidora,
          
        }
      }
    });

    if (!distributorRecord) {
      return NextResponse.json(
        { success: false, error: `La distribuidora "${distribuidora}" no existe en el sistema. Debe crear la distribuidora primero.` },
        { status: 404 }
      );
    }

    // Crear dispositivo solo si modelo y distribuidora existen
    const device = await prisma.device.create({
      data: {
        imei: imei.trim(),
        model_id: model.id,
        distributor_id: distributorRecord.id,
        status: "IN_STOCK",
        assigned_to: asignado_a?.trim() || null,
        ticket_id: ticket?.trim() || null
      },
      include: {
        model: true,
        distributor: true
      }
    });

    return NextResponse.json({
      success: true,
      message: "Dispositivo creado exitosamente",
      device: {
        id: device.id,
        imei: device.imei,
        modelo: `${device.model.brand} ${device.model.model}`.trim(),
        distribuidora: device.distributor!.name,
        asignado_a: device.assigned_to,
        ticket: device.ticket_id
      }
    });

  } catch (error) {
    console.error("Create stock error:", error);
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
}