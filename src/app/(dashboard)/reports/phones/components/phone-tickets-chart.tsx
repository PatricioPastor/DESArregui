"use client";

import { GroupedBarChart } from "@carbon/charts-react";
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

  // Format data for CarbonCharts - usando grupos para real vs proyectado
  const chartData: any[] = [];

  monthlyData.forEach((item) => {
    const monthLabel = monthNames[item.month_number - 1];

    if (item.is_projected) {
      // Meses futuros: solo mostrar proyección
      chartData.push({
        group: "Proyectado",
        key: monthLabel,
        value: item.projected_demand || 0,
      });
    } else if (item.demand === 0 && item.projected_demand && item.projected_demand > 0) {
      // Mes actual sin datos: mostrar solo proyección
      chartData.push({
        group: "Proyectado",
        key: monthLabel,
        value: item.projected_demand,
      });
    } else {
      // Meses pasados y mes actual con datos: mostrar demanda real
      chartData.push({
        group: "Real",
        key: monthLabel,
        value: item.demand,
      });
    }
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
        title: "Cantidad de Teléfonos",
        mapsTo: "value",
        scaleType: "linear" as const,
      },
    },
    bars: {
      maxWidth: 40,
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
        "Real": "#FDB022",
        "Proyectado": "#FDB02266", // Mismo color pero con opacidad (66 = 40% en hex)
      },
    },
    height: "300px",
    theme: "g100" as const,
    tooltip: {
      customHTML: (data: any) => {
        const monthLabel = data[0]?.key;
        const monthIndex = monthNames.indexOf(monthLabel);
        const item = monthlyData[monthIndex];

        if (!item) return '';

        if (item.is_projected) {
          return `
            <div style="padding: 8px; background: transparent; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <strong>${monthLabel} 2025</strong><br/>
              <span style="color: #888;">Proyección: ${item.projected_demand} teléfonos</span><br/>
              <em style="font-size: 11px; color: #666;">Basado en promedio mensual</em>
            </div>
          `;
        } else {
          return `
            <div style="padding: 8px; background: transparent; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <strong>${monthLabel} 2025</strong><br/>
              Demanda: ${item.demand} teléfonos<br/>
              Tickets: ${item.tickets}
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
    <div className="w-full p-4 h-full">
      <GroupedBarChart
        data={chartData}
        options={chartOptions as any}
      />
    </div>
  );
}