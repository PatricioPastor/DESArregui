import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import type {
  InventoryRecord,
  InventoryResponse,
  InventoryStatus,
  InventoryStatusSummary,
  SOTIDeviceInfo,
} from '@/lib/types';
import type { device_status } from '@/generated/prisma/index';

// Constants
const INVENTORY_HEADERS = ['modelo', 'imei', 'estado', 'distribuidora', 'asignado_a', 'ticket'] as const;

// Map Prisma enum to our InventoryStatus type
const DEVICE_STATUS_TO_INVENTORY: Record<device_status, InventoryStatus> = {
  NEW: 'NEW',
  ASSIGNED: 'ASSIGNED',
  USED: 'USED',
  REPAIRED: 'REPAIRED',
  NOT_REPAIRED: 'NOT_REPAIRED',
  LOST: 'LOST',
} as const;

const INVENTORY_STATUSES: InventoryStatus[] = Object.values(DEVICE_STATUS_TO_INVENTORY);

const STATUS_LABELS: Record<InventoryStatus, string> = {
  NEW: 'Nuevo',
  ASSIGNED: 'Asignado',
  USED: 'Usado',
  REPAIRED: 'Reparado',
  NOT_REPAIRED: 'Sin Reparación',
  LOST: 'Perdido',
} as const;

// Legacy status mapping for backwards compatibility
const LEGACY_STATUS_MAP: Record<string, device_status> = {
  'NUEVO': 'NEW',
  'ASIGNADO': 'ASSIGNED',
  'USADO': 'USED',
  'REPARADO': 'REPAIRED',
  'SIN_REPARACION': 'NOT_REPAIRED',
  'SIN_REPARACIÓN': 'NOT_REPAIRED',
  'NO_REPARADO': 'NOT_REPAIRED',
  'EN_ANALISIS': 'ASSIGNED', // Map to ASSIGNED as fallback
  'PERDIDO': 'LOST',
} as const;

// Database query configuration
const DEVICE_INCLUDE = {
  model: {
    select: {
      id: true,
      brand: true,
      model: true,
      storage_gb: true,
      color: true,
    },
  },
  distributor: {
    select: {
      id: true,
      name: true,
    },
  },
  assignments: {
    orderBy: { at: 'desc' as const },
    select: {
      id: true,
      type: true,
      assigned_to: true,
      assignee_name: true,
      assignee_phone: true,
      ticket_id: true,
      at: true,
      status: true,
      shipping_voucher_id: true,
      delivery_location: true,
      contact_details: true,
      expects_return: true,
      return_device_imei: true,
      distributor: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    take: 10, // Limit to recent assignments for performance
  },
} as const;

type DeviceWithRelations = Awaited<ReturnType<typeof prisma.device.findMany<{ include: typeof DEVICE_INCLUDE }>>>[0];

// Utility functions
const normalizeStatusValue = (value: unknown): device_status | null => {
  if (typeof value !== 'string') return null;

  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_');

  // Try direct match first
  if (normalized in LEGACY_STATUS_MAP) {
    return LEGACY_STATUS_MAP[normalized as keyof typeof LEGACY_STATUS_MAP];
  }

  // Try enum value directly
  const enumValues = Object.keys(DEVICE_STATUS_TO_INVENTORY) as device_status[];
  return enumValues.find(status => status === normalized) || null;
};

const formatModelDisplay = (model: DeviceWithRelations['model']): string => {
  const parts = [
    model.brand,
    model.model,
    model.storage_gb ? `${model.storage_gb}GB` : null,
    model.color ? `(${model.color})` : null,
  ].filter(Boolean);

  return parts.join(' ').replace(/\s+/g, ' ').trim();
};

const buildInventoryRecord = (device: DeviceWithRelations, sotiDevice?: any): InventoryRecord => {
  const inventoryStatus = DEVICE_STATUS_TO_INVENTORY[device.status] || 'NEW';
  const assignments = device.assignments || [];
  const lastAssignment = assignments[0];
  const modelDisplay = formatModelDisplay(device.model);

  // Build SOTI info
  const sotiInfo: SOTIDeviceInfo = {
    is_in_soti: Boolean(sotiDevice),
    device_name: sotiDevice?.device_name || undefined,
    assigned_user: sotiDevice?.assigned_user || undefined,
    connection_date: sotiDevice?.connection_date || undefined,
    disconnection_date: sotiDevice?.disconnection_date || undefined,
    last_sync: sotiDevice?.last_sync?.toISOString() || undefined,
  };

  return {
    id: device.id,
    imei: device.imei,
    status: inventoryStatus,
    status_label: STATUS_LABELS[inventoryStatus],
    estado: STATUS_LABELS[inventoryStatus],
    modelo: modelDisplay,
    model_id: device.model_id,
    model_details: {
      id: device.model.id,
      brand: device.model.brand,
      model: device.model.model,
      storage_gb: device.model.storage_gb,
      color: device.model.color,
      display_name: modelDisplay,
    },
    distribuidora: device.distributor?.name || '',
    distribuidora_id: device.distributor?.id || null,
    asignado_a: device.assigned_to || '',
    ticket: device.ticket_id || '',
    is_assigned: Boolean(device.assigned_to) || assignments.some(a => a.type === 'ASSIGN' && (!a.status || a.status === 'active')),
    created_at: device.created_at.toISOString(),
    updated_at: device.updated_at.toISOString(),
    last_assignment_at: lastAssignment?.at.toISOString() || null,
    assignments_count: assignments.length,
    soti_info: sotiInfo,
    raw: {
      ...device,
      created_at: device.created_at.toISOString(),
      updated_at: device.updated_at.toISOString(),
      assignments: assignments.map(a => ({
        ...a,
        at: a.at.toISOString(),
      })),
      soti_device: sotiDevice || null,
    },
  };
};

const buildStatusSummary = (records: InventoryRecord[]): InventoryStatusSummary[] => {
  const summaryMap = new Map<InventoryStatus, number>();
  INVENTORY_STATUSES.forEach((status) => summaryMap.set(status, 0));

  records.forEach((record) => {
    summaryMap.set(record.status, (summaryMap.get(record.status) ?? 0) + 1);
  });

  return INVENTORY_STATUSES.map((status) => ({
    status,
    label: STATUS_LABELS[status],
    count: summaryMap.get(status) ?? 0,
  }));
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim();
    const status = searchParams.get('status') as device_status | null;
    const distributor = searchParams.get('distributor');
    const assigned = searchParams.get('assigned');

    // Build where conditions
    const whereConditions: any = {};

    // Search across multiple fields
    if (search) {
      whereConditions.OR = [
        { imei: { contains: search, mode: 'insensitive' } },
        { assigned_to: { contains: search, mode: 'insensitive' } },
        { ticket_id: { contains: search, mode: 'insensitive' } },
        { model: { brand: { contains: search, mode: 'insensitive' } } },
        { model: { model: { contains: search, mode: 'insensitive' } } },
        { distributor: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // Filter by status
    if (status && Object.keys(DEVICE_STATUS_TO_INVENTORY).includes(status)) {
      whereConditions.status = status;
    }

    // Filter by distributor
    if (distributor) {
      whereConditions.distributor_id = distributor;
    }

    // Filter by assignment status
    if (assigned === 'true') {
      whereConditions.assigned_to = { not: null };
    } else if (assigned === 'false') {
      whereConditions.assigned_to = null;
    }

    const devices = await prisma.device.findMany({
      where: whereConditions,
      include: DEVICE_INCLUDE,
      orderBy: { created_at: 'desc' },
    });

    // Get SOTI data for all IMEIs in a single query
    const deviceImeis = devices.map(d => d.imei);
    const sotiDevices = await prisma.soti_device.findMany({
      where: {
        imei: { in: deviceImeis },
      },
    });

    // Create a map for quick SOTI device lookup
    const sotiDeviceMap = new Map();
    sotiDevices.forEach(sotiDevice => {
      sotiDeviceMap.set(sotiDevice.imei, sotiDevice);
    });

    // Build inventory records with SOTI info
    const inventoryRecords = devices.map(device => {
      const sotiDevice = sotiDeviceMap.get(device.imei);
      return buildInventoryRecord(device, sotiDevice);
    });

    const statusSummary = buildStatusSummary(inventoryRecords);

    const response: InventoryResponse = {
      success: true,
      data: inventoryRecords,
      headers: [...INVENTORY_HEADERS],
      totalRecords: inventoryRecords.length,
      lastUpdated: new Date().toISOString(),
      statusSummary,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('GET /api/stock error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json<InventoryResponse>(
      {
        success: false,
        error: `Failed to fetch inventory data: ${errorMessage}`,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imei, modelo, distribuidora, asignado_a, ticket, purchase_id } = body;

    // Validation
    if (!imei?.trim()) {
      return NextResponse.json(
        { success: false, error: 'IMEI es obligatorio' },
        { status: 400 }
      );
    }

    if (!modelo) {
      return NextResponse.json(
        { success: false, error: 'Modelo es obligatorio' },
        { status: 400 }
      );
    }

    if (!distribuidora) {
      return NextResponse.json(
        { success: false, error: 'Distribuidora es obligatoria' },
        { status: 400 }
      );
    }

    // Parse and validate status
    const statusInput = normalizeStatusValue(body.estado ?? body.status);
    if ((body.estado || body.status) && !statusInput) {
      const validStatuses = Object.values(STATUS_LABELS).join(', ');
      return NextResponse.json(
        {
          success: false,
          error: `Estado inválido. Valores permitidos: ${validStatuses}`,
        },
        { status: 400 }
      );
    }

    // Check for existing device
    const existingDevice = await prisma.device.findUnique({
      where: { imei: imei.trim() },
    });

    if (existingDevice) {
      return NextResponse.json(
        { success: false, error: `El IMEI ${imei.trim()} ya está registrado` },
        { status: 409 }
      );
    }

    // Validate model exists
    const modelRecord = await prisma.phone_model.findUnique({
      where: { id: modelo },
    });

    if (!modelRecord) {
      return NextResponse.json(
        { success: false, error: `Modelo "${modelo}" no encontrado` },
        { status: 404 }
      );
    }

    // Validate distributor exists
    const distributorRecord = await prisma.distributor.findUnique({
      where: { id: distribuidora },
    });

    if (!distributorRecord) {
      return NextResponse.json(
        { success: false, error: `Distribuidora "${distribuidora}" no encontrada` },
        { status: 404 }
      );
    }

    // Validate purchase if provided
    if (purchase_id) {
      const purchaseRecord = await prisma.purchase.findUnique({
        where: { id: purchase_id },
      });

      if (!purchaseRecord) {
        return NextResponse.json(
          { success: false, error: `Compra "${purchase_id}" no encontrada` },
          { status: 404 }
        );
      }
    }

    const status: device_status = statusInput || 'NEW';

    // Create device
    const device = await prisma.device.create({
      data: {
        imei: imei.trim(),
        model_id: modelRecord.id,
        distributor_id: distributorRecord.id,
        purchase_id: purchase_id || null,
        status,
        assigned_to: asignado_a?.trim() || null,
        ticket_id: ticket?.trim() || null,
      },
      include: DEVICE_INCLUDE,
    });

    // Create assignment record if device is assigned
    if (device.assigned_to) {
      await prisma.assignment.create({
        data: {
          device_id: device.id,
          type: 'ASSIGN',
          assigned_to: device.assigned_to,
          ticket_id: device.ticket_id,
        },
      });
    }

    // Check if device exists in SOTI
    const sotiDevice = await prisma.soti_device.findFirst({
      where: { imei: device.imei },
    });

    const inventoryRecord = buildInventoryRecord(device, sotiDevice);

    return NextResponse.json({
      success: true,
      message: 'Dispositivo creado exitosamente',
      device: inventoryRecord,
    });
  } catch (error) {
    console.error('POST /api/stock error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error interno del servidor',
      },
      { status: 500 }
    );
  }
}


