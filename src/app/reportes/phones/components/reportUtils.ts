// Utility functions for report data processing and fallback logic

import { reportConfig } from './reportConfig';
import type { TelefonosTicketsAnalytics } from '@/lib/types';

/**
 * Safely calculates obsolete devices from analytics data
 * Falls back to default value if analytics are unavailable or incomplete
 */
export function calculateObsoleteDevices(analytics: TelefonosTicketsAnalytics | null): number {
  if (!analytics?.stockAnalysis) {
    return reportConfig.defaults.obsoleteDevices;
  }

  try {
    const calculated = analytics.stockAnalysis.reduce(
      (sum, stock) => sum + (stock.shortage > 0 ? stock.shortage : 0), 
      0
    );
    
    // Return default if calculation yields 0 (likely data issue)
    return calculated > 0 ? calculated : reportConfig.defaults.obsoleteDevices;
  } catch (error) {
    console.warn('Error calculating obsolete devices, using default:', error);
    return reportConfig.defaults.obsoleteDevices;
  }
}

/**
 * Safely calculates projected demand from analytics data
 * Falls back to default value if analytics are unavailable
 */
export function calculateProjectedDemand(analytics: TelefonosTicketsAnalytics | null): number {
  if (!analytics?.demandProjections) {
    return reportConfig.defaults.projectedDemand;
  }

  try {
    const calculated = analytics.demandProjections.reduce(
      (sum, proj) => sum + proj.projectedDemand, 
      0
    );
    
    return calculated > 0 ? calculated : reportConfig.defaults.projectedDemand;
  } catch (error) {
    console.warn('Error calculating projected demand, using default:', error);
    return reportConfig.defaults.projectedDemand;
  }
}

/**
 * Safely gets analyzed demand (total tickets) from analytics
 * Falls back to default value if analytics are unavailable
 */
export function getAnalyzedDemand(analytics: TelefonosTicketsAnalytics | null): number {
  if (!analytics?.totalTickets || analytics.totalTickets <= 0) {
    return reportConfig.defaults.analyzedDemand;
  }
  
  return analytics.totalTickets;
}

/**
 * Safely calculates pending issues by distributor from analytics
 * Falls back to default values if analytics are unavailable
 */
export function calculatePendingByDistributor(
  analytics: TelefonosTicketsAnalytics | null
): Record<string, number> {
  if (!analytics?.stockAnalysis) {
    return reportConfig.defaultPendingByDistributor;
  }

  try {
    const calculated = analytics.stockAnalysis.reduce((acc, stock) => {
      if (stock.enterprise) {
        acc[stock.enterprise] = stock.shortage > 0 ? stock.shortage : 0;
      }
      return acc;
    }, {} as Record<string, number>);
    
    // If no enterprises found, use defaults
    return Object.keys(calculated).length > 0 ? calculated : reportConfig.defaultPendingByDistributor;
  } catch (error) {
    console.warn('Error calculating pending by distributor, using defaults:', error);
    return reportConfig.defaultPendingByDistributor;
  }
}

/**
 * Calculates budget estimate based on actual or default values
 */
export function calculateBudgetEstimate(
  projectedDemand: number,
  obsoleteDevices: number,
  costPerDevice?: number
): number {
  const cost = costPerDevice || reportConfig.defaults.costPerDevice;
  return (projectedDemand + obsoleteDevices) * cost;
}

/**
 * Validates and sanitizes analytics data before processing
 * Returns null if data is fundamentally invalid
 */
export function validateAnalyticsData(
  analytics: TelefonosTicketsAnalytics | null | undefined
): TelefonosTicketsAnalytics | null {
  if (!analytics) return null;
  
  // Basic validation - at least one key metric should be available
  const hasValidData = analytics.totalTickets > 0 || 
                      (analytics.demandProjections && analytics.demandProjections.length > 0) ||
                      (analytics.stockAnalysis && analytics.stockAnalysis.length > 0);
  
  return hasValidData ? analytics : null;
}

/**
 * Gets appropriate stock data based on report type and context
 */
export function getStockDataForReport(reportType: 'demand' | 'stock'): typeof reportConfig.defaultStockData {
  if (reportType === 'stock') {
    // For stock reports, adjust usage descriptions to be more generic
    return reportConfig.defaultStockData.map(item => ({
      ...item,
      usage: item.usage.includes('Supervisión') ? 'Uso específico' : item.usage
    }));
  }
  
  return reportConfig.defaultStockData;
}