"use client";
import { LinearRegressionData } from '@/utils/types';
import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register Chart.js components for tree-shaking
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);


interface DemandRegressionChartProps {
  regressionData: LinearRegressionData | null;
}

export function DemandRegressionChart({ regressionData }: DemandRegressionChartProps) {
  const chartData = useMemo(() => {
    if (!regressionData) return null;

    return {
      labels: regressionData.months,
      datasets: [
        {
          label: 'Tickets Reales',
          data: regressionData.ticketCounts,
          borderColor: '#3b82f6',
          backgroundColor: '#3b82f680',
          fill: false,
          tension: 0.1,
          pointRadius: 6,
          pointHoverRadius: 8,
          pointBackgroundColor: '#3b82f6',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
        },
        {
          label: 'Línea de Regresión (Proyección)',
          data: regressionData.regressionLine.map((point) => point.y),
          borderColor: '#ef4444',
          backgroundColor: '#ef444480',
          fill: false,
          tension: 0,
          borderDash: [8, 4],
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: '#ef4444',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointStyle: 'triangle',
        },
      ],
    };
  }, [regressionData]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
            weight: 'bold' as const,
          },
        },
      },
      title: {
        display: true,
        text: 'Proyección de Demanda Mensual con Regresión Lineal',
        font: {
          size: 16,
          weight: 'bold' as const,
        },
        padding: {
          top: 10,
          bottom: 30,
        },
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          title: (context: any) => {
            return `Mes: ${context[0]?.label}`;
          },
          label: (context: any) => {
            const datasetLabel = context.dataset.label;
            const value = context.parsed.y;
            
            if (datasetLabel === 'Tickets Reales') {
              return `${datasetLabel}: ${value} tickets`;
            } else {
              return `${datasetLabel}: ${value} tickets (estimado)`;
            }
          },
          afterBody: (context: any) => {
            const actualIndex = context.findIndex((ctx: any) => ctx.dataset.label === 'Tickets Reales');
            const regressionIndex = context.findIndex((ctx: any) => ctx.dataset.label === 'Línea de Regresión (Proyección)');
            
            if (actualIndex !== -1 && regressionIndex !== -1) {
              const actual = context[actualIndex].parsed.y;
              const regression = context[regressionIndex].parsed.y;
              const difference = actual - regression;
              const percentage = actual > 0 ? Math.round((difference / actual) * 100) : 0;
              
              return [
                '',
                `Diferencia: ${difference > 0 ? '+' : ''}${difference} tickets`,
                `Desviación: ${percentage}%`
              ];
            }
            return [];
          },
        },
      },
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Mes',
          font: {
            size: 14,
            weight: 'bold' as const,
          },
        },
        grid: {
          display: true,
          color: '#e5e7eb',
        },
        ticks: {
          font: {
            size: 12,
          },
        },
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Cantidad de Tickets',
          font: {
            size: 14,
            weight: 'bold' as const,
          },
        },
        beginAtZero: true,
        grid: {
          display: true,
          color: '#e5e7eb',
        },
        ticks: {
          font: {
            size: 12,
          },
          callback: function(value: any) {
            return `${value} tickets`;
          },
        },
      },
    },
  }), []);

  if (!chartData) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="text-center">
          <div className="text-gray-400 mb-2">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No hay datos disponibles para el gráfico
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Los datos de regresión se generarán automáticamente cuando haya tickets disponibles
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-96">
      <Line data={chartData} options={chartOptions} />
    </div>
  );
}