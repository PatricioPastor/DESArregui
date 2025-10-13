const { PrismaClient } = require('./src/generated/prisma');

const prisma = new PrismaClient();

async function debugAssignments() {
  try {
    console.log('🔍 Verificando asignaciones...\n');

    // Buscar asignaciones para el dispositivo SOTI específico
    const assignments = await prisma.assignment.findMany({
      where: { 
        soti_device_id: "cmfx7b8hv005mvfrkmfb7kw4f" 
      },
      include: {
        device: true,
        soti_device: true,
        distributor: true
      },
      orderBy: { at: 'desc' }
    });

    console.log(`📋 Encontradas ${assignments.length} asignaciones:`);
    
    assignments.forEach((assignment, index) => {
      console.log(`\n${index + 1}. ASSIGNMENT:`);
      console.log(`   ID: ${assignment.id}`);
      console.log(`   Status: ${assignment.status}`);
      console.log(`   Type: ${assignment.type}`);
      console.log(`   Device ID: ${assignment.device_id || 'null'}`);
      console.log(`   SOTI Device ID: ${assignment.soti_device_id || 'null'}`);
      console.log(`   Assignee Name: ${assignment.assignee_name || 'null'}`);
      console.log(`   Assignee Phone: ${assignment.assignee_phone || 'null'}`);
      console.log(`   Created At: ${assignment.at}`);
      
      if (assignment.device) {
        console.log(`   Device Status: ${assignment.device.status}`);
        console.log(`   Device Assigned To: ${assignment.device.assigned_to || 'null'}`);
      } else {
        console.log(`   Device: null`);
      }
    });

    // También buscar por device_id si existe
    const deviceAssignments = await prisma.assignment.findMany({
      where: { 
        device_id: "cmfn8rb8w0005vf4oh0b0xrvm" 
      },
      orderBy: { at: 'desc' }
    });

    console.log(`\n📱 Asignaciones por device_id: ${deviceAssignments.length}`);
    deviceAssignments.forEach((assignment, index) => {
      console.log(`   ${index + 1}. ID: ${assignment.id}, Status: ${assignment.status}, Type: ${assignment.type}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugAssignments();
