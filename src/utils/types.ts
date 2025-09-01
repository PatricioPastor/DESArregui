// types.ts
export interface TelefonosTicketRecord {
  issue_type: string;
  key: string;
  title: string;
  label: string;
  enterprise: string;
  created: string; // Normalized to YYYY-MM-DD or YYYY-MM-DD HH:mm:ss
  updated: string; // Normalized to YYYY-MM-DD or YYYY-MM-DD HH:mm:ss
}

export interface SheetDataRaw {
  headers: string[];
  rows: string[][];
  totalRecords: number;
  lastUpdated: string;
}

export interface TelefonosTicketsFilters {
  dateRange?: { start: string; end: string };
  enterprise?: string[];
  issueType?: string[];
  label?: string[];
  searchKeyword?: string;
}

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

export interface DemandProjection {
  enterprise: string;
  currentDemand: number;
  projectedDemand: number;
  growthRate: number;
  confidence: 'high' | 'medium' | 'low';
  recommendations: string[];
}

export interface StockAnalysis {
  enterprise: string;
  requiredStock: number;
  currentStock: number;
  shortage: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  suggestedActions: string[];
}

export interface LinearRegressionData {
  months: string[];
  ticketCounts: number[];
  regressionLine: { x: string; y: number }[];
}