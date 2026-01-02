/**
 * Script para sincronizar roles de administrador
 * Actualiza el campo `role` a 'admin' para usuarios en la lista ADMIN_EMAILS
 */

import prisma from '../src/lib/prisma';
import { isAdmin } from '../src/utils/user-roles';

async function syncAdminRoles() {
  console.log('🔄 Sincronizando roles de administrador...\n');

  try {
    // Obtener todos los usuarios
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        name: true,
      },
    });

    console.log(`📊 Usuarios encontrados: ${users.length}\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const user of users) {
      const shouldBeAdmin = isAdmin(user.email);
      const currentRole = user.role || 'viewer';

      if (shouldBeAdmin && currentRole !== 'admin') {
        // Usuario debe ser admin pero no lo es
        await prisma.user.update({
          where: { id: user.id },
          data: { role: 'admin' },
        });

        console.log(`✅ ${user.name} (${user.email})`);
        console.log(`   Actualizado: ${currentRole} → admin\n`);
        updatedCount++;
      } else if (!shouldBeAdmin && currentRole === 'admin') {
        // Usuario tiene rol admin pero no debería
        await prisma.user.update({
          where: { id: user.id },
          data: { role: 'viewer' },
        });

        console.log(`⚠️  ${user.name} (${user.email})`);
        console.log(`   Actualizado: admin → viewer\n`);
        updatedCount++;
      } else {
        skippedCount++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`✨ Sincronización completada!`);
    console.log(`   • ${updatedCount} usuarios actualizados`);
    console.log(`   • ${skippedCount} usuarios sin cambios`);
    console.log('='.repeat(50) + '\n');
  } catch (error) {
    console.error('❌ Error sincronizando roles:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el script
syncAdminRoles();
