const { PrismaClient } = require('@/generated/prisma');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function applyMigration() {
  try {
    console.log('Aplicando migración para asignaciones...');
    
    // Leer el archivo SQL
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'prisma/migrations/20251009_add_assignment_fields.sql'),
      'utf-8'
    );

    // Dividir el SQL en comandos individuales
    const commands = migrationSQL
      .split(';')
      .filter(cmd => cmd.trim())
      .map(cmd => cmd.trim() + ';');

    // Ejecutar cada comando
    for (const command of commands) {
      if (command.includes('CREATE') || command.includes('ALTER') || command.includes('COMMENT')) {
        console.log('Ejecutando:', command.substring(0, 50) + '...');
        try {
          await prisma.$executeRawUnsafe(command);
          console.log('✓ Comando ejecutado exitosamente');
        } catch (error) {
          if (error.message.includes('already exists')) {
            console.log('⚠ Ya existe, continuando...');
          } else {
            console.error('✗ Error:', error.message);
          }
        }
      }
    }

    console.log('✓ Migración aplicada exitosamente');
  } catch (error) {
    console.error('Error aplicando migración:', error);
  } finally {
    await prisma.$disconnect();
  }
}

applyMigration();
