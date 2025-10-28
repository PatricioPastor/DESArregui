"use client";

import { ComboChart } from "@carbon/charts-react";
import "@carbon/charts-react/styles.css";

interface PhoneTicketsChartProps {
  monthlyData?: Array<{
    month: string;
    month_number: number;
    tickets: number;
    demand: number;
    is_in_range: boolean;
    is_projected: boolean;
    projected_demand: number | null;
  }>;
  loading?: boolean;
}

export function PhoneTicketsChart({ monthlyData, loading }: PhoneTicketsChartProps) {
  // Solo mostrar loading si no hay datos previos
  if (loading && (!monthlyData || monthlyData.length === 0)) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
          <p>Cargando datos...</p>
        </div>
      </div>
    );
  }

  if (!monthlyData || monthlyData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p>No hay datos disponibles</p>
      </div>
    );
  }

  // Nombres de meses en español
  const monthNames = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
  ];

  // Calcular promedio de demanda real (solo meses con datos reales)
  const realDemands = monthlyData.filter(item => !item.is_projected && item.demand > 0);
  const averageDemand = realDemands.length > 0
    ? Math.round(realDemands.reduce((sum, item) => sum + item.demand, 0) / realDemands.length)
    : 0;

  // Format data for CarbonCharts - ComboChart con dos grupos de barras
  const chartData: any[] = [];

  monthlyData.forEach((item) => {
    const monthLabel = monthNames[item.month_number - 1];

    if (item.is_in_range) {
      // Barras del rango analizado (color crema/beige claro)
      chartData.push({
        group: "Rango Analizado",
        key: monthLabel,
        value: item.demand || 0,
      });
    } else {
      // Barras fuera del rango (color gris)
      chartData.push({
        group: "Otros Meses",
        key: monthLabel,
        value: item.demand || 0,
      });
    }

    // Línea: Promedio como referencia
    chartData.push({
      group: "Promedio",
      key: monthLabel,
      value: averageDemand,
    });
  });

  const chartOptions = {
    title: "Demanda Anual de Teléfonos 2025",
    axes: {
      bottom: {
        title: "Mes",
        mapsTo: "key",
        scaleType: "labels" as const,
      },
      left: {
        title: "Cantidad de Teléfonos Entregados",
        mapsTo: "value",
        scaleType: "linear" as const,
      },
    },
    comboChartTypes: [
      {
        type: "simple-bar",
        correspondingDatasets: ["Rango Analizado", "Otros Meses"],
      },
      {
        type: "line",
        correspondingDatasets: ["Promedio"],
        options: {
          points: {
            enabled: false, // Sin puntos en la línea
          }
        }
      },
    ],
    curve: "curveLinear" as const, // Línea recta
    bars: {
      maxWidth: 32,
    },
    grid: {
      x: {
        enabled: false,
      },
      y: {
        enabled: true,
      },
    },
    color: {
      scale: {
        "Rango Analizado": "#F5DEB3",    // Beige/Wheat claro para rango analizado
        "Otros Meses": "#E2E8F0",         // Gris claro para otros meses
        "Promedio": "#94A3B8",            // Gris para la línea de referencia
      },
    },
    height: "100%",
    theme: "g100" as const,
    timeScale: {
      addSpaceOnEdges: 0, // Elimina padding en los bordes
    },
    tooltip: {
      customHTML: (data: any) => {
        const monthLabel = data[0]?.key;
        const monthIndex = monthNames.indexOf(monthLabel);
        const item = monthlyData[monthIndex];

        if (!item) return '';

        const isInRange = item.is_in_range;
        const rangeIndicator = isInRange
          ? '<span style="display: inline-block; width: 8px; height: 8px; background: #F5DEB3; border-radius: 2px; margin-right: 4px;"></span>En rango analizado'
          : '<span style="display: inline-block; width: 8px; height: 8px; background: #E2E8F0; border-radius: 2px; margin-right: 4px;"></span>Fuera de rango';

        if (item.demand > 0) {
          return `
            <div style="padding: 12px; background: transparent; border-radius: 6px; box-shadow: 0 2px 12px rgba(0,0,0,0.15); min-width: 200px;">
              <div style="margin-bottom: 8px;">
                <strong style="font-size: 14px;">${monthLabel} 2025</strong>
              </div>
              <div style="font-size: 12px; color: #f1f1f1; margin-bottom: 8px;">
                ${rangeIndicator}
              </div>
              <div style="margin-bottom: 4px;">
                <span style="color: ${isInRange ? '#D4A574' : '#94A3B8'};">■</span>
                <strong> Teléfonos:</strong> ${item.demand}
              </div>
              <div style="margin-bottom: 4px;">
                <span style="color: #94A3B8;">―</span>
                <strong> Promedio:</strong> ${averageDemand}
              </div>
              <div style="color: #888; font-size: 11px;">
                Tickets: ${item.tickets}
              </div>
            </div>
          `;
        } else {
          return `
            <div style="padding: 12px; background: transparent; border-radius: 6px; box-shadow: 0 2px 12px rgba(0,0,0,0.15); min-width: 200px;">
              <div style="margin-bottom: 8px;">
                <strong style="font-size: 14px;">${monthLabel} 2025</strong>
              </div>
              <div style="font-size: 12px; color: #f1f1f1; margin-bottom: 8px;">
                ${rangeIndicator}
              </div>
              <div style="margin-bottom: 4px;">
                <span style="color: #94A3B8;">―</span>
                <strong> Promedio:</strong> ${averageDemand}
              </div>
              <div style="color: #999; font-size: 11px; font-style: italic;">
                Sin datos para este mes
              </div>
            </div>
          `;
        }
      }
    },
    legend: {
      enabled: true,
      alignment: "center" as const,
    }
  };

  return (
    <div className="flex h-full w-full flex-col justify-center p-4 sm:p-6">
      <ComboChart
        data={chartData}
        options={chartOptions as any}
      />
    </div>
  );
}
