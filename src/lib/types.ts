// IMEI Device Record based on CSV columns A-N (lowercase as specified)
export interface IMEIRecord {
  imei: string;
  nombre_soti: string;
  id_soti: string;
  distribuidora_soti: string;
  nombre_red: string;
  ultima_conexion: string;
  modelo: string;
  distribuidora_e_tarifacion: string;
  linea_e_tarifacion: string;
  plan_e_tarifación: string;
  status_asignación: string;
  primera_conexion: string;
  ticket: string;
  observaciones: string;
}

// API Response types
export interface BaseSheetResponse {
  success: boolean;
  data?: IMEIRecord[];
  headers?: string[];
  totalRecords?: number;
  lastUpdated?: string;
  error?: string;
}

export interface SheetDataRaw {
  headers: string[];
  rows: string[][];
  totalRecords: number;
  lastUpdated: string;
}

// Stock Device Record (columns A-E)
export interface StockRecord {
  modelo: string;
  imei: string;
  distribuidora: string;
  asignado_a: string;
  ticket: string;
}

// Stock API Response types
export interface StockSheetResponse {
  success: boolean;
  data?: StockRecord[];
  headers?: string[];
  totalRecords?: number;
  lastUpdated?: string;
  error?: string;
}

// Utility type for converting raw sheet data to typed records
export type SheetRowToRecord<T> = (row: string[], headers: string[]) => T;