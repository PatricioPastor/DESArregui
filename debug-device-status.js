const { PrismaClient } = require('./src/generated/prisma');

const prisma = new PrismaClient();

async function debugDeviceStatus() {
  try {
    console.log('🔍 Verificando estado de dispositivos...\n');

    // Buscar el dispositivo específico que mencionaste
    const device = await prisma.device.findFirst({
      where: { imei: "359036990262488" },
      include: {
        assignments: {
          orderBy: { at: 'desc' },
          take: 5
        },
        model: true,
        distributor: true
      }
    });

    if (!device) {
      console.log('❌ Dispositivo no encontrado');
      return;
    }

    console.log('📱 DEVICE INFO:');
    console.log(`  ID: ${device.id}`);
    console.log(`  IMEI: ${device.imei}`);
    console.log(`  Status: ${device.status}`);
    console.log(`  Assigned To: ${device.assigned_to || 'null'}`);
    console.log(`  Updated At: ${device.updated_at}`);

    console.log('\n📋 ASSIGNMENTS:');
    device.assignments.forEach((assignment, index) => {
      console.log(`  ${index + 1}. ID: ${assignment.id}`);
      console.log(`     Type: ${assignment.type}`);
      console.log(`     Status: ${assignment.status || 'null'}`);
      console.log(`     At: ${assignment.at}`);
      console.log(`     Assigned To: ${assignment.assigned_to || 'null'}`);
      console.log('');
    });

    // Buscar el soti_device correspondiente
    const sotiDevice = await prisma.soti_device.findFirst({
      where: { imei: "359036990262488" }
    });

    if (sotiDevice) {
      console.log('🤖 SOTI DEVICE INFO:');
      console.log(`  ID: ${sotiDevice.id}`);
      console.log(`  Device Name: ${sotiDevice.device_name}`);
      console.log(`  Status: ${sotiDevice.status}`);
      console.log(`  Assigned User: ${sotiDevice.assigned_user || 'null'}`);
      console.log(`  Is Active: ${sotiDevice.is_active}`);
      console.log(`  Updated At: ${sotiDevice.updated_at}`);
    } else {
      console.log('❌ SOTI Device no encontrado');
    }

    // Verificar lógica de is_assigned
    const assignments = device.assignments || [];
    const hasActiveAssignment = assignments.some(a => a.type === 'ASSIGN' && (!a.status || a.status === 'active'));
    const isAssignedByField = Boolean(device.assigned_to);
    const finalIsAssigned = isAssignedByField || hasActiveAssignment;

    console.log('\n🔍 LOGIC CHECK:');
    console.log(`  Has assigned_to field: ${isAssignedByField}`);
    console.log(`  Has active assignment: ${hasActiveAssignment}`);
    console.log(`  Final is_assigned: ${finalIsAssigned}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugDeviceStatus();
