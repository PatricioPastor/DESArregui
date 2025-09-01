import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Cell,
} from 'recharts';
import type { TelefonosTicketsAnalytics } from '@/lib/types';

interface ChartsGridProps {
  analytics: TelefonosTicketsAnalytics;
  enterpriseChartData: Array<{ name: string; value: number; tickets: number }>;
  demandTrendsData: Array<{ period: string; demanda: number; type: string }>;
  timeSeriesChartData: Array<{ date: string; count: number }>;
}

export function ChartsGrid({ 
  analytics, 
  enterpriseChartData, 
  demandTrendsData, 
  timeSeriesChartData 
}: ChartsGridProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
      {/* Enterprise Distribution Chart */}
      <div className="bg-white dark:bg-surface-1 rounded-lg border border-gray-200 dark:border-surface shadow-sm p-4">
        <h3 className="text-lg font-semibold text-brand-muted dark:text-gray-100 mb-4">
          Distribución por Distribuidoras
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={enterpriseChartData}>
            <CartesianGrid strokeDasharray="4 6" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="tickets" fill="#1e444d" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Demand Trends Chart */}
      <div className="bg-white dark:bg-surface-1 rounded-lg border border-gray-200 dark:border-surface shadow-sm p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Evolución de Demanda
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={demandTrendsData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="4 6" stroke="#e5e7eb" />
            <XAxis 
              dataKey="period" 
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: '#d1d5db' }}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: '#d1d5db' }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'var(--surface-1)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                fontSize: '14px'
              }}
            />
            <Bar dataKey="demanda" name="Demanda Total">
              {demandTrendsData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={
                  entry.type === 'pasada' ? '#83989d' : 
                  entry.type === 'actual' ? '#1e444d' : 
                  '#aab8bb'
                } />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex justify-center mt-4 space-x-6 text-sm">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-gray-400 rounded mr-2"></div>
            <span className="text-gray-600 dark:text-gray-300">Período Anterior</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded mr-2" style={{ backgroundColor: '#1e444d' }}></div>
            <span className="text-gray-600 dark:text-gray-300">Período Actual</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded mr-2" style={{ backgroundColor: '#aab8bb' }}></div>
            <span className="text-gray-600 dark:text-gray-300">Proyección</span>
          </div>
        </div>
      </div>

      {/* Time Series Chart */}
      <div className="bg-white dark:bg-surface-1 rounded-lg border border-gray-200 dark:border-surface shadow-sm p-4 lg:col-span-2">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Tendencia Temporal
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={timeSeriesChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke="#83989d" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}