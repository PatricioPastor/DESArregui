/**
 * Script para migrar SIMs desde Excel a la base de datos
 * 
 * Uso:
 *   bun run scripts/migrate-sims.ts <ruta-al-excel>
 * 
 * Ejemplo:
 *   bun run scripts/migrate-sims.ts prisma/export_sims.xlsx
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

interface SimRecordInput {
  ICC: string;
  IP?: string;
  Estado: string;
  Empresa: string;
}

interface SyncResponse {
  success: boolean;
  processed: number;
  created: number;
  updated: number;
  deactivated: number;
  createdDistributors: number;
  errors: number;
  error?: string;
  details?: {
    errors: Array<{
      sim: Partial<SimRecordInput>;
      error: string;
    }>;
  };
}

async function migrateSimsFromExcel(excelPath: string, apiUrl: string = 'http://localhost:3000') {
  console.log(`📖 Leyendo archivo Excel: ${excelPath}`);

  // Verificar que el archivo existe
  if (!fs.existsSync(excelPath)) {
    console.error(`❌ Error: El archivo ${excelPath} no existe`);
    process.exit(1);
  }

  // Leer el archivo Excel
  const workbook = XLSX.readFile(excelPath);
  
  // Buscar la hoja "sims" o usar la primera hoja
  const sheetName = workbook.SheetNames.find(name => 
    name.toLowerCase().includes('sim') || name.toLowerCase() === 'sims'
  ) || workbook.SheetNames[0];

  console.log(`📄 Usando hoja: "${sheetName}"`);

  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet) as any[];

  console.log(`📊 Total de filas encontradas: ${data.length}`);

  // Mapear a formato SimRecordInput
  const sims: SimRecordInput[] | any[] = data
    .map((row, index) => {
      // Intentar diferentes variaciones de nombres de columnas
      const icc = row.ICC || row.icc || row['ICC'] || row['icc'];
      const ip = row.IP || row.ip || row['IP'] || row['ip'];
      const estado = row.Estado || row.estado || row['Estado'] || row['estado'] || 'Inventario';
      const empresa = row.Empresa || row.empresa || row['Empresa'] || row['empresa'];

      if (!icc || String(icc).trim() === '') {
        console.warn(`⚠️  Fila ${index + 2}: Sin ICC, se omite`);
        return null;
      }

      if (!empresa || String(empresa).trim() === '') {
        console.warn(`⚠️  Fila ${index + 2}: Sin Empresa, se omite`);
        return null;
      }

      return {
        ICC: String(icc).trim(),
        IP: ip ? String(ip).trim() : undefined,
        Estado: String(estado).trim(),
        Empresa: String(empresa).trim(),
      };
    })
    .filter((sim): sim is SimRecordInput | any => sim !== null);

  console.log(`✅ SIMs válidas después de filtrar: ${sims.length}`);

  if (sims.length === 0) {
    console.error('❌ No se encontraron SIMs válidas para migrar');
    process.exit(1);
  }

  // Mostrar estadísticas
  const empresas = new Set(sims.map(s => s.Empresa));
  const estados = new Set(sims.map(s => s.Estado));
  
  console.log('\n📈 Estadísticas:');
  console.log(`   - Total SIMs: ${sims.length}`);
  console.log(`   - Empresas únicas: ${empresas.size}`);
  console.log(`   - Estados únicos: ${estados.size}`);
  console.log(`   - Empresas encontradas:`, Array.from(empresas).join(', '));

  // Confirmar antes de continuar
  console.log(`\n🚀 Enviando ${sims.length} SIMs a ${apiUrl}/api/sync/sims...`);

  try {
    const response = await fetch(`${apiUrl}/api/sync/sims`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sims }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Error HTTP ${response.status}: ${errorText}`);
      process.exit(1);
    }

    const result: SyncResponse = await response.json();

    console.log('\n✅ Migración completada!');
    console.log(`   - Procesadas: ${result.processed}`);
    console.log(`   - Creadas: ${result.created}`);
    console.log(`   - Actualizadas: ${result.updated}`);
    console.log(`   - Desactivadas: ${result.deactivated}`);
    console.log(`   - Distributors creados: ${result.createdDistributors}`);
    console.log(`   - Errores: ${result.errors}`);

    if (result.errors > 0 && result.details?.errors) {
      console.log('\n⚠️  Errores encontrados:');
      result.details.errors.slice(0, 10).forEach((err, idx) => {
        console.log(`   ${idx + 1}. ${err.error}`);
        console.log(`      SIM: ICC=${err.sim.ICC}, Empresa=${err.sim.Empresa}`);
      });
      if (result.details.errors.length > 10) {
        console.log(`   ... y ${result.details.errors.length - 10} errores más`);
      }
    }

    if (!result.success) {
      console.log('\n⚠️  La migración tuvo algunos errores. Revisa los detalles arriba.');
      process.exit(1);
    }

    console.log('\n🎉 ¡Migración exitosa!');
  } catch (error) {
    console.error('\n❌ Error al enviar datos:', error);
    if (error instanceof Error) {
      console.error(`   Mensaje: ${error.message}`);
    }
    process.exit(1);
  }
}

// Ejecutar script
const excelPath = process.argv[2];
const apiUrl = process.argv[3] || 'http://localhost:3000';

if (!excelPath) {
  console.error('❌ Error: Debes proporcionar la ruta al archivo Excel');
  console.error('\nUso:');
  console.error('  bun run scripts/migrate-sims.ts <ruta-al-excel> [api-url]');
  console.error('\nEjemplo:');
  console.error('  bun run scripts/migrate-sims.ts prisma/export_sims.xlsx');
  console.error('  bun run scripts/migrate-sims.ts prisma/export_sims.xlsx http://localhost:3000');
  process.exit(1);
}

migrateSimsFromExcel(excelPath, apiUrl).catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});

