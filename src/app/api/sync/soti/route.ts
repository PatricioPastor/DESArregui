import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import type { SOTIRecord } from '@/lib/types';
import { getSotiSheetData, convertRowToSOTIRecord } from '@/lib/sheets';

interface SyncRequest {
  devices: SOTIRecord[];
}

interface SyncResponse {
  success: boolean;
  processed: number;
  created: number;
  updated: number;
  deactivated: number;
  errors: number;
  error?: string;
  details?: {
    errors: Array<{
      device: Partial<SOTIRecord>;
      error: string;
    }>;
  };
}

// Map SOTIRecord to database fields
const mapSOTIRecordToDB = (record: SOTIRecord) => ({
  device_name: record.nombre_dispositivo,
  assigned_user: record.usuario_asignado || null,
  model: record.modelo || null,
  imei: record.imei,
  route: record.ruta || null,
  registration_time: record.hora_registro || null,
  enrollment_time: record.hora_inscripcion || null,
  connection_date: record.fecha_conexion || null,
  disconnection_date: record.fecha_desconexion || null,
  phone: record.telefono || null,
  bssid_network: record.bssid_red || null,
  ssid_network: record.ssid_red || null,
  jira_ticket_id: record.id_ticket_jira || null,
  custom_phone: record.telefono_custom || null,
  custom_email: record.correo_custom || null,
  android_enter_email: record.correo_android_enter || null,
  location: record.ubicacion || null,
  is_active: true,
  last_sync: new Date(),
});

const upsertSOTIDevice = async (record: SOTIRecord) => {
  const dbData = mapSOTIRecordToDB(record);

  // Use upsert to handle both insert and update cases
  return await prisma.soti_device.upsert({
    where: {
      imei: record.imei,
    },
    update: {
      ...dbData,
      updated_at: new Date(),
    },
    create: dbData,
  });
};

export async function POST(request: NextRequest) {
  try {
    let providedDevicesCount = 0;
    try {
      const payload = (await request.json()) as SyncRequest;
      if (Array.isArray(payload?.devices)) {
        providedDevicesCount = payload.devices.length;
      }
    } catch (error) {
      // El body puede estar vacío o no ser JSON; ignoramos el error porque usaremos los datos de Sheets.
    }

    const sheetData = await getSotiSheetData();
    const devicesFromSheet = sheetData.rows
      .map((row:any) => convertRowToSOTIRecord(row, sheetData.headers))
      .filter((device:any) => device.imei && device.nombre_dispositivo);

    if (providedDevicesCount && providedDevicesCount !== devicesFromSheet.length) {
      console.info(
        `[soti-sync] Se recibieron ${providedDevicesCount} devices por body pero se usarán ${devicesFromSheet.length} filas de Sheets.`
      );
    }

    if (devicesFromSheet.length === 0) {
      return NextResponse.json<SyncResponse>(
        {
          success: false,
          processed: 0,
          created: 0,
          updated: 0,
          deactivated: 0,
          errors: 1,
          error: 'No se encontraron dispositivos en la hoja SOTI',
        },
        { status: 400 }
      );
    }

    const results = {
      processed: 0,
      created: 0,
      updated: 0,
      deactivated: 0,
      errors: 0,
      errorDetails: [] as Array<{ device: Partial<SOTIRecord>; error: string }>,
    };

    const devices = devicesFromSheet;

    // Get all current IMEIs from incoming data
    const incomingIMEIs = devices.map((d:any) => d.imei).filter(Boolean);

    // Mark devices as inactive if they're not in the incoming data
    if (incomingIMEIs.length > 0) {
      const deactivatedDevices = await prisma.soti_device.updateMany({
        where: {
          imei: { notIn: incomingIMEIs },
          is_active: true,
        },
        data: {
          is_active: false,
          updated_at: new Date(),
        },
      });
      results.deactivated = deactivatedDevices.count;
    }

    // Process devices in batches to avoid overwhelming the database
    const BATCH_SIZE = 50;
    const batches = [];

    for (let i = 0; i < devices.length; i += BATCH_SIZE) {
      batches.push(devices.slice(i, i + BATCH_SIZE));
    }

    for (const batch of batches) {
      const batchPromises = batch.map(async (device:any) => {
        try {
          // Validation
          if (!device.imei || !device.nombre_dispositivo) {
            throw new Error('IMEI and nombre_dispositivo are required');
          }

          // Check if device already exists to determine if it's an update
          const existingDevice = await prisma.soti_device.findUnique({
            where: { imei: device.imei },
          });

          await upsertSOTIDevice(device);

          results.processed++;
          if (existingDevice) {
            results.updated++;
          } else {
            results.created++;
          }

          return { success: true };
        } catch (error) {
          results.errors++;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          results.errorDetails.push({
            device: {
              imei: device.imei,
              nombre_dispositivo: device.nombre_dispositivo,
            },
            error: errorMessage,
          });
          return { success: false, error: errorMessage };
        }
      });

      // Wait for current batch to complete before processing next batch
      await Promise.all(batchPromises);
    }

    const response: SyncResponse = {
      success: results.errors === 0,
      processed: results.processed,
      created: results.created,
      updated: results.updated,
      deactivated: results.deactivated,
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
    console.error('SOTI sync error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Internal server error';

    return NextResponse.json<SyncResponse>(
      {
        success: false,
        processed: 0,
        created: 0,
        updated: 0,
        deactivated: 0,
        errors: 1,
        error: `Failed to sync SOTI devices: ${errorMessage}`,
      },
      { status: 500 }
    );
  }
}