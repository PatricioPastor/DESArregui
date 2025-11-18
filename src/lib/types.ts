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
export interface SOTIRecord {
  nombre_dispositivo:string  
  usuario_asignado:string    
  modelo:string
  imei:string
  ruta:string
  hora_registro:string       
  hora_inscripcion:string    
  fecha_conexion:string      
  fecha_desconexion:string   
  telefono:string
  bssid_red:string
  ssid_red:string
  id_ticket_jira:string      
  telefono_custom:string     
  correo_custom:string       
  correo_android_enter:string
  ubicacion:string
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

// Stock Device Record from Google Sheets (columns A-E)
export interface StockRecord {
  modelo: string;
  imei: string;
  distribuidora: string;
  asignado_a: string;
  ticket: string;
}
// Inventory Device Record (database-backed)
// Maps to Prisma's device_status enum: NEW, ASSIGNED, USED, REPAIRED, NOT_REPAIRED, LOST, DISPOSED, SCRAPPED, DONATED
export type InventoryStatus =
  | 'NEW'
  | 'ASSIGNED'
  | 'USED'
  | 'REPAIRED'
  | 'NOT_REPAIRED'
  | 'LOST'
  | 'DISPOSED'
  | 'SCRAPPED'
  | 'DONATED';

export interface InventoryStatusSummary {
  status: InventoryStatus;
  label: string;
  count: number;
}

export interface InventoryModelOption {
  id: string;
  label: string;
}

export interface SOTIDeviceInfo {
  device_name?: string;
  assigned_user?: string;
  connection_date?: string;
  disconnection_date?: string;
  is_in_soti: boolean;
  last_sync?: string;
}

export interface InventoryRecord {
  id: string;
  imei: string;
  status: InventoryStatus;
  status_label: string;
  estado: string;
    modelo: string;
  model_id: string;
  is_backup?: boolean;
  backup_distributor_id?: string | null;
  backup_distributor?: {
    id: string;
    name: string;
  } | null;
  model_details: {
    id: string;
    brand: string;
    model: string;
    storage_gb: number | null;
    color: string | null;
    display_name: string;
  };
  distribuidora: string;
  distribuidora_id?: string | null;
  asignado_a: string;
  ticket: string;
  is_assigned: boolean;
  created_at: string;
  updated_at: string;
  last_assignment_at?: string | null;
  assignments_count: number;
  soti_info: SOTIDeviceInfo;
  raw?: any; // Raw database record for additional data
}

// Inventory API Response types
export interface InventoryResponse {
  success: boolean;
  data?: InventoryRecord[];
  headers?: string[];
  totalRecords?: number;
  lastUpdated?: string;
  statusSummary?: InventoryStatusSummary[];
  modelOptions?: InventoryModelOption[];
  error?: string;
}

export interface TelefonosTicketRecord {
  issue_type: string;
  key: string;
  title: string;
  label: string;
  enterprise: string;
  created: string;
  updated: string;
  creator: string;
  status: string;
  category_status: string;
  replacement_type?: string | null;
  is_assignment?: boolean;
  is_replacement?: boolean;
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
  replacement_types: {
    ROBO: number;
    ROTURA: number;
    OBSOLETO: number;
    PERDIDA: number;
    SIN_ESPECIFICAR: number;
  };
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

// ==================== LLAMADOS TELEFÓNICOS MODULE ====================
// Ver docs/call_reports_module.md

export interface CallReportRecord {
  tipo: string;
  origen: string;
  destino: string;
  persona: string;
  inicio: string;
  duracion: number;
  categoria: string;
  resultado: string;
  operador: string;                // Operator who handled the call
}

// Monthly Summary for an operator
export interface OperatorMonthlySummary {
  operador: string;
  mes: string;  
  total_llamadas: number;
  duracion_total: number;  
  duracion_promedio: number;  
  llamadas_por_categoria: { [categoria: string]: number };
  llamadas_por_resultado: { [resultado: string]: number };
  llamadas_por_tipo: { [tipo: string]: number };
}

// Call Reports Analytics - KPIs and metrics
export interface CallReportsAnalytics {
  periodo: {
    inicio: string;
    fin: string;
  };
  metricas_globales: {
    total_llamadas: number;
    duracion_total: number;
    duracion_promedio: number;
    promedio_llamadas_diarias: number;
  };
  por_operador: OperatorMonthlySummary[];
  por_categoria: { [key: string]: number };
  por_resultado: { [key: string]: number };
  por_tipo: { [key: string]: number };
  tendencias_temporales: { 
    fecha: string; 
    llamadas: number; 
    duracion_total: number;
    duracion_promedio: number;
  }[];
  ranking_operadores: {
    operador: string;
    puntuacion: number;
    metricas: {
      volumen_llamadas: number;
      eficiencia_tiempo: number;
      variedad_categorias: number;
    };
  }[];
}

// Monthly Sheet Info - For handling multiple month sheets
export interface MonthlySheetInfo {
  nombre_hoja: string;  
  mes: number;  
  año: number;  
  total_registros: number;
  ultima_actualizacion: string;
}

// Call Reports API Response
export interface CallReportsResponse {
  success: boolean;
  data?: CallReportRecord[];
  analytics?: CallReportsAnalytics;
  hojas_disponibles?: MonthlySheetInfo[];
  headers?: string[];
  totalRecords?: number;
  lastUpdated?: string;
  error?: string;
}

// Filtering options for Call Reports
export interface CallReportsFilters {
  periodo?: {
    inicio: string;
    fin: string;
  };
  operadores?: string[];
  tipos?: string[];
  categorias?: string[];
  resultados?: string[];
  duracion_min?: number;
  duracion_max?: number;
  searchKeyword?: string;
}



