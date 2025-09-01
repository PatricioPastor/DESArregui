import { Badge } from '@/components/base/badges/badges';
import type { TelefonosTicketsAnalytics } from '@/lib/types';

interface DataTablesProps {
  analytics: TelefonosTicketsAnalytics;
}

export function DataTables({ analytics }: DataTablesProps) {
  return (
    <>
      {/* Demand Projections Table */}
      {analytics?.demandProjections && (
        <div className="bg-white dark:bg-surface-1 rounded-lg border border-gray-200 dark:border-surface shadow-sm p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Proyecciones de Demanda
          </h3>
          <div className="overflow-x-auto rounded-md border border-surface">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-surface-1">
              <thead className="bg-gray-50 border-surface dark:bg-surface-2 rounded-t-lg">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Distribuidora
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Demanda Actual
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Proyectada
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Crecimiento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Confianza
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Recomendaciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-surface dark:divide-gray-700">
                {analytics.demandProjections.map((projection, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                      {projection.enterprise}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {projection.currentDemand}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {projection.projectedDemand}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        projection.growthRate >= 0 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                      }`}>
                        {projection.growthRate >= 0 ? '+' : ''}{projection.growthRate}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Badge color={
                        projection.confidence === 'high' ? 'success' :
                        projection.confidence === 'medium' ? 'blue-light' : 'brand'
                      }>
                        {projection.confidence}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                      <ul className="text-xs space-y-1">
                        {projection.recommendations.slice(0, 2).map((rec, i) => (
                          <li key={i} className="truncate max-w-xs">{rec}</li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stock Analysis Table */}
      {analytics?.stockAnalysis && (
        <div className="bg-white dark:bg-surface-1 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Análisis de Stock
          </h3>
          <div className="overflow-x-auto rounded-md border border-surface">
            <table className="min-w-full rounded divide-y divide-gray-200 dark:divide-surface">
              <thead className="bg-gray-50 border-b border-surface dark:bg-surface-2">
                <tr className=''>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b-0">
                    Distribuidora
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Stock Requerido
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Stock Actual
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Faltante
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Prioridad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Acciones Sugeridas
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {analytics.stockAnalysis.map((analysis, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                      {analysis.enterprise}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {analysis.requiredStock}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {analysis.currentStock}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {analysis.shortage > 0 ? (
                        <span className="text-red-600 dark:text-red-400 font-medium">
                          -{analysis.shortage}
                        </span>
                      ) : (
                        <span className="text-green-600 dark:text-green-400">
                           Suficiente
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Badge color={
                        analysis.priority === 'critical' ? 'error' :
                        analysis.priority === 'high' ? 'warning' :
                        analysis.priority === 'medium' ? 'brand' : 'success'
                      }>
                        {analysis.priority}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                      <ul className="text-xs space-y-1">
                        {analysis.suggestedActions.slice(0, 2).map((action, i) => (
                          <li key={i} className="truncate max-w-xs">{action}</li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}