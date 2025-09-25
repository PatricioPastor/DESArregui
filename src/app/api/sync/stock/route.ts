import { NextRequest, NextResponse } from "next/server";
import prisma from '@/lib/prisma';
import type { StockRecord, InventoryStatus } from "@/lib/types";

interface SyncRequest {
  devices: StockRecord[];
}

interface SyncResponse {
  success: boolean;
  processed: number;
  created: number;
  updated: number;
  createdModels: number;
  createdDistributors: number;
  errors: number;
  error?: string;
  details?: {
    errors: Array<{
      device: Partial<StockRecord>;
      error: string;
    }>;
  };
}

const resolveInventoryStatus = (record: StockRecord): InventoryStatus => {
  const assigned = record.asignado_a && record.asignado_a.trim() !== '';
  const hasTicket = record.ticket && record.ticket.trim() !== '';

  if (assigned && hasTicket) return 'USED';
  if (assigned) return 'ASSIGNED';
  if (hasTicket) return 'NOT_REPAIRED';
  return 'NEW';
};

export async function POST(request: NextRequest) {
  try {
    const body: SyncRequest = await request.json();

    if (!body.devices || !Array.isArray(body.devices)) {
      return NextResponse.json<SyncResponse>(
        {
          success: false,
          processed: 0,
          created: 0,
          updated: 0,
          createdModels: 0,
          createdDistributors: 0,
          errors: 1,
          error: 'Invalid request: devices array is required',
        },
        { status: 400 }
      );
    }

    const results = {
      processed: 0,
      created: 0,
      updated: 0,
      createdModels: 0,
      createdDistributors: 0,
      errors: 0,
      errorDetails: [] as Array<{ device: Partial<StockRecord>; error: string }>,
    };

    // Process each record
    for (const stockRecord of body.devices) {
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
          results.createdModels++;
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
            results.createdDistributors++;
          }
        }

        // Create or update device
        const existingDevice = await prisma.device.findUnique({
          where: { imei: stockRecord.imei }
        });

        const status: InventoryStatus = resolveInventoryStatus(stockRecord);

        if (existingDevice) {
          // Update existing device
          await prisma.device.update({
            where: { imei: stockRecord.imei },
            data: {
              model_id: phoneModel.id,
              distributor_id: distributor?.id,
              status: status,
              assigned_to: stockRecord.asignado_a || null,
              ticket_id: stockRecord.ticket || null,
              updated_at: new Date(),
            }
          });
          results.updated++;
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
          results.created++;
        }

        results.processed++;

      } catch (error) {
        results.errors++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.errorDetails.push({
          device: {
            imei: stockRecord.imei,
            modelo: stockRecord.modelo,
          },
          error: errorMessage,
        });
      }
    }

    const response: SyncResponse = {
      success: results.errors === 0,
      processed: results.processed,
      created: results.created,
      updated: results.updated,
      createdModels: results.createdModels,
      createdDistributors: results.createdDistributors,
      errors: results.errors,
    };

    // Include error details if there were errors
    if (results.errors > 0) {
      response.details = {
        errors: results.errorDetails,
      };
    }

    const statusCode = results.errors === 0 ? 200 : 207; // 207 = Multi-Status

    return NextResponse.json<SyncResponse>(response, { status: statusCode });

  } catch (error) {
    console.error("Stock sync error:", error);
    return NextResponse.json<SyncResponse>(
      {
        success: false,
        processed: 0,
        created: 0,
        updated: 0,
        createdModels: 0,
        createdDistributors: 0,
        errors: 1,
        error: `Failed to sync stock: ${error instanceof Error ? error.message : 'Internal server error'}`,
      },
      { status: 500 }
    );
  }
}