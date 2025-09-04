// Configuration file for report generation
// This centralizes all hardcoded data used as fallbacks when analytics are unavailable

export interface DistributorData {
  distributor: string;
  pending: number;
  assignments: number;
  replacements: number;
  total: number;
}

export interface StockDeviceModel {
  model: string;
  quantity: number;
  usage: string;
}

export interface ReportConfig {
  // Default values used when analytics data is unavailable
  defaults: {
    obsoleteDevices: number;
    analyzedDemand: number;
    projectedDemand: number;
    totalStock: number;
    costPerDevice: number; // Used in budget calculations
  };
  
  // Assignment/replacement ratios for different report types
  ratios: {
    demand: {
      assignments: number; // 20%
      replacements: number; // 80%
    };
    stock: {
      assignments: number; // 30%
      replacements: number; // 70%
    };
  };

  // Default distributor data when analytics are unavailable
  defaultDistributors: DistributorData[];

  // Default stock data (device models and quantities)
  defaultStockData: StockDeviceModel[];

  // Default pending issues by distributor
  defaultPendingByDistributor: Record<string, number>;

  // Period generation logic
  periods: {
    demand: {
      prefix: string;
      monthsOffset: number; // Months from current date
    };
    stock: {
      prefix: string;
      monthsOffset: number;
    };
  };
}

export const reportConfig: ReportConfig = {
  defaults: {
    obsoleteDevices: 26,
    analyzedDemand: 64,
    projectedDemand: 56,
    totalStock: 131,
    costPerDevice: 576,
  },

  ratios: {
    demand: {
      assignments: 0.2,
      replacements: 0.8,
    },
    stock: {
      assignments: 0.3,
      replacements: 0.7,
    },
  },

  defaultDistributors: [
    { distributor: "DESA", pending: 0, assignments: 1, replacements: 4, total: 5 },
    { distributor: "EDES", pending: 0, assignments: 1, replacements: 4, total: 5 },
    { distributor: "EDELAP", pending: 0, assignments: 2, replacements: 8, total: 10 },
    { distributor: "EDEN", pending: 0, assignments: 4, replacements: 17, total: 21 },
    { distributor: "EDEA", pending: 0, assignments: 3, replacements: 11, total: 14 },
    { distributor: "EDESA", pending: 0, assignments: 2, replacements: 7, total: 9 }
  ],

  defaultStockData: [
    { model: "Samsung Galaxy A16", quantity: 117, usage: "Recambios convencionales" },
    { model: "Samsung Galaxy A36", quantity: 8, usage: "Supervisión y coordinación" },
    { model: "Samsung Galaxy A56", quantity: 4, usage: "Jefaturas de área" },
    { model: "Galaxy S25 Plus", quantity: 1, usage: "Gerencia/Dirección" },
    { model: "Galaxy S25 Ultra", quantity: 1, usage: "Alta dirección" }
  ],

  defaultPendingByDistributor: {
    "EDEA": 1,
    "EDELAP": 1, 
    "EDESA": 1,
    "EDEN": 2,
    "EDES": 1,
    "DESA": 0
  },

  periods: {
    demand: {
      prefix: "Análisis de Demanda",
      monthsOffset: 0, // Current period + 2 months forward
    },
    stock: {
      prefix: "Análisis de Stock", 
      monthsOffset: 1, // Next period (1 month forward + 2 months)
    },
  },
};

// Helper function to generate period strings
export function generatePeriodString(type: 'demand' | 'stock'): string {
  const config = reportConfig.periods[type];
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() + config.monthsOffset);
  
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 2); // 3-month periods

  const formatMonth = (date: Date) => {
    return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  };

  return `${formatMonth(startDate)}-${formatMonth(endDate)}`;
}

// Helper function to generate distributor data with ratios
export function generateDistributorData(
  analytics: any,
  reportType: 'demand' | 'stock'
): DistributorData[] {
  if (analytics?.demandProjections) {
    const ratios = reportConfig.ratios[reportType];
    return analytics.demandProjections.map((proj: any) => ({
      distributor: proj.enterprise,
      pending: 0,
      assignments: Math.floor(proj.currentDemand * ratios.assignments),
      replacements: Math.floor(proj.currentDemand * ratios.replacements),
      total: proj.currentDemand
    }));
  }

  // Apply ratios to default data based on report type
  const ratios = reportConfig.ratios[reportType];
  return reportConfig.defaultDistributors.map(dist => ({
    ...dist,
    assignments: Math.floor(dist.total * ratios.assignments),
    replacements: Math.floor(dist.total * ratios.replacements),
  }));
}