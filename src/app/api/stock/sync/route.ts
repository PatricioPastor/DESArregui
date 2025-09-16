import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma";
import { getStockRecords } from "@/lib/sheets";
import type { StockRecord } from "@/lib/types";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    // Get stock data from Google Sheets
    const stockRecords = await getStockRecords();

    if (!stockRecords || stockRecords.length === 0) {
      return NextResponse.json(
        { success: false, error: "No stock data found in Google Sheets" },
        { status: 400 }
      );
    }

    let syncStats = {
      created: 0,
      updated: 0,
      createdModels: 0,
      createdDistributors: 0,
      errors: 0,
      errorDetails: [] as string[]
    };

    // Process each record
    for (const stockRecord of stockRecords) {
      try {
        // Skip records without IMEI
        if (!stockRecord.imei || stockRecord.imei.trim() === "") {
          continue;
        }

        // Extract model info (assuming format "brand model" or just "model")
        const modelParts = stockRecord.modelo ? stockRecord.modelo.split(" ") : ["Unknown"];
        const brand = modelParts.length > 1 ? modelParts[0] : "Unknown";
        const model = modelParts.length > 1 ? modelParts.slice(1).join(" ") : (stockRecord.modelo || "Unknown");

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
          syncStats.createdModels++;
        }

        // Create or find distributor
        let distributor = null;
        if (stockRecord.distribuidora && stockRecord.distribuidora.trim()) {
          // Extract distributor name from path format (e.g., "\\\\EDEA\\folder" -> "EDEA")
          let distributorName = stockRecord.distribuidora;
          if (distributorName.startsWith("\\\\")) {
            const pathParts = distributorName.substring(2).split("\\");
            distributorName = pathParts[0] || distributorName;
          }

          distributor = await prisma.distributor.findUnique({
            where: { name: distributorName }
          });

          if (!distributor) {
            distributor = await prisma.distributor.create({
              data: { name: distributorName }
            });
            syncStats.createdDistributors++;
          }
        }

        // Create or update device
        const existingDevice = await prisma.device.findUnique({
          where: { imei: stockRecord.imei }
        });

        // Determine status based on assignment
        const isAssigned = stockRecord.asignado_a && stockRecord.asignado_a.trim() !== "";
        const status = isAssigned ? "ASSIGNED" : "IN_STOCK";

        if (existingDevice) {
          // Update existing device
          await prisma.device.update({
            where: { imei: stockRecord.imei },
            data: {
              model_id: phoneModel.id,
              distributor_id: distributor?.id,
              status: status,
              assigned_to: stockRecord.asignado_a || null,
              ticket_id: stockRecord.ticket || null
            }
          });
          syncStats.updated++;
        } else {
          // Create new device
          await prisma.device.create({
            data: {
              imei: stockRecord.imei,
              model_id: phoneModel.id,
              distributor_id: distributor?.id,
              status: status,
              assigned_to: stockRecord.asignado_a || null,
              ticket_id: stockRecord.ticket || null
            }
          });
          syncStats.created++;
        }

      } catch (error) {
        syncStats.errors++;
        syncStats.errorDetails.push(`Error processing IMEI ${stockRecord.imei}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        console.error(`Error processing stock record ${stockRecord.imei}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Stock synchronization completed",
      stats: syncStats,
      totalProcessed: stockRecords.length
    });

  } catch (error) {
    console.error("Stock sync error:", error);
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