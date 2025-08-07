import { google } from 'googleapis';
import type { IMEIRecord, StockRecord, SheetDataRaw } from './types';

// Google Sheets API authentication
export async function getGoogleSheetsAuth() {
  try {
    const auth = await google.auth.getClient({
      credentials: {
        type: 'service_account',
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
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