// utils/analyticsUtils.ts
import { format, parseISO, isAfter, addDays, isBefore, parse } from 'date-fns';
import { getMonthlyKey } from './date-utils';
import type {
  TelefonosTicketRecord,
  TelefonosTicketsAnalytics,
  DemandProjection,
  StockAnalysis,
  LinearRegressionData,
  TelefonosTicketsFilters,
} from './types';

import { filterTelefonosTickets } from './ticket-utils';

// Re-export functions from ticket-utils for convenience
export { convertRowToTelefonosTicketRecord, filterTelefonosTickets } from './ticket-utils';

// Linear regression utility
function calculateLinearRegression(x: number[], y: number[]): { slope: number; intercept: number } {
  const n = x.length;
  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumXX = 0;

  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
    sumXY += x[i] * y[i];
    sumXX += x[i] * x[i];
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

export function generateMonthlyDemandRegression(records: TelefonosTicketRecord[]): LinearRegressionData {
  // Aggregate ticket counts by month
  const monthlyCounts: { [key: string]: number } = {};
  records.forEach((record) => {
    try {
        console.log(record.created)
      const date = parse(record.created, 'yyyy-MM-dd HH:mm:ss', new Date())
      
      const monthKey = getMonthlyKey(date);
      monthlyCounts[monthKey] = (monthlyCounts[monthKey] || 0) + 1;
    } catch (error) {
      console.warn('Error parsing date for regression:', record.created, error);
    }
  });

  // Prepare data for regression
  const months = Object.keys(monthlyCounts).sort();
  const ticketCounts = months.map((month) => monthlyCounts[month]);
  const x = months.map((_, index) => index); // Numerical x-axis (0, 1, 2, ...)

  // Calculate linear regression
  const { slope, intercept } = calculateLinearRegression(x, ticketCounts);

  // Generate regression line points
  const regressionLine = months.map((month, index) => ({
    x: month,
    y: Math.round(slope * index + intercept),
  }));

  return { months, ticketCounts, regressionLine };
}

export function generateTimeSeriesData(records: TelefonosTicketRecord[]): { date: string; count: number }[] {
  const dateCounts: { [key: string]: number } = {};
  records.forEach((record) => {
    try {
      const date = parseISO(record.created.includes(' ') ? record.created.split(' ')[0] : record.created);
      const formattedDate = format(date, 'yyyy-MM-dd');
      dateCounts[formattedDate] = (dateCounts[formattedDate] || 0) + 1;
    } catch (error) {
      console.warn('Error parsing date for time series:', record.created, error);
    }
  });

  return Object.entries(dateCounts)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function calculateGrowthRate(enterprise: string, records: TelefonosTicketRecord[]): number {
  try {
    const enterpriseRecords = records
      .filter((r) => r.enterprise === enterprise)
      .map((r) => ({
        ...r,
        parsedDate: parseISO(r.created.includes(' ') ? r.created.split(' ')[0] : r.created),
      }))
      .filter((r) => !isNaN(r.parsedDate.getTime()))
      .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());

    if (enterpriseRecords.length < 2) return 0.1;

    const now = new Date();
    const oneWeekAgo = addDays(now, -7);
    const twoWeeksAgo = addDays(now, -14);

    const recentWeek = enterpriseRecords.filter((r) => isAfter(r.parsedDate, oneWeekAgo)).length;
    const previousWeek = enterpriseRecords.filter((r) =>
      isAfter(r.parsedDate, twoWeeksAgo) && isBefore(r.parsedDate, oneWeekAgo)
    ).length;

    return previousWeek === 0 ? 0.1 : (recentWeek - previousWeek) / previousWeek;
  } catch (error) {
    console.warn('Error calculating growth rate for', enterprise);
    return 0.1;
  }
}

export function generateRecommendations(currentDemand: number, growthRate: number, enterprise: string): string[] {
  const recommendations: string[] = [];
  if (growthRate > 0.3) {
    recommendations.push(`High growth detected (+${Math.round(growthRate * 100)}%) - Increase preventive stock`);
    recommendations.push('Review support capacity for increasing demand');
  } else if (growthRate < -0.2) {
    recommendations.push('Decreasing demand - Optimize resource allocation');
  }
  if (currentDemand > 100) {
    recommendations.push('High ticket volume - Consider automation');
    recommendations.push('Implement automatic issue categorization');
  } else if (currentDemand < 5) {
    recommendations.push('Low demand - Verify service coverage');
  }
  if (enterprise.includes('EDEN') || enterprise.includes('EDEA')) {
    recommendations.push('Regional distributor - Coordinate with local offices');
  }
  return recommendations.length ? recommendations : ['Maintain current stock and support levels'];
}

export function generateDemandProjections(
  enterpriseCounts: { [key: string]: number },
  records: TelefonosTicketRecord[]
): DemandProjection[] {
  return Object.entries(enterpriseCounts).map(([enterprise, currentDemand]) => {
    const growthRate = calculateGrowthRate(enterprise, records);
    const projectedDemand = Math.round(currentDemand * (1 + growthRate));
    const confidence: 'high' | 'medium' | 'low' = currentDemand > 50 ? 'high' : currentDemand < 10 ? 'low' : 'medium';
    return {
      enterprise,
      currentDemand,
      projectedDemand,
      growthRate: Math.round(growthRate * 100),
      confidence,
      recommendations: generateRecommendations(currentDemand, growthRate, enterprise),
    };
  });
}

export function generateStockActions(shortage: number, requiredStock: number, enterprise: string): string[] {
  const actions: string[] = [];
  if (shortage > 0) {
    actions.push(`Replenish ${shortage} units to meet demand`);
    if (shortage > requiredStock * 0.5) {
      actions.push('URGENT: Critical stock - Coordinate immediate replenishment');
      actions.push('Evaluate alternative suppliers for faster delivery');
    } else if (shortage > requiredStock * 0.2) {
      actions.push('Plan replenishment for next week');
      actions.push('Review suppliers to optimize delivery time');
    }
  } else {
    actions.push('Stock adequate - Maintain current levels');
  }
  if (enterprise.includes('EDEN') || enterprise.includes('EDEA')) {
    actions.push('Coordinate with regional distribution center');
  }
  return actions;
}

export function generateStockAnalysis(
  enterpriseCounts: { [key: string]: number },
  issueTypeCounts: { [key: string]: number }
): StockAnalysis[] {
  return Object.entries(enterpriseCounts).map(([enterprise, ticketCount]) => {
    const hardwareIssues = Object.entries(issueTypeCounts)
      .filter(([issueType]) =>
        issueType.toLowerCase().includes('hardware') ||
        issueType.toLowerCase().includes('dispositivo') ||
        issueType.toLowerCase().includes('equipo')
      )
      .reduce((sum, [_, count]) => sum + count, 0);

    const requiredStock = Math.ceil(ticketCount * 0.3 + hardwareIssues * 0.5);
    const currentStock = Math.floor(requiredStock * 0.7);
    const shortage = Math.max(0, requiredStock - currentStock);
    const priority: 'critical' | 'high' | 'medium' | 'low' =
      shortage > requiredStock * 0.5 ? 'critical' : shortage > requiredStock * 0.3 ? 'high' :
      shortage > requiredStock * 0.1 ? 'medium' : 'low';

    return {
      enterprise,
      requiredStock,
      currentStock,
      shortage,
      priority,
      suggestedActions: generateStockActions(shortage, requiredStock, enterprise),
    };
  });
}

export function calculateTelefonosTicketsAnalytics(
  records: TelefonosTicketRecord[],
  filters?: TelefonosTicketsFilters
): TelefonosTicketsAnalytics {
  const filteredRecords = filters ? filterTelefonosTickets(records, filters) : records;

  const byEnterprise: { [key: string]: number } = {};
  const byIssueType: { [key: string]: number } = {};
  const byLabel: { [key: string]: number } = {};
  const titleCounts: { [key: string]: number } = {};

  filteredRecords.forEach((record) => {
    byEnterprise[record.enterprise] = (byEnterprise[record.enterprise] || 0) + 1;
    byIssueType[record.issue_type] = (byIssueType[record.issue_type] || 0) + 1;
    byLabel[record.label] = (byLabel[record.label] || 0) + 1;
    titleCounts[record.title] = (titleCounts[record.title] || 0) + 1;
  });

  return {
    totalTickets: filteredRecords.length,
    byEnterprise,
    byIssueType,
    byLabel,
    timeSeriesData: generateTimeSeriesData(filteredRecords),
    demandProjections: generateDemandProjections(byEnterprise, filteredRecords),
    stockAnalysis: generateStockAnalysis(byEnterprise, byIssueType),
    topIssues: Object.entries(titleCounts)
      .map(([title, count]) => ({
        title,
        count,
        percentage: Math.round((count / filteredRecords.length) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
  };
}