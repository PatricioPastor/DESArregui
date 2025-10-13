const { PrismaClient } = require('./src/generated/prisma');

const prisma = new PrismaClient();

async function checkDatabaseStructure() {
  try {
    console.log('🔍 Verificando estructura de la base de datos...\n');

    // Verificar estructura de la tabla assignment
    console.log('📋 Verificando tabla assignment:');
    try {
      const assignmentColumns = await prisma.$queryRaw`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_schema = 'phones' 
        AND table_name = 'assignment' 
        ORDER BY ordinal_position;
      `;
      
      console.log('Columnas actuales en assignment:');
      assignmentColumns.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
      
      // Verificar si existen las nuevas columnas
      const requiredColumns = [
        'assignee_name',
        'assignee_phone', 
        'distributor_id',
        'delivery_location',
        'contact_details',
        'shipping_voucher_id',
        'expects_return',
        'return_device_imei',
        'soti_device_id',
        'status'
      ];
      
      const existingColumns = assignmentColumns.map(col => col.column_name);
      const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
      
      if (missingColumns.length > 0) {
        console.log('\n❌ Columnas faltantes en assignment:');
        missingColumns.forEach(col => console.log(`  - ${col}`));
      } else {
        console.log('\n✅ Todas las columnas requeridas están presentes en assignment');
      }
      
    } catch (error) {
      console.error('Error verificando tabla assignment:', error.message);
    }

    // Verificar estructura de la tabla soti_device
    console.log('\n📋 Verificando tabla soti_device:');
    try {
      const sotiColumns = await prisma.$queryRaw`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_schema = 'phones' 
        AND table_name = 'soti_device' 
        ORDER BY ordinal_position;
      `;
      
      const sotiColumnNames = sotiColumns.map(col => col.column_name);
      
      if (sotiColumnNames.includes('status')) {
        console.log('✅ Columna status existe en soti_device');
      } else {
        console.log('❌ Columna status falta en soti_device');
      }
      
    } catch (error) {
      console.error('Error verificando tabla soti_device:', error.message);
    }

    // Verificar foreign keys
    console.log('\n🔗 Verificando foreign keys:');
    try {
      const foreignKeys = await prisma.$queryRaw`
        SELECT 
          tc.constraint_name,
          tc.table_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'phones'
          AND tc.table_name = 'assignment';
      `;
      
      console.log('Foreign keys en assignment:');
      foreignKeys.forEach(fk => {
        console.log(`  - ${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`);
      });
      
      // Verificar si existen las FK requeridas
      const fkColumns = foreignKeys.map(fk => fk.column_name);
      const requiredFKs = ['soti_device_id', 'distributor_id'];
      const missingFKs = requiredFKs.filter(fk => !fkColumns.includes(fk));
      
      if (missingFKs.length > 0) {
        console.log('\n❌ Foreign keys faltantes:');
        missingFKs.forEach(fk => console.log(`  - ${fk}`));
      } else {
        console.log('\n✅ Todas las foreign keys requeridas están presentes');
      }
      
    } catch (error) {
      console.error('Error verificando foreign keys:', error.message);
    }

    // Verificar índices
    console.log('\n📊 Verificando índices:');
    try {
      const indexes = await prisma.$queryRaw`
        SELECT 
          indexname,
          tablename,
          indexdef
        FROM pg_indexes 
        WHERE schemaname = 'phones' 
        AND tablename IN ('assignment', 'soti_device')
        ORDER BY tablename, indexname;
      `;
      
      console.log('Índices existentes:');
      indexes.forEach(idx => {
        console.log(`  - ${idx.tablename}.${idx.indexname}`);
      });
      
    } catch (error) {
      console.error('Error verificando índices:', error.message);
    }

  } catch (error) {
    console.error('Error general:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseStructure();
