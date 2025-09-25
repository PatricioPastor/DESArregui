import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const imei = searchParams.get('imei');
    const deviceName = searchParams.get('device_name');
    const assignedUser = searchParams.get('assigned_user');
    const isActive = searchParams.get('is_active');

    const whereConditions: any = {};

    // Search filter
    if (search) {
      whereConditions.OR = [
        { device_name: { contains: search, mode: 'insensitive' } },
        { assigned_user: { contains: search, mode: 'insensitive' } },
        { imei: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } },
        { jira_ticket_id: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Specific filters
    if (imei) {
      whereConditions.imei = { contains: imei, mode: 'insensitive' };
    }

    if (deviceName) {
      whereConditions.device_name = { contains: deviceName, mode: 'insensitive' };
    }

    if (assignedUser) {
      whereConditions.assigned_user = { contains: assignedUser, mode: 'insensitive' };
    }

    if (isActive !== null && isActive !== undefined) {
      whereConditions.is_active = isActive === 'true';
    } else {
      whereConditions.is_active = true; // Default to active only
    }

    const devices = await prisma.soti_device.findMany({
      where: whereConditions,
      orderBy: { last_sync: 'desc' },
      // Sin límite - obtener todos los dispositivos de la hoja SOTI
    });

    // Map database fields back to frontend expected format
    const mappedDevices = devices.map(device => ({
      nombre_dispositivo: device.device_name,
      usuario_asignado: device.assigned_user,
      modelo: device.model,
      imei: device.imei,
      ruta: device.route,
      hora_registro: device.registration_time,
      hora_inscripcion: device.enrollment_time,
      fecha_conexion: device.connection_date,
      fecha_desconexion: device.disconnection_date,
      telefono: device.phone,
      bssid_red: device.bssid_network,
      ssid_red: device.ssid_network,
      id_ticket_jira: device.jira_ticket_id,
      telefono_custom: device.custom_phone,
      correo_custom: device.custom_email,
      correo_android_enter: device.android_enter_email,
      ubicacion: device.location,
    }));

    return NextResponse.json({
      success: true,
      data: mappedDevices,
      totalRecords: mappedDevices.length,
      lastSync: devices[0]?.last_sync || null,
      lastUpdated: devices[0]?.last_sync?.toISOString() || new Date().toISOString()
    });

  } catch (error) {
    console.error('SOTI API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch SOTI data'
      },
      { status: 500 }
    );
  }
}