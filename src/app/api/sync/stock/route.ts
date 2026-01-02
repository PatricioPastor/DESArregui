import { NextRequest, NextResponse } from "next/server";
import prisma from '@/lib/prisma';
import type { StockRecord, InventoryStatus } from "@/lib/types";
import { getStockRecords } from '@/lib/sheets';
import { withAdminOnly } from '@/lib/api-auth';

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
    totalErrors: number;
    truncated: boolean;
    sampledErrors: Array<{
      device: Partial<StockRecord>;
      error: string;
    }>;
  };
}

const resolveInventoryStatus = (record: StockRecord): InventoryStatus => {
  const assigned = record.asignado_a?.trim();
  const hasTicket = record.ticket?.trim();

  if (assigned || hasTicket) {
    return 'ASSIGNED';
  }

  return 'NEW';
};

export const POST = withAdminOnly(async (request: NextRequest, session) => {
  try {
    let body: SyncRequest | null = null;

    try {
      body = await request.json();
    } catch (error) {
      // Ignore JSON parse errors (e.g., empty body) and fallback to sheet data
      body = null;
    }

    const incomingDevices = Array.isArray(body?.devices) ? body!.devices : null;
    const devices = incomingDevices?.length ? incomingDevices : await getStockRecords();

    if (!devices || devices.length === 0) {
      return NextResponse.json<SyncResponse>(
        {
          success: false,
          processed: 0,
          created: 0,
          updated: 0,
          createdModels: 0,
          createdDistributors: 0,
          errors: 1,
          error: 'No se encontraron dispositivos en la hoja STOCK',
        },
        { status: 400 }
      );
    }

    if (incomingDevices && incomingDevices.length !== devices.length) {
      console.info(
        `[stock-sync] Se recibieron ${incomingDevices.length} registros por body, pero se sincronizarán ${devices.length} filas de Sheets.`
      );
    }

    const results = {
      processed: 0,
      created: 0,
      updated: 0,
      createdModels: 0,
      createdDistributors: 0,
      errors: 0,
      truncatedErrors: false,
      errorDetails: [] as Array<{ device: Partial<StockRecord>; error: string }>,
    };

    const MAX_ERROR_DETAILS = 5;

    // Process each record
    for (const stockRecord of devices) {
      try {
        // Skip records without IMEI
        if (!stockRecord.imei || stockRecord.imei.trim() === "") {
          continue;
        }

        // Extract model info (assuming format "brand model" or just "model")
        const normalizedModel = stockRecord.modelo?.trim() ?? "";
        const modelParts = normalizedModel.split(/\s+/).filter(Boolean);

        const brand = modelParts[0] ?? "Unknown";
        const model = modelParts.slice(1).join(" ") || brand || "Unknown";

        // Create or find phone model
        let phoneModel = await prisma.phone_model.findFirst({
          where: {
            brand: {
              equals: brand,
              mode: "insensitive",
            },
            model: {
              equals: model,
              mode: "insensitive",
            },
          }
        });

        if (!phoneModel) {
          phoneModel = await prisma.phone_model.create({
            data: {
              brand,
              model,
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
          let distributorName = stockRecord.distribuidora.trim();
          if (distributorName.startsWith("\\\\")) {
            const pathParts = distributorName.substring(2).split("\\");
            distributorName = pathParts[0] || distributorName;
          }
          distributorName = distributorName.trim();

          distributor = await prisma.distributor.findFirst({
            where: {
              name: {
                equals: distributorName,
                mode: "insensitive",
              }
            }
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
        if (results.errorDetails.length < MAX_ERROR_DETAILS) {
          results.errorDetails.push({
            device: {
              imei: stockRecord.imei,
              modelo: stockRecord.modelo,
            },
            error: errorMessage,
          });
        } else {
          results.truncatedErrors = true;
        }
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
        totalErrors: results.errors,
        truncated: results.truncatedErrors,
        sampledErrors: results.errorDetails,
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
});
