"use client";

import { useState, useEffect } from "react";
import { SimpleBarChart } from "@carbon/charts-react";
import "@carbon/charts-react/styles.css";

type MonthlyData = {
  month: string;
  tickets: number;
  percentage: number;
};

export function PhoneTicketsChart() {
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPhoneData = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/reports/phones");
        if (!response.ok) {
          throw new Error("Failed to fetch phone data");
        }
        const data = await response.json();
        console.log("Raw API data:", data);

        // Sanitize data
        const cleaned = (Array.isArray(data) ? data : []).map((item: any) => {
          const tickets = Number(item.tickets ?? 0);
          const percentage = Number(item.percentage ?? 0);
          return {
            month: String(item.month ?? "Unknown"),
            tickets: isNaN(tickets) ? 0 : tickets,
            percentage: isNaN(percentage) ? 0 : percentage,
          };
        });

        console.log("Cleaned data:", cleaned);
        setMonthlyData(cleaned);
      } catch (error) {
        console.error("Error fetching phone data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPhoneData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p>Loading data...</p>
      </div>
    );
  }

  if (monthlyData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p>No data available</p>
      </div>
    );
  }

  // Format data for CarbonCharts Bar Chart
  const chartData = monthlyData.map((item) => ({
    group: "Tickets",
    key: item.month,
    value: item.tickets,
  }));

  const chartOptions = {
    title: "Teléfonos Solicitados Mensualmente",
    axes: {
      bottom: {
        title: "Mes",
        mapsTo: "key",
        scaleType: "labels" as const,
      },
      left: {
        title: "Número de Tickets",
        mapsTo: "value",
        scaleType: "linear" as const,
      },
    },
    bars: {
      maxWidth: 50,
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
        "Tickets": "#FDB022",
      },
    },
    height: "300px",
    theme: "g100" as const,
  };

  return (
    <div className="w-full p-4 h-full">
      <SimpleBarChart
        data={chartData}
        options={chartOptions as any}
      />
    </div>
  );
}