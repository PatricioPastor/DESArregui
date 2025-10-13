const { PrismaClient } = require('./src/generated/prisma');

const prisma = new PrismaClient();

async function debugWrongDevice() {
  try {
    console.log('🔍 Verificando el dispositivo incorrecto en la asignación...\n');

    const wrongDeviceId = "cmfmzg2n20003vfswdxiqae6c";
    
    // Buscar el dispositivo que se asignó incorrectamente
    const wrongDevice = await prisma.device.findUnique({
      where: { id: wrongDeviceId },
      include: {
        model: true,
        distributor: true,
        assignments: {
          orderBy: { at: 'desc' }
        }
      }
    });

    if (wrongDevice) {
      console.log('❌ DISPOSITIVO INCORRECTO ASIGNADO:');
      console.log(`   ID: ${wrongDevice.id}`);
      console.log(`   IMEI: ${wrongDevice.imei}`);
      console.log(`   Status: ${wrongDevice.status}`);
      console.log(`   Assigned To: ${wrongDevice.assigned_to || 'null'}`);
      console.log(`   Model: ${wrongDevice.model?.brand} ${wrongDevice.model?.model}`);
      console.log(`   Created At: ${wrongDevice.created_at}`);
      console.log(`   Updated At: ${wrongDevice.updated_at}`);
      console.log(`   Assignments: ${wrongDevice.assignments.length}`);
    } else {
      console.log('❌ Dispositivo no encontrado');
    }

    // Verificar si hay algún dispositivo con IMEI similar o diferente
    // que pueda haber causado la confusión
    const sotiDevice = await prisma.soti_device.findUnique({
      where: { id: "cmfx7b8hv005mvfrkmfb7kw4f" }
    });

    if (sotiDevice) {
      console.log('\n🤖 SOTI DEVICE ORIGINAL:');
      console.log(`   ID: ${sotiDevice.id}`);
      console.log(`   IMEI: ${sotiDevice.imei}`);
      console.log(`   Device Name: ${sotiDevice.device_name}`);
      
      // Buscar dispositivos con el IMEI del SOTI device
      const correctDevices = await prisma.device.findMany({
        where: { imei: sotiDevice.imei },
        include: { model: true }
      });
      
      console.log(`\n✅ DISPOSITIVOS CORRECTOS CON IMEI ${sotiDevice.imei}:`);
      correctDevices.forEach((device, index) => {
        console.log(`   ${index + 1}. ID: ${device.id}`);
        console.log(`      Status: ${device.status}`);
        console.log(`      Model: ${device.model?.brand} ${device.model?.model}`);
        console.log(`      Created: ${device.created_at}`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugWrongDevice();
