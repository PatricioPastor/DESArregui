import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { TelefonosTicketsAnalytics } from '@/lib/types';
import { reportConfig, generatePeriodString, generateDistributorData } from './reportConfig';
import {
  calculateObsoleteDevices,
  calculateProjectedDemand,
  getAnalyzedDemand,
  calculatePendingByDistributor,
  calculateBudgetEstimate,
  validateAnalyticsData,
  getStockDataForReport
} from './reportUtils';

interface UseReportGenerationProps {
  analytics: TelefonosTicketsAnalytics | null;
}

export function useReportGeneration({ analytics }: UseReportGenerationProps) {
  const generateDemandAnalysisReport = async () => {
    try {
      // Import the PDF generator function dynamically
      const { generateMobileDevicesReport } = await import('@/utils/pdf-generator');
      
      // Validate and process analytics data safely
      const validatedAnalytics = validateAnalyticsData(analytics);
      
      const obsoleteDevices = calculateObsoleteDevices(validatedAnalytics);
      const analyzedDemand = getAnalyzedDemand(validatedAnalytics);
      const projectedDemand = calculateProjectedDemand(validatedAnalytics);
      const pendingByDistributor = calculatePendingByDistributor(validatedAnalytics);
      
      const reportData = {
        reportDate: format(new Date(), 'dd \'de\' MMMM \'de\' yyyy, HH:mm \'PM\' xxx', { locale: es }),
        period: generatePeriodString('demand'),
        distributorsData: generateDistributorData(validatedAnalytics, 'demand'),
        obsoleteDevices,
        analyzedDemand,
        projectedDemand,
        stockData: getStockDataForReport('demand'),
        totalStock: reportConfig.defaults.totalStock,
        pendingByDistributor,
        budgetEstimate: calculateBudgetEstimate(projectedDemand, obsoleteDevices)
      };
      
      // Generate the PDF
      generateMobileDevicesReport(reportData);
    } catch (error) {
      console.error('Error generating demand report:', error);
    }
  };

  const generateStockAnalysisReport = async () => {
    try {
      // Import the PDF generator function dynamically
      const { generateMobileDevicesReport } = await import('@/utils/pdf-generator');
      
      // Validate and process analytics data safely
      const validatedAnalytics = validateAnalyticsData(analytics);
      
      const analyzedDemand = getAnalyzedDemand(validatedAnalytics);
      const projectedDemand = calculateProjectedDemand(validatedAnalytics);
      const pendingByDistributor = calculatePendingByDistributor(validatedAnalytics);
      
      const reportData = {
        reportDate: format(new Date(), 'dd \'de\' MMMM \'de\' yyyy, HH:mm \'PM\' xxx', { locale: es }),
        period: generatePeriodString('stock'),
        distributorsData: generateDistributorData(validatedAnalytics, 'stock'),
        obsoleteDevices: reportConfig.defaults.obsoleteDevices,
        analyzedDemand,
        projectedDemand,
        stockData: getStockDataForReport('stock'),
        totalStock: reportConfig.defaults.totalStock,
        pendingByDistributor,
        budgetEstimate: 47232 // Fixed value for stock analysis reports
      };
      
      // Generate the PDF
      generateMobileDevicesReport(reportData);
    } catch (error) {
      console.error('Error generating stock report:', error);
    }
  };

  return {
    generateDemandAnalysisReport,
    generateStockAnalysisReport
  };
}