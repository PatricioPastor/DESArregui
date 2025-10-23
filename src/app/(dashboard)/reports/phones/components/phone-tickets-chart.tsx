"use client";

import { ComboChart } from "@carbon/charts-react";
import "@carbon/charts-react/styles.css";

interface PhoneTicketsChartProps {
  monthlyData?: Array<{
    month: string;
    month_number: number;
    tickets: number;
    demand: number;
    is_projected: boolean;
    projected_demand: number | null;
  }>;
  loading?: boolean;
}

export function PhoneTicketsChart({ monthlyData, loading }: PhoneTicketsChartProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p>Cargando datos...</p>
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

  // Format data for CarbonCharts - ComboChart (Barras + Línea)
  const chartData: any[] = [];

  monthlyData.forEach((item) => {
    const monthLabel = monthNames[item.month_number - 1];

    // Barra: Demanda de teléfonos solicitados
    chartData.push({
      group: "Teléfonos Entregados",
      key: monthLabel,
      value: item.demand || 0,
    });

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
        correspondingDatasets: ["Teléfonos Entregados"],
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
        "Teléfonos Entregados": "#FDB022",
        "Promedio": "#94A3B8", // Gris para la línea de referencia
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

        if (item.demand > 0) {
          return `
            <div style="padding: 8px; background: transparent; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <strong>${monthLabel} 2025</strong><br/>
              <span style="color: #FDB022;">Teléfonos Entregados: ${item.demand}</span><br/>
              <span style="color: #94A3B8;">Promedio: ${averageDemand}</span><br/>
              <span style="color: #888;">Tickets: ${item.tickets}</span>
            </div>
          `;
        } else {
          return `
            <div style="padding: 8px; background: transparent; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <strong>${monthLabel} 2025</strong><br/>
              <span style="color: #94A3B8;">Promedio: ${averageDemand}</span><br/>
              <em style="font-size: 11px; color: #666;">Sin datos para este mes</em>
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
