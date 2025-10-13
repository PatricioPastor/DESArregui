const { PrismaClient } = require('./src/generated/prisma');

const prisma = new PrismaClient();

async function debugIMEIDuplicates() {
  try {
    console.log('🔍 Verificando dispositivos con IMEI duplicado...\n');

    const imei = "359036990262488";
    
    // Buscar todos los dispositivos con este IMEI
    const devices = await prisma.device.findMany({
      where: { imei: imei },
      include: {
        model: true,
        distributor: true,
        assignments: {
          orderBy: { at: 'desc' },
          take: 3
        }
      },
      orderBy: { created_at: 'desc' }
    });

    console.log(`📱 Encontrados ${devices.length} dispositivos con IMEI ${imei}:`);
    
    devices.forEach((device, index) => {
      console.log(`\n${index + 1}. DEVICE:`);
      console.log(`   ID: ${device.id}`);
      console.log(`   IMEI: ${device.imei}`);
      console.log(`   Status: ${device.status}`);
      console.log(`   Assigned To: ${device.assigned_to || 'null'}`);
      console.log(`   Created At: ${device.created_at}`);
      console.log(`   Updated At: ${device.updated_at}`);
      console.log(`   Model: ${device.model?.brand} ${device.model?.model}`);
      console.log(`   Distributor: ${device.distributor?.name || 'null'}`);
      console.log(`   Assignments: ${device.assignments.length}`);
      
      device.assignments.forEach((assignment, aIndex) => {
        console.log(`     ${aIndex + 1}. ${assignment.type} - ${assignment.status || 'null'} (${assignment.at})`);
      });
    });

    // Verificar cuál devuelve findFirst
    const firstDevice = await prisma.device.findFirst({
      where: { imei: imei }
    });

    console.log(`\n🎯 findFirst devuelve: ${firstDevice?.id}`);
    console.log(`   Status: ${firstDevice?.status}`);
    console.log(`   Created At: ${firstDevice?.created_at}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugIMEIDuplicates();
