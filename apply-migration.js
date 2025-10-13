const { PrismaClient } = require('./src/generated/prisma');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function applyMigration() {
  try {
    console.log('🚀 Iniciando aplicación de migración...\n');
    
    // Leer el archivo SQL
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'migration_assignment_fields_final.sql'),
      'utf-8'
    );

    console.log('📄 Ejecutando migración SQL...');
    
    // Ejecutar la migración completa
    await prisma.$executeRawUnsafe(migrationSQL);
    
    console.log('\n✅ Migración aplicada exitosamente');
    
    // Verificar que todo esté correcto
    console.log('\n🔍 Verificando estructura...');
    
    const assignmentColumns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'phones' 
      AND table_name = 'assignment' 
      AND column_name IN (
        'assignee_name', 'assignee_phone', 'distributor_id', 
        'delivery_location', 'contact_details', 'shipping_voucher_id',
        'expects_return', 'return_device_imei', 'soti_device_id', 'status'
      )
      ORDER BY column_name;
    `;
    
    console.log('📋 Nuevas columnas en assignment:');
    assignmentColumns.forEach(col => {
      console.log(`  ✓ ${col.column_name}: ${col.data_type}`);
    });
    
    const sotiStatus = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'phones' 
      AND table_name = 'soti_device' 
      AND column_name = 'status';
    `;
    
    if (sotiStatus.length > 0) {
      console.log('  ✓ status agregado a soti_device');
    }
    
    console.log('\n🎉 ¡Migración completada con éxito!');
    console.log('🔧 La funcionalidad de asignaciones está lista para usar.');
    
  } catch (error) {
    console.error('❌ Error aplicando migración:', error.message);
    console.error('📝 Detalles:', error);
  } finally {
    await prisma.$disconnect();
  }
}

applyMigration();
