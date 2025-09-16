import { NextRequest, NextResponse } from 'next/server';
import { getStockRecords, getStockSheetData } from '@/lib/sheets';
import { PrismaClient } from '@/generated/prisma';
import type { StockSheetResponse } from '@/lib/types';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Check if required environment variables are set
    if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY || !process.env.GOOGLE_SHEET_ID) {
      return NextResponse.json<StockSheetResponse>(
        {
          success: false,
          error: 'Missing required Google Sheets configuration. Check environment variables.',
        },
        { status: 500 }
      );
    }

    // Fetch and process stock records from Google Sheets
    const stockRecords = await getStockRecords();
    const sheetData = await getStockSheetData();

    // Return successful response
    const response: StockSheetResponse = {
      success: true,
      data: stockRecords,
      headers: sheetData.headers,
      totalRecords: stockRecords.length,
      lastUpdated: sheetData.lastUpdated,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('API Error fetching STOCK sheet data:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json<StockSheetResponse>(
      {
        success: false,
        error: `Failed to fetch STOCK sheet data: ${errorMessage}`,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imei, modelo, distribuidora } = body;

    if (!imei || !modelo) {
      return NextResponse.json(
        { success: false, error: "IMEI and modelo are required" },
        { status: 400 }
      );
    }

    // Extract model info
    const modelParts = modelo.split(" ");
    const brand = modelParts.length > 1 ? modelParts[0] : "Unknown";
    const model = modelParts.length > 1 ? modelParts.slice(1).join(" ") : modelo;

    // Create or find phone model
    let phoneModel = await prisma.phone_model.findFirst({
      where: {
        brand: brand,
        model: model
      }
    });

    if (!phoneModel) {
      phoneModel = await prisma.phone_model.create({
        data: {
          brand: brand,
          model: model,
          storage_gb: null,
          color: ""
        }
      });
    }

    // Create or find distributor
    let distributorRecord = null;
    if (distribuidora && distribuidora.trim()) {
      let distributorName = distribuidora;
      if (distributorName.startsWith("\\\\")) {
        const pathParts = distributorName.substring(2).split("\\");
        distributorName = pathParts[0] || distributorName;
      }

      distributorRecord = await prisma.distributor.findUnique({
        where: { name: distributorName }
      });

      if (!distributorRecord) {
        distributorRecord = await prisma.distributor.create({
          data: { name: distributorName }
        });
      }
    }

    // Create device
    const device = await prisma.device.create({
      data: {
        imei: imei,
        model_id: phoneModel.id,
        distributor_id: distributorRecord?.id,
        status: "IN_STOCK",
        assigned_to: null,
        ticket_id: null
      }
    });

    return NextResponse.json({
      success: true,
      message: "Device created successfully",
      device
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