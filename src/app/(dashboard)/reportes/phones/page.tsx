'use client';

import { useState } from 'react';

import MobileDevicesReport from '@/components/reports/MobileDevicesReport';

// Components
import { Button } from '@/components/base/buttons/button';

// Icons
import { BarChart03, Download01 } from '@untitledui/icons';

// Local components
import { TelefonosDashboard } from './components/TelefonosDashboard';

// Types
import type { TelefonosTicketsFilters } from '@/lib/types';
import { useTelefonosTicketsData } from '@/hooks/use-telefonos-tickets-data';


export default function TelefonosTicketsDashboard() {
  const [viewMode, setViewMode] = useState<'dashboard' | 'report'>('dashboard');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-app">
      {/* Mode Toggle Header */}
      <div className="bg-white  dark:bg-app border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto ">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Teléfonos y Tickets
              </h1>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                color={viewMode === 'dashboard' ? 'primary' : 'secondary'}
                iconLeading={BarChart03}
                onClick={() => setViewMode('dashboard')}
              >
                Gráficos
              </Button>
              <Button
                color={viewMode === 'report' ? 'primary' : 'secondary'}
                iconLeading={Download01}
                onClick={() => setViewMode('report')}
              >
                Reporte
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'dashboard' ? (
        <TelefonosDashboard />
      ) : (
        <div className=" py-4">
          <MobileDevicesReportWrapper />
        </div>
      )}
    </div>
  );
}


// Wrapper component to provide analytics data to MobileDevicesReport
function MobileDevicesReportWrapper() {
  const {
    analytics,
    isLoading,
    error,
    refresh,
    applyFilters
  } = useTelefonosTicketsData();

  const [filters, setFilters] = useState<TelefonosTicketsFilters>({});
  
  // Apply the same date range handling as the dashboard
  const handleDateRangeChange = async (dates: any) => {
    if (!dates || !dates.start || !dates.end) {
      return;
    }

    try {
      const startDate = `${dates.start.year}-${dates.start.month.toString().padStart(2, '0')}-${dates.start.day.toString().padStart(2, '0')}`;
      const endDate = `${dates.end.year}-${dates.end.month.toString().padStart(2, '0')}-${dates.end.day.toString().padStart(2, '0')}`;
      
      const newFilters = {
        ...filters,
        dateRange: { start: startDate, end: endDate }
      };
      
      setFilters(newFilters);
      await applyFilters(newFilters);
      
    } catch (error) {
      console.error('Error processing date range:', error);
    }
  };

  // Suppress unused variable warning - function is available for future use
  void handleDateRangeChange;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-400">Cargando datos...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-6 max-w-md w-full">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Error al cargar datos
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {error}
            </p>
            <Button onClick={refresh} className="w-full">
              Reintentar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <MobileDevicesReport analytics={analytics} filters={filters} />;
}