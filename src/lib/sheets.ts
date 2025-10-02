import { google } from 'googleapis';
import * as XLSX from 'xlsx';
import type { IMEIRecord, StockRecord } from './types';
import { SheetDataRaw } from '@/utils/types';

// Google Sheets API authentication with write permissions
export async function getGoogleSheetsAuth(writePermissions = false) {
  try {
    const scopes = writePermissions 
      ? ['https://www.googleapis.com/auth/spreadsheets']
      : ['https://www.googleapis.com/auth/spreadsheets.readonly'];

    const auth = await google.auth.getClient({
      credentials: {
        type: 'service_account',
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes,
    });

    return google.sheets({ version: 'v4', auth });
  } catch (error) {
    console.error('Error authenticating with Google Sheets:', error);
    throw new Error('Failed to authenticate with Google Sheets API');
  }
}

// Get data from a specific range in the sheet
export async function getSheetData(range: string) {
  try {
    const sheets = await getGoogleSheetsAuth();
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range,
    });

    return response.data.values || [];
  } catch (error) {
    console.error('Error fetching sheet data:', error);
    throw new Error(`Failed to fetch data from range: ${range}`);
  }
}


// Convert raw sheet row to IMEIRecord
export function convertRowToIMEIRecord(row: string[], headers: string[]): IMEIRecord {
  const record: Partial<IMEIRecord> = {};
  
  headers.forEach((header, index) => {
    const normalizedHeader = header.toLowerCase().trim();
    const value = row[index] || '';
    
    // Map headers to our interface fields - handle exact column names from CSV
    switch (normalizedHeader) {
      case 'imei':
        record.imei = value;
        break;
      case 'nombre_soti':
        record.nombre_soti = value;
        break;
      case 'id_soti':
        record.id_soti = value;
        break;
      case 'distribuidora_soti':
        record.distribuidora_soti = value;
        break;
      case 'nombre_red':
        record.nombre_red = value;
        break;
      case 'ultima_conexion':
        record.ultima_conexion = value;
        break;
      case 'modelo':
        record.modelo = value;
        break;
      case 'distribuidora_e_tarifacion':
        record.distribuidora_e_tarifacion = value;
        break;
      case 'linea_e_tarifacion':
        record.linea_e_tarifacion = value;
        break;
      case 'plan_e_tarifación':
        record.plan_e_tarifación = value;
        break;
      case 'status asignación':
      case 'status_asignación':
        record.status_asignación = value;
        break;
      case 'primera_conexion':
        record.primera_conexion = value;
        break;
      case 'ticket':
        record.ticket = value;
        break;
      case 'observaciones':
        record.observaciones = value;
        break;
      default:
        // Log unmapped headers for debugging
        console.log(`Unmapped header: "${header}" (normalized: "${normalizedHeader}")`);
        break;
    }
  });
  
  // Ensure all fields have default values
  return {
    imei: record.imei || '',
    nombre_soti: record.nombre_soti || '',
    id_soti: record.id_soti || '',
    distribuidora_soti: record.distribuidora_soti || '',
    nombre_red: record.nombre_red || '',
    ultima_conexion: record.ultima_conexion || '',
    modelo: record.modelo || '',
    distribuidora_e_tarifacion: record.distribuidora_e_tarifacion || '',
    linea_e_tarifacion: record.linea_e_tarifacion || '',
    plan_e_tarifación: record.plan_e_tarifación || '',
    status_asignación: record.status_asignación || '',
    primera_conexion: record.primera_conexion || '',
    ticket: record.ticket || '',
    observaciones: record.observaciones || '',
  };
}

export function convertRowToSOTIRecord(row: string[], headers: string[]): any {
  const record: any = {};
  
  headers.forEach((header, index) => {
    const normalizedHeader = header.toLowerCase().trim();
    const value = row[index] || '';
    
    // Map headers to SOTI fields - handle exact column names A-Q
    switch (normalizedHeader) {
      case 'nombre_dispositivo':
        record.nombre_dispositivo = value;
        break;
      case 'usuario_asignado':
        record.usuario_asignado = value;
        break;
      case 'modelo':
        record.modelo = value;
        break;
      case 'imei':
        record.imei = value;
        break;
      case 'ruta':
        record.ruta = value;
        break;
      case 'hora_registro':
        record.hora_registro = value;
        break;
      case 'hora_inscripcion':
        record.hora_inscripcion = value;
        break;
      case 'fecha_conexion':
        record.fecha_conexion = value;
        break;
      case 'fecha_desconexion':
        record.fecha_desconexion = value;
        break;
      case 'telefono':
        record.telefono = value;
        break;
      case 'bssid_red':
        record.bssid_red = value;
        break;
      case 'ssid_red':
        record.ssid_red = value;
        break;
      case 'id_ticket_jira':
        record.id_ticket_jira = value;
        break;
      case 'telefono_custom':
        record.telefono_custom = value;
        break;
      case 'correo_custom':
        record.correo_custom = value;
        break;
      case 'correo_android_enterprise':
        record.correo_android_enterprise = value;
        break;
      case 'ubicacion':
        record.ubicacion = value;
        break;
      default:
        // Log unmapped headers for debugging
        console.log(`Unmapped SOTI header: "${header}" (normalized: "${normalizedHeader}")`);
        break;
    }
  });
  
  return record;
}

// Get BASE sheet data specifically
export async function getBaseSheetData(): Promise<SheetDataRaw> {
  try {
    const data = await getSheetData('BASE!A:N'); // A to N covers all required IMEI data columns
    
    if (data.length < 3) {
      return { headers: [], rows: [], totalRecords: 0, lastUpdated: new Date().toISOString() };
    }

    // Skip first row (extra headers), use second row as headers, data starts from third row
    const [_extraHeaders, headers, ...rows] = data;
    
    return {
      headers: headers as string[],
      rows: rows as string[][],
      totalRecords: rows.length,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error fetching BASE sheet data:', error);
    throw error;
  }
}

export async function getSotiSheetData(): Promise<SheetDataRaw> {
  try {
    const data = await getSheetData('SOTI!A:Q'); 
    


    if (data.length < 3) {
      return { headers: [], rows: [], totalRecords: 0, lastUpdated: new Date().toISOString() };
    }

    // Skip first row (extra headers), use second row as headers, data starts from third row
    const [ headers, ...rows] = data;
    
    return {
      headers: headers as string[],
      rows: rows as string[][],
      totalRecords: rows.length,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error fetching BASE sheet data:', error);
    throw error;
  }
}

// Convert raw sheet row to StockRecord
export function convertRowToStockRecord(row: string[], headers: string[]): StockRecord {
  const record: Partial<StockRecord> = {};
  
  headers.forEach((header, index) => {
    const normalizedHeader = header.toLowerCase().trim();
    const value = row[index] || '';
    
    // Map headers to stock interface fields
    switch (normalizedHeader) {
      case 'modelo':
        record.modelo = value;
        break;
      case 'imei':
        record.imei = value;
        break;
      case 'distribuidora':
        record.distribuidora = value;
        break;
      case 'asignado_a':
        record.asignado_a = value;
        break;
      case 'ticket':
        record.ticket = value;
        break;
      default:
        console.log(`Unmapped stock header: "${header}" (normalized: "${normalizedHeader}")`);
        break;
    }
  });
  
  // Ensure all fields have default values
  return {
    modelo: record.modelo || '',
    imei: record.imei || '',
    distribuidora: record.distribuidora || '',
    asignado_a: record.asignado_a || '',
    ticket: record.ticket || '',
  };
}

// Get STOCK sheet data specifically (A-E columns)
export async function getStockSheetData(): Promise<SheetDataRaw> {
  try {
    const data = await getSheetData('STOCK!A:E'); // A to E covers stock data columns
    
    if (data.length < 3) {
      return { headers: [], rows: [], totalRecords: 0, lastUpdated: new Date().toISOString() };
    }

    
    const [headers, ...rows] = data;
    
    return {
      headers: headers as string[],
      rows: rows as string[][],
      totalRecords: rows.length,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error fetching STOCK sheet data:', error);
    throw error;
  }
}
export async function getRocioReportSheetData(): Promise<SheetDataRaw> {
  try {
    const data = await getSheetData('REPORTE_FINAL_ROCIO!A:F'); // A to F covers report data columns
    
    if (data.length < 1) {
      return { headers: [], rows: [], totalRecords: 0, lastUpdated: new Date().toISOString() };
    }

    
    const [headers, ...rows] = data;
    
    return {
      headers: headers as string[],
      rows: rows as string[][],
      totalRecords: rows.length,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error fetching Rocío report sheet data:', error);
    throw error;
  }
}

// Get processed Stock records
export async function getStockRecords(): Promise<StockRecord[]> {
  try {
    const sheetData = await getStockSheetData();
    
    // Debug: log the actual headers received
    console.log('Stock headers received from sheet:', sheetData.headers);
    console.log('Number of stock data rows:', sheetData.rows.length);
    
    // Process each row
    const records = sheetData.rows.map((row, index) => {
      if (index === 0) {
        // Debug: log first row mapping
        console.log('First stock row data:', row);
        console.log('Stock row length:', row.length, 'Headers length:', sheetData.headers.length);
      }
      return convertRowToStockRecord(row, sheetData.headers);
    });
    
    return records;
  } catch (error) {
    console.error('Error processing stock records:', error);
    throw error;
  }
}

// Get processed IMEI records
export async function getIMEIRecords(): Promise<IMEIRecord[]> {
  try {
    const sheetData = await getBaseSheetData();
    
    // Debug: log the actual headers received
    console.log('Headers received from sheet:', sheetData.headers);
    console.log('Number of data rows:', sheetData.rows.length);
    
    // Process each row
    const records = sheetData.rows.map((row, index) => {
      if (index === 0) {
        // Debug: log first row mapping
        console.log('First row data:', row);
        console.log('Row length:', row.length, 'Headers length:', sheetData.headers.length);
      }
      return convertRowToIMEIRecord(row, sheetData.headers);
    });
    
    return records;
  } catch (error) {
    console.error('Error processing IMEI records:', error);
    throw error;
  }
}

export async function getSOTIDevices(): Promise<any[]> {
  try {
    const sheetData = await getSotiSheetData();
    
    // Debug: log the actual headers received
    console.log('Headers received from sheet:', sheetData.headers);
    console.log('Number of data rows:', sheetData.rows.length);
    
    // Process each row
    const records = sheetData.rows.map((row, index) => {
      if (index === 0) {
        // Debug: log first row mapping
        console.log('First row data:', row);
        console.log('Row length:', row.length, 'Headers length:', sheetData.headers.length);
      }
      return convertRowToSOTIRecord(row, sheetData.headers);
    });
    
    return records;
  } catch (error) {
    console.error('Error processing SOTI records:', error);
    throw error;
  }
}



interface ProcessedRecord {
  index: number;
  data: { [key: string]: string };
}

interface ConflictGroup {
  key: string;
  value: string;
  records: ProcessedRecord[];
}

interface DuplicateAnalysis {
  records: ProcessedRecord[];
  duplicates: {
    imeis: Map<string, number[]>;
    numeros: Map<string, number[]>;
    dispositivos: Map<string, number[]>;
  };
  conflicts: {
    imeiConflicts: ConflictGroup[];
    numeroConflicts: ConflictGroup[];
    dispositivoConflicts: ConflictGroup[];
  };
}

export const processRows = (rows: string[][], headers: string[]): DuplicateAnalysis => {
  const records: ProcessedRecord[] = rows.map((row, index) => ({
    index,
    data: headers.reduce((acc, header, headerIndex) => {
      acc[header] = row[headerIndex] || '';
      return acc;
    }, {} as { [key: string]: string })
  }));

  // Maps para tracking duplicados
  const imeiMap = new Map<string, number[]>();
  const numeroMap = new Map<string, number[]>();
  const dispositivoMap = new Map<string, number[]>();

  // Poblar los maps
  records.forEach((record) => {
    const imei = record.data['equipo'] || '';
    const numero = record.data['numero'] || '';
    const dispositivo = record.data['nombre_dispositivo'] || '';

    if (imei) {
      if (!imeiMap.has(imei)) imeiMap.set(imei, []);
      imeiMap.get(imei)!.push(record.index);
    }

    if (numero) {
      if (!numeroMap.has(numero)) numeroMap.set(numero, []);
      numeroMap.get(numero)!.push(record.index);
    }

    if (dispositivo) {
      if (!dispositivoMap.has(dispositivo)) dispositivoMap.set(dispositivo, []);
      dispositivoMap.get(dispositivo)!.push(record.index);
    }
  });

  // Detectar conflictos (mismo valor, datos diferentes)
  const detectConflicts = (map: Map<string, number[]>, keyField: string): ConflictGroup[] => {
    const conflicts: ConflictGroup[] = [];
    
    map.forEach((indices, value) => {
      if (indices.length > 1) {
        const recordsForValue = indices.map(i => records[i]);
        
        // Verificar si hay datos diferentes para el mismo valor
        const firstRecord = recordsForValue[0];
        const hasConflicts = recordsForValue.some(record => 
          Object.keys(record.data).some(key => 
            key !== keyField && record.data[key] !== firstRecord.data[key]
          )
        );

        if (hasConflicts) {
          conflicts.push({
            key: keyField,
            value,
            records: recordsForValue
          });
        }
      }
    });

    return conflicts;
  };

  return {
    records,
    duplicates: {
      imeis: imeiMap,
      numeros: numeroMap,
      dispositivos: dispositivoMap
    },
    conflicts: {
      imeiConflicts: detectConflicts(imeiMap, 'equipo'),
      numeroConflicts: detectConflicts(numeroMap, 'numero'),
      dispositivoConflicts: detectConflicts(dispositivoMap, 'nombre_dispositivo')
    }
  };
}

// Create XLSX workbook with phone number deduplication analysis
export function createPhoneDeduplicationWorkbook(processing: any, headers: string[], originalRecords: ProcessedRecord[]) {
  const workbook = XLSX.utils.book_new();

  // Hoja 1: Todos los registros deduplicados por teléfono
  const deduplicatedData = [
    headers,
    ...processing.deduplicatedRecords.map((record: ProcessedRecord) => 
      headers.map(header => record.data[header] || '')
    )
  ];
  const deduplicatedSheet = XLSX.utils.aoa_to_sheet(deduplicatedData);
  XLSX.utils.book_append_sheet(workbook, deduplicatedSheet, 'Registros_Deduplicados');

  // Hoja 2: Resumen y Estadísticas
  const uniqueIMEIs = new Set(
    processing.deduplicatedRecords
      .map((record: ProcessedRecord) => record.data['equipo'])
      .filter((imei: string) => imei && imei !== '' && imei.toLowerCase() !== 'n/a')
  );

  const uniqueNumbers = new Set(
    processing.deduplicatedRecords
      .map((record: ProcessedRecord) => record.data['numero'])
      .filter((numero: string) => numero && numero !== '' && numero.toLowerCase() !== 'n/a')
  );

  const summaryData = [
    ['RESUMEN - ANÁLISIS DEDUPLICACIÓN POR TELÉFONO'],
    [''],
    ['ESTADÍSTICAS GENERALES:'],
    ['Total registros originales:', processing.originalCount],
    ['Total registros después de deduplicación:', processing.deduplicatedCount],
    ['Duplicados eliminados:', processing.removedDuplicates],
    [''],
    ['ESTADÍSTICAS DEDUPLICADAS:'],
    ['IMEIs únicos restantes:', uniqueIMEIs.size],
    ['Teléfonos únicos restantes:', uniqueNumbers.size],
    [''],
    ['IMEIS ÚNICOS RESTANTES:'],
    ['IMEI'],
    ...Array.from(uniqueIMEIs).map(imei => [imei]),
    [''],
    ['TELÉFONOS ÚNICOS RESTANTES:'],
    ['Número de Teléfono'],
    ...Array.from(uniqueNumbers).map(numero => [numero])
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen_Estadisticas');

  // Hoja 3: Registros eliminados (duplicados por teléfono)
  const eliminatedRecords = originalRecords.filter(originalRecord => 
    !processing.deduplicatedRecords.some((dedupRecord: ProcessedRecord) => 
      dedupRecord.index === originalRecord.index
    )
  );

  const eliminatedData = [
    headers,
    ...eliminatedRecords.map(record => 
      headers.map(header => record.data[header] || '')
    )
  ];

  const eliminatedSheet = XLSX.utils.aoa_to_sheet(eliminatedData);
  XLSX.utils.book_append_sheet(workbook, eliminatedSheet, 'Registros_Eliminados');

  return workbook;
}

// Create new sheet in existing Google Sheets document
export async function createNewSheet(sheetName: string) {
  try {
    const sheets = await getGoogleSheetsAuth(true);
    
    // First, check if sheet already exists
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
    });

    const existingSheet = spreadsheet.data.sheets?.find(
      sheet => sheet.properties?.title === sheetName
    );

    if (existingSheet) {
      // Clear existing sheet
      await sheets.spreadsheets.values.clear({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: `${sheetName}!A:Z`,
      });
      return existingSheet.properties?.sheetId;
    }

    // Create new sheet
    const response = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      requestBody: {
        requests: [{
          addSheet: {
            properties: {
              title: sheetName,
            }
          }
        }]
      }
    });

    return response.data.replies?.[0]?.addSheet?.properties?.sheetId;
  } catch (error) {
    console.error('Error creating new sheet:', error);
    throw error;
  }
}

// Upload analysis data to Google Sheets
export async function uploadAnalysisToSheet(analysis: DuplicateAnalysis, headers: string[]) {
  try {
    const sheets = await getGoogleSheetsAuth(true);
    const sheetName = 'ROCIO_ANALISIS_CLAUDE';
    
    await createNewSheet(sheetName);

    // Prepare data for upload
    const summaryData = [
      ['ANÁLISIS DE DUPLICADOS - ROCIO REPORT'],
      [''],
      ['RESUMEN:'],
      [`Total de registros: ${analysis.records.length}`],
      [`IMEIs duplicados: ${Array.from(analysis.duplicates.imeis.values()).filter(arr => arr.length > 1).length}`],
      [`Números duplicados: ${Array.from(analysis.duplicates.numeros.values()).filter(arr => arr.length > 1).length}`],
      [`Dispositivos duplicados: ${Array.from(analysis.duplicates.dispositivos.values()).filter(arr => arr.length > 1).length}`],
      [`Conflictos IMEI: ${analysis.conflicts.imeiConflicts.length}`],
      [`Conflictos Número: ${analysis.conflicts.numeroConflicts.length}`],
      [`Conflictos Dispositivo: ${analysis.conflicts.dispositivoConflicts.length}`],
      [''],
      ['DUPLICADOS DE IMEIs:'],
      ['IMEI', 'Índices', 'Cantidad'],
      ...Array.from(analysis.duplicates.imeis.entries())
        .filter(([_, indices]) => indices.length > 1)
        .map(([imei, indices]) => [imei, indices.join(', '), indices.length])
    ];

    // Upload data to sheet
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `${sheetName}!A1`,
      valueInputOption: 'RAW',
      requestBody: {
        values: summaryData
      }
    });

    console.log(`Analysis uploaded to sheet: ${sheetName}`);
    return sheetName;
  } catch (error) {
    console.error('Error uploading analysis to sheet:', error);
    throw error;
  }
}

// Deduplicate all records by phone number
export function deduplicateByPhoneNumber(analysis: DuplicateAnalysis, headers: string[]) {
  // Get ALL records (not just AE)
  const allRecords = analysis.records;

  // Group ALL records by phone number to identify duplicates
  const phoneGroups = new Map<string, ProcessedRecord[]>();
  
  allRecords.forEach(record => {
    // Create key based on phone number (numero) - this will group duplicates by phone number
    const phoneNumber = record.data['numero'] || '';
    
    // Skip empty phone numbers
    if (phoneNumber && phoneNumber.toLowerCase() !== 'n/a' && phoneNumber.trim() !== '') {
      if (!phoneGroups.has(phoneNumber)) {
        phoneGroups.set(phoneNumber, []);
      }
      phoneGroups.get(phoneNumber)!.push(record);
    }
  });

  // Keep only the first occurrence of each duplicate group
  const deduplicatedRecords: ProcessedRecord[] = [];
  
  phoneGroups.forEach((records) => {
    if (records.length > 1) {
      // Select best record based on criteria: fewer N/A values, prioritizing nombre_dispositivo, then legajo
      const bestRecord = records.reduce((best, current) => {
        // Count N/A values (case insensitive)
        const bestNACount = Object.values(best.data).filter(v => 
          !v || v.toLowerCase() === 'n/a' || v.toLowerCase() === 'na' || v.trim() === ''
        ).length;
        
        const currentNACount = Object.values(current.data).filter(v => 
          !v || v.toLowerCase() === 'n/a' || v.toLowerCase() === 'na' || v.trim() === ''
        ).length;
        
        // Priority 1: Record with fewer N/A values overall
        if (currentNACount !== bestNACount) {
          return currentNACount < bestNACount ? current : best;
        }
        
        // Priority 2: Record with valid nombre_dispositivo (not N/A)
        const bestDeviceName = best.data['nombre_dispositivo'];
        const currentDeviceName = current.data['nombre_dispositivo'];
        
        const bestDeviceValid = bestDeviceName && 
          bestDeviceName.toLowerCase() !== 'n/a' && 
          bestDeviceName.toLowerCase() !== 'na' && 
          bestDeviceName.trim() !== '';
        
        const currentDeviceValid = currentDeviceName && 
          currentDeviceName.toLowerCase() !== 'n/a' && 
          currentDeviceName.toLowerCase() !== 'na' && 
          currentDeviceName.trim() !== '';
        
        if (currentDeviceValid !== bestDeviceValid) {
          return currentDeviceValid ? current : best;
        }
        
        // Priority 3: Record with valid legajo_usuario (lower priority)
        const bestLegajo = best.data['legajo_usuario'];
        const currentLegajo = current.data['legajo_usuario'];
        
        const bestLegajoValid = bestLegajo && 
          bestLegajo.toLowerCase() !== 'n/a' && 
          bestLegajo.toLowerCase() !== 'na' && 
          bestLegajo.trim() !== '';
        
        const currentLegajoValid = currentLegajo && 
          currentLegajo.toLowerCase() !== 'n/a' && 
          currentLegajo.toLowerCase() !== 'na' && 
          currentLegajo.trim() !== '';
        
        if (currentLegajoValid !== bestLegajoValid) {
          return currentLegajoValid ? current : best;
        }
        
        // If all criteria are equal, return first one
        return best;
      });
      
      deduplicatedRecords.push(bestRecord);
    } else {
      // Not a duplicate, keep as-is
      deduplicatedRecords.push(records[0]);
    }
  });

  // Add records that don't have phone numbers (to preserve all data)
  const recordsWithoutPhones = allRecords.filter(record => {
    const phoneNumber = record.data['numero'] || '';
    return !phoneNumber || phoneNumber.toLowerCase() === 'n/a' || phoneNumber.trim() === '';
  });

  const allDeduplicatedRecords = [...deduplicatedRecords, ...recordsWithoutPhones];

  return {
    deduplicatedRecords: allDeduplicatedRecords,
    originalCount: allRecords.length,
    deduplicatedCount: allDeduplicatedRecords.length,
    removedDuplicates: allRecords.length - allDeduplicatedRecords.length
  };
}

// Upload deduplicated AE data to nuevo_reporte sheet
export async function uploadDeduplicatedAEData(deduplicatedAE: ProcessedRecord[], headers: string[]) {
  try {
    const sheets = await getGoogleSheetsAuth(true);
    const sheetName = 'nuevo_reporte';
    
    await createNewSheet(sheetName);

    // Prepare data for upload - headers + deduplicated AE data
    const uploadData = [
      headers,
      ...deduplicatedAE.map(record => 
        headers.map(header => record.data[header] || '')
      )
    ];

    // Upload data to sheet
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `${sheetName}!A1`,
      valueInputOption: 'RAW',
      requestBody: {
        values: uploadData
      }
    });

    console.log(`Deduplicated AE data uploaded to sheet: ${sheetName}`);
    console.log(`Records uploaded: ${deduplicatedAE.length}`);
    
    return {
      sheetName,
      recordsUploaded: deduplicatedAE.length,
      success: true
    };
  } catch (error) {
    console.error('Error uploading deduplicated AE data:', error);
    throw error;
  }
}