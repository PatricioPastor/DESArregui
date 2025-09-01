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

// TELEFONOS_TICKETS Record based on columns A-G
export interface TelefonosTicketRecord {
  issue_type: string;
  key: string;
  title: string;
  label: string;
  enterprise: string;
  created: string;
  updated: string;
}

// TELEFONOS_TICKETS API Response types
export interface TelefonosTicketsResponse {
  success: boolean;
  data?: TelefonosTicketRecord[];
  headers?: string[];
  totalRecords?: number;
  lastUpdated?: string;
  analytics?: TelefonosTicketsAnalytics;
  error?: string;
}

// Analytics data for TELEFONOS_TICKETS dashboard
export interface TelefonosTicketsAnalytics {
  totalTickets: number;
  byEnterprise: { [key: string]: number };
  byIssueType: { [key: string]: number };
  byLabel: { [key: string]: number };
  timeSeriesData: { date: string; count: number }[];
  demandProjections: DemandProjection[];
  stockAnalysis: StockAnalysis[];
  topIssues: { title: string; count: number; percentage: number }[];
}

// Demand projection interface
export interface DemandProjection {
  enterprise: string;
  currentDemand: number;
  projectedDemand: number;
  growthRate: number;
  confidence: 'high' | 'medium' | 'low';
  recommendations: string[];
}

// Stock analysis interface
export interface StockAnalysis {
  enterprise: string;
  requiredStock: number;
  currentStock: number;
  shortage: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  suggestedActions: string[];
}

// Filtering options for TELEFONOS_TICKETS
export interface TelefonosTicketsFilters {
  dateRange?: {
    start: string;
    end: string;
  };
  enterprise?: string[];
  issueType?: string[];
  label?: string[];
  searchKeyword?: string;
}

// Utility type for converting raw sheet data to typed records
export type SheetRowToRecord<T> = (row: string[], headers: string[]) => T;