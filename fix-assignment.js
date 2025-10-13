const { PrismaClient } = require('./src/generated/prisma');

const prisma = new PrismaClient();

async function fixAssignment() {
  try {
    console.log('🔧 Corrigiendo asignación incorrecta...\n');

    const wrongAssignmentId = "cmgjop03m0001vf0gu6e6lcin";
    const wrongDeviceId = "cmfmzg2n20003vfswdxiqae6c";
    const correctDeviceId = "cmfn8rb8w0005vf4oh0b0xrvm";
    const sotiDeviceId = "cmfx7b8hv005mvfrkmfb7kw4f";

    await prisma.$transaction(async (tx) => {
      console.log('1. Actualizando asignación con device_id correcto...');
      
      // Actualizar la asignación para que apunte al dispositivo correcto
      await tx.assignment.update({
        where: { id: wrongAssignmentId },
        data: {
          device_id: correctDeviceId
        }
      });

      console.log('2. Revirtiendo estado del dispositivo incorrecto...');
      
      // Revertir el estado del dispositivo que se asignó incorrectamente
      await tx.device.update({
        where: { id: wrongDeviceId },
        data: {
          status: "NEW",
          assigned_to: null
        }
      });

      console.log('3. Actualizando estado del dispositivo correcto...');
      
      // Actualizar el estado del dispositivo correcto
      await tx.device.update({
        where: { id: correctDeviceId },
        data: {
          status: "ASSIGNED",
          assigned_to: "Santiago Bailez"
        }
      });

      console.log('4. Verificando estado del SOTI device...');
      
      // El SOTI device ya está correcto, pero verificamos
      const sotiDevice = await tx.soti_device.findUnique({
        where: { id: sotiDeviceId }
      });
      
      if (sotiDevice?.status !== "ASSIGNED") {
        await tx.soti_device.update({
          where: { id: sotiDeviceId },
          data: {
            status: "ASSIGNED",
            assigned_user: "Santiago Bailez"
          }
        });
      }
    });

    console.log('✅ Asignación corregida exitosamente!');
    
    // Verificar el resultado
    console.log('\n🔍 Verificando resultado...');
    
    const assignment = await prisma.assignment.findUnique({
      where: { id: wrongAssignmentId },
      include: {
        device: true,
        soti_device: true
      }
    });

    console.log(`Assignment device_id: ${assignment?.device_id}`);
    console.log(`Device status: ${assignment?.device?.status}`);
    console.log(`Device assigned_to: ${assignment?.device?.assigned_to}`);
    console.log(`SOTI device status: ${assignment?.soti_device?.status}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAssignment();
