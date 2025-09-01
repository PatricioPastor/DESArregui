import { google } from 'googleapis';
import { format, parseISO, isAfter, isBefore, addDays, parse } from 'date-fns';
import type { 
  TelefonosTicketRecord, 
  SheetDataRaw, 
  TelefonosTicketsAnalytics,
  DemandProjection,
  StockAnalysis,
  TelefonosTicketsFilters 
} from './types';

// Helper function to normalize date format from DD/MM/YYYY HH:mm:ss to ISO string
function normalizeDateString(dateString: string): string {
  if (!dateString || dateString.trim() === '') {
    return '';
  }

  try {
    // Check if it's already in ISO format or similar
    if (dateString.includes('-') && dateString.length >= 10) {
      return dateString;
    }

    // Parse DD/MM/YYYY HH:mm:ss format
    // Example: "31/05/2024 14:55:20"
    const parsed = parse(dateString, 'dd/MM/yyyy HH:mm:ss', new Date());
    
    if (isNaN(parsed.getTime())) {
      // Try without time part: DD/MM/YYYY
      const parsedDateOnly = parse(dateString, 'dd/MM/yyyy', new Date());
      if (!isNaN(parsedDateOnly.getTime())) {
        return format(parsedDateOnly, 'yyyy-MM-dd');
      }
      console.warn('Unable to parse date:', dateString);
      return dateString; // Return original if can't parse
    }

    return format(parsed, 'yyyy-MM-dd HH:mm:ss');
  } catch (error) {
    console.warn('Error normalizing date:', dateString, error);
    return dateString; // Return original if error
  }
}

// Google Sheets API authentication (reuse from sheets.ts)
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

// Get data from TELEFONOS_TICKETS sheet range
export async function getTelefonosTicketsSheetData(range = 'TELEFONOS_TICKETS!A:G'): Promise<SheetDataRaw> {
  try {
    const sheets = await getGoogleSheetsAuth();
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range,
    });

    const data = response.data.values || [];
    
    if (data.length < 1) {
      return { headers: [], rows: [], totalRecords: 0, lastUpdated: new Date().toISOString() };
    }

    // First row is headers, rest are data
    const [headers, ...rows] = data;
    
    return {
      headers: headers as string[],
      rows: rows as string[][],
      totalRecords: rows.length,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error fetching TELEFONOS_TICKETS sheet data:', error);
    throw error;
  }
}

// Convert raw sheet row to TelefonosTicketRecord
export function convertRowToTelefonosTicketRecord(row: string[], headers: string[]): TelefonosTicketRecord {
  const record: Partial<TelefonosTicketRecord> = {};
  
  headers.forEach((header, index) => {
    const normalizedHeader = header.toLowerCase().trim();
    const value = row[index] || '';
    
    // Map headers to TELEFONOS_TICKETS interface fields (A-G columns)
    switch (normalizedHeader) {
      case 'issue_type':
      case 'issuetype':
      case 'tipo':
        record.issue_type = value;
        break;
      case 'key':
      case 'clave':
        record.key = value;
        break;
      case 'title':
      case 'titulo':
      case 'título':
        record.title = value;
        break;
      case 'label':
      case 'etiqueta':
        record.label = value;
        break;
      case 'enterprise':
      case 'empresa':
      case 'distribuidora':
        record.enterprise = value;
        break;
      case 'created':
      case 'creado':
      case 'fecha_creacion':
        record.created = normalizeDateString(value);
        break;
      case 'updated':
      case 'actualizado':
      case 'fecha_actualizacion':
        record.updated = normalizeDateString(value);
        break;
      default:
        console.log(`Unmapped TELEFONOS_TICKETS header: "${header}" (normalized: "${normalizedHeader}")`);
        break;
    }
  });
  
  // Ensure all fields have default values
  return {
    issue_type: record.issue_type || '',
    key: record.key || '',
    title: record.title || '',
    label: record.label || '',
    enterprise: record.enterprise || '',
    created: record.created || '',
    updated: record.updated || '',
  };
}

// Get processed TELEFONOS_TICKETS records
export async function getTelefonosTicketRecords(): Promise<TelefonosTicketRecord[]> {
  try {
    const sheetData = await getTelefonosTicketsSheetData();
    
    console.log('TELEFONOS_TICKETS headers received:', sheetData.headers);
    console.log('Number of ticket rows:', sheetData.rows.length);
    
    const records = sheetData.rows.map((row, index) => {
      if (index === 0) {
        console.log('First ticket row data:', row);
        console.log('Row length:', row.length, 'Headers length:', sheetData.headers.length);
      }
      return convertRowToTelefonosTicketRecord(row, sheetData.headers);
    });
    
    return records;
  } catch (error) {
    console.error('Error processing TELEFONOS_TICKETS records:', error);
    throw error;
  }
}

// Apply filters to ticket records
export function filterTelefonosTickets(
  records: TelefonosTicketRecord[], 
  filters: TelefonosTicketsFilters
): TelefonosTicketRecord[] {
  return records.filter(record => {
    // Date range filter
    if (filters.dateRange) {
      try {
        // The record.created is now normalized to YYYY-MM-DD HH:mm:ss or YYYY-MM-DD format
        let recordDate;
        
        if (record.created.includes(' ')) {
          // Has time component: YYYY-MM-DD HH:mm:ss
          recordDate = parseISO(record.created.split(' ')[0]); // Take only date part
        } else {
          // Only date: YYYY-MM-DD
          recordDate = parseISO(record.created);
        }
        
        const startDate = parseISO(filters.dateRange.start);
        const endDate = parseISO(filters.dateRange.end);
        
        // Check if record date is within the range (inclusive)
        if (isBefore(recordDate, startDate) || isAfter(recordDate, endDate)) {
          return false;
        }
      } catch (error) {
        console.warn('Error parsing date for record:', record.key, 'created:', record.created, error);
        return false;
      }
    }

    // Enterprise filter
    if (filters.enterprise && filters.enterprise.length > 0) {
      if (!filters.enterprise.includes(record.enterprise)) {
        return false;
      }
    }

    // Issue type filter
    if (filters.issueType && filters.issueType.length > 0) {
      if (!filters.issueType.includes(record.issue_type)) {
        return false;
      }
    }

    // Label filter
    if (filters.label && filters.label.length > 0) {
      if (!filters.label.includes(record.label)) {
        return false;
      }
    }

    // Keyword search filter
    if (filters.searchKeyword) {
      const keyword = filters.searchKeyword.toLowerCase();
      const searchableText = [
        record.title,
        record.key,
        record.label,
        record.enterprise,
        record.issue_type
      ].join(' ').toLowerCase();
      
      if (!searchableText.includes(keyword)) {
        return false;
      }
    }

    return true;
  });
}

// Calculate analytics for TELEFONOS_TICKETS dashboard
export function calculateTelefonosTicketsAnalytics(
  records: TelefonosTicketRecord[],
  filters?: TelefonosTicketsFilters
): TelefonosTicketsAnalytics {
  // Apply filters if provided
  const filteredRecords = filters ? filterTelefonosTickets(records, filters) : records;

  // Basic counts by category
  const byEnterprise: { [key: string]: number } = {};
  const byIssueType: { [key: string]: number } = {};
  const byLabel: { [key: string]: number } = {};
  const titleCounts: { [key: string]: number } = {};

  filteredRecords.forEach(record => {
    // Count by enterprise
    byEnterprise[record.enterprise] = (byEnterprise[record.enterprise] || 0) + 1;
    
    // Count by issue type
    byIssueType[record.issue_type] = (byIssueType[record.issue_type] || 0) + 1;
    
    // Count by label
    byLabel[record.label] = (byLabel[record.label] || 0) + 1;
    
    // Count by title for top issues
    titleCounts[record.title] = (titleCounts[record.title] || 0) + 1;
  });

  // Generate time series data
  const timeSeriesData = generateTimeSeriesData(filteredRecords);

  // Generate demand projections
  const demandProjections = generateDemandProjections(byEnterprise, filteredRecords);

  // Generate stock analysis
  const stockAnalysis = generateStockAnalysis(byEnterprise, byIssueType);

  // Get top issues
  const topIssues = Object.entries(titleCounts)
    .map(([title, count]) => ({
      title,
      count,
      percentage: Math.round((count / filteredRecords.length) * 100)
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalTickets: filteredRecords.length,
    byEnterprise,
    byIssueType,
    byLabel,
    timeSeriesData,
    demandProjections,
    stockAnalysis,
    topIssues
  };
}

// Generate time series data for charts
function generateTimeSeriesData(records: TelefonosTicketRecord[]): { date: string; count: number }[] {
  const dateCounts: { [key: string]: number } = {};
  
  records.forEach(record => {
    try {
      let date;
      if (record.created.includes(' ')) {
        // Has time component: YYYY-MM-DD HH:mm:ss
        date = record.created.split(' ')[0]; // Take only date part
      } else {
        // Only date: YYYY-MM-DD
        date = record.created;
      }
      
      // Validate the date format
      const parsedDate = parseISO(date);
      if (!isNaN(parsedDate.getTime())) {
        const formattedDate = format(parsedDate, 'yyyy-MM-dd');
        dateCounts[formattedDate] = (dateCounts[formattedDate] || 0) + 1;
      }
    } catch (error) {
      console.warn('Error parsing date for time series:', record.created, error);
    }
  });

  return Object.entries(dateCounts)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// Generate demand projections based on ticket patterns
function generateDemandProjections(
  enterpriseCounts: { [key: string]: number },
  records: TelefonosTicketRecord[]
): DemandProjection[] {
  return Object.entries(enterpriseCounts).map(([enterprise, currentDemand]) => {
    // Simple projection based on recent growth trends
    const growthRate = calculateGrowthRate(enterprise, records);
    const projectedDemand = Math.round(currentDemand * (1 + growthRate));
    
    let confidence: 'high' | 'medium' | 'low' = 'medium';
    if (currentDemand > 50) confidence = 'high';
    if (currentDemand < 10) confidence = 'low';

    const recommendations = generateRecommendations(currentDemand, growthRate, enterprise);

    return {
      enterprise,
      currentDemand,
      projectedDemand,
      growthRate: Math.round(growthRate * 100),
      confidence,
      recommendations
    };
  });
}

// Calculate growth rate for demand projections
function calculateGrowthRate(enterprise: string, records: TelefonosTicketRecord[]): number {
  try {
    // Get records for this enterprise sorted by date
    const enterpriseRecords = records
      .filter(r => r.enterprise === enterprise)
      .map(r => {
        let dateStr = r.created;
        if (dateStr.includes(' ')) {
          dateStr = dateStr.split(' ')[0]; // Take only date part
        }
        return { ...r, parsedDate: parseISO(dateStr) };
      })
      .filter(r => !isNaN(r.parsedDate.getTime())) // Filter out invalid dates
      .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());

    if (enterpriseRecords.length < 2) return 0.1; // Default 10% growth

    // Calculate weekly averages for trend analysis
    const now = new Date();
    const oneWeekAgo = addDays(now, -7);
    const twoWeeksAgo = addDays(now, -14);

    const recentWeek = enterpriseRecords.filter(r => isAfter(r.parsedDate, oneWeekAgo)).length;
    const previousWeek = enterpriseRecords.filter(r => 
      isAfter(r.parsedDate, twoWeeksAgo) && isBefore(r.parsedDate, oneWeekAgo)
    ).length;

    if (previousWeek === 0) return 0.1; // Default growth

    return (recentWeek - previousWeek) / previousWeek;
  } catch (error) {
    console.warn('Error calculating growth rate for', enterprise);
    return 0.1; // Default 10% growth
  }
}

// Generate recommendations based on demand and growth
function generateRecommendations(
  currentDemand: number, 
  growthRate: number, 
  enterprise: string
): string[] {
  const recommendations: string[] = [];

  if (growthRate > 0.3) {
    recommendations.push(`Alto crecimiento detectado (+${Math.round(growthRate * 100)}%) - Aumentar stock preventivo`);
    recommendations.push('Revisar capacidad de soporte para demanda creciente');
  } else if (growthRate < -0.2) {
    recommendations.push('Demanda decreciente - Optimizar asignación de recursos');
  }

  if (currentDemand > 100) {
    recommendations.push('Volumen alto de tickets - Considerar automatización');
    recommendations.push('Implementar categorización automática de incidencias');
  } else if (currentDemand < 5) {
    recommendations.push('Demanda baja - Verificar cobertura de servicios');
  }

  if (enterprise.includes('EDEN') || enterprise.includes('EDEA')) {
    recommendations.push('Distribuidora regional - Coordinar con oficinas locales');
  }

  if (recommendations.length === 0) {
    recommendations.push('Mantener niveles actuales de stock y soporte');
  }

  return recommendations;
}

// Generate stock analysis based on ticket patterns
function generateStockAnalysis(
  enterpriseCounts: { [key: string]: number },
  issueTypeCounts: { [key: string]: number }
): StockAnalysis[] {
  return Object.entries(enterpriseCounts).map(([enterprise, ticketCount]) => {
    // Estimate required stock based on ticket volume and issue types
    const hardwareIssues = Object.entries(issueTypeCounts)
      .filter(([issueType]) => 
        issueType.toLowerCase().includes('hardware') ||
        issueType.toLowerCase().includes('dispositivo') ||
        issueType.toLowerCase().includes('equipo')
      )
      .reduce((sum, [_, count]) => sum + count, 0);

    const requiredStock = Math.ceil(ticketCount * 0.3 + hardwareIssues * 0.5); // Estimation formula
    const currentStock = Math.floor(requiredStock * 0.7); // Simulate current stock at 70%
    const shortage = Math.max(0, requiredStock - currentStock);

    let priority: 'critical' | 'high' | 'medium' | 'low' = 'medium';
    if (shortage > requiredStock * 0.5) priority = 'critical';
    else if (shortage > requiredStock * 0.3) priority = 'high';
    else if (shortage > requiredStock * 0.1) priority = 'medium';
    else priority = 'low';

    const suggestedActions = generateStockActions(shortage, requiredStock, enterprise);

    return {
      enterprise,
      requiredStock,
      currentStock,
      shortage,
      priority,
      suggestedActions
    };
  });
}

// Generate stock-related action recommendations
function generateStockActions(
  shortage: number, 
  requiredStock: number, 
  enterprise: string
): string[] {
  const actions: string[] = [];

  if (shortage > 0) {
    actions.push(`Reponer ${shortage} unidades para cubrir demanda`);
    
    if (shortage > requiredStock * 0.5) {
      actions.push('URGENTE: Stock crítico - Coordinar reposición inmediata');
      actions.push('Evaluar proveedores alternativos para acelerar entrega');
    } else if (shortage > requiredStock * 0.2) {
      actions.push('Planificar reposición en próxima semana');
      actions.push('Revisar proveedores para optimizar tiempo de entrega');
    }
  } else {
    actions.push('Stock adecuado - Mantener niveles actuales');
  }

  if (enterprise.includes('EDEN') || enterprise.includes('EDEA')) {
    actions.push('Coordinar con centro de distribución regional');
  }

  return actions;
}

// Get unique values for filter dropdowns
export function getTelefonosTicketsFilterOptions(records: TelefonosTicketRecord[]) {
  const enterprises = [...new Set(records.map(r => r.enterprise))].filter(Boolean).sort();
  const issueTypes = [...new Set(records.map(r => r.issue_type))].filter(Boolean).sort();
  const labels = [...new Set(records.map(r => r.label))].filter(Boolean).sort();

  return {
    enterprises,
    issueTypes,
    labels
  };
}