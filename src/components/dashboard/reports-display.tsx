"use client";

import { useState, useMemo } from "react";
import { ArrowUp, ArrowDown, RefreshCw01, Download03, TrendUp01, TrendDown01 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { Badge, BadgeWithDot } from "@/components/base/badges/badges";
import { useFilteredBaseData } from "@/hooks/use-base-data";
import { useFilteredStockData } from "@/hooks/use-stock-data";
import type { IMEIRecord, StockRecord } from "@/lib/types";
import { cx } from "@/utils/cx";

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  trend?: "up" | "down" | "neutral";
  icon?: React.ComponentType<any>;
  color?: "blue" | "green" | "orange" | "red" | "gray";
}

function MetricCard({ title, value, change, changeLabel, trend, icon: Icon, color = "blue" }: MetricCardProps) {
  const colorClasses = {
    blue: "bg-gray-900 text-blue-800 border-gray-800",
    green: "bg-gray-900 text-green-800 border-gray-800",
    orange: "bg-gray-900 text-orange-800 border-gray-800",
    red: "bg-gray-900 text-red-950 border-gray-800",
    gray: "bg-gray-900 text-gray-800 border-gray-800",
  };

  return (
    <div className="bg-primary border border-secondary rounded-lg p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm text-secondary font-medium">{title}</p>
          <p className="text-2xl font-semibold text-primary mt-1">{value}</p>
          
          {change !== undefined && (
            <div className="flex items-center mt-2 space-x-1">
              {trend === "up" && <ArrowUp className="h-4 w-4 text-green-500" />}
              {trend === "down" && <ArrowDown className="h-4 w-4 text-red-500" />}
              <span className={cx(
                "text-sm font-medium",
                trend === "up" ? "text-green-600" : trend === "down" ? "text-red-600" : "text-gray-600"
              )}>
                {Math.abs(change)}%
              </span>
              {changeLabel && <span className="text-xs text-secondary">{changeLabel}</span>}
            </div>
          )}
        </div>
        
        {Icon && (
          <div className={cx("p-3 rounded-lg border", colorClasses[color])}>
            <Icon className="h-6 w-6" />
          </div>
        )}
      </div>
    </div>
  );
}

interface DistributionCardProps {
  title: string;
  data: Array<{ label: string; value: number; color: string }>;
}

function DistributionCard({ title, data }: DistributionCardProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="bg-primary border border-secondary rounded-lg p-6">
      <h3 className="text-lg font-semibold text-primary mb-4">{title}</h3>
      
      <div className="space-y-3">
        {data.map((item, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={cx("w-3 h-3 rounded-full", item.color)}></div>
              <span className="text-sm font-medium text-primary">{item.label}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-secondary">{item.value}</span>
              <Badge color="gray" size="sm">
                {total > 0 ? Math.round((item.value / total) * 100) : 0}%
              </Badge>
            </div>
          </div>
        ))}
      </div>
      
      {/* Progress bars */}
      <div className="mt-4 space-y-2">
        {data.map((item, index) => (
          <div key={index} className="flex items-center space-x-3">
            <span className="text-xs text-secondary w-16">{item.label}</span>
            <div className="flex-1 bg-secondary rounded-full h-2">
              <div 
                className={cx("h-2 rounded-full transition-all duration-300", item.color)}
                style={{ width: total > 0 ? `${(item.value / total) * 100}%` : '0%' }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ReportsDisplay() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const baseData = useFilteredBaseData();
  const stockData = useFilteredStockData();

  // Helper function to extract distribuidora name from full path
  const getDistribuidoraName = (fullPath: string) => {
    if (!fullPath) return "Sin asignar";
    
    // Extract everything after the first backslash and before the second
    if (fullPath.startsWith("\\\\")) {
      // Remove the first two backslashes
      const withoutPrefix = fullPath.substring(2);
      const nextSlashIndex = withoutPrefix.indexOf("\\");
      
      if (nextSlashIndex !== -1) {
        return withoutPrefix.substring(0, nextSlashIndex);
      }
      return withoutPrefix;
    }
    
    return fullPath; // Return full path if doesn't match expected format
  };

  // Calculate IMEI metrics
  const imeiMetrics = useMemo(() => {
    const data = baseData.data || [];
    
    const activeDevices = data.filter(record => 
      record.status_asignación?.toLowerCase().includes("usando") ||
      record.status_asignación?.toLowerCase().includes("activo")
    ).length;
    
    const inactiveDevices = data.length - activeDevices;
    
    const withTickets = data.filter(record => record.ticket && record.ticket.trim() !== "").length;
    
    const distributors = data.reduce((acc, record) => {
      const dist = getDistribuidoraName(record.distribuidora_soti);
      acc[dist] = (acc[dist] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const models = data.reduce((acc, record) => {
      const model = record.modelo || "Sin especificar";
      acc[model] = (acc[model] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: data.length,
      active: activeDevices,
      inactive: inactiveDevices,
      withTickets,
      distributors,
      models,
    };
  }, [baseData.data]);

  // Calculate Stock metrics  
  const stockMetrics = useMemo(() => {
    const data = stockData.data || [];
    
    const available = data.filter(record => 
      !record.asignado_a || record.asignado_a.trim() === ""
    ).length;
    
    const assigned = data.length - available;
    
    const distributors = data.reduce((acc, record) => {
      const dist = getDistribuidoraName(record.distribuidora);
      acc[dist] = (acc[dist] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const models = data.reduce((acc, record) => {
      const model = record.modelo || "Sin especificar";
      acc[model] = (acc[model] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: data.length,
      available,
      assigned,
      distributors,
      models,
    };
  }, [stockData.data]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([baseData.refresh(), stockData.refresh()]);
    setIsRefreshing(false);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    try {
      return new Date(dateString).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  if (baseData.error || stockData.error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-red-600 mb-4">
            Error loading data: {baseData.error || stockData.error}
          </p>
          <Button onClick={handleRefresh} color="primary">
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Reportes y Analytics</h1>
          <p className="text-sm text-secondary mt-1">
            Última actualización: {formatDate(baseData.lastUpdated)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            color="secondary" 
            size="md" 
            iconLeading={Download03}
          >
            Exportar
          </Button>
          <Button 
            color="secondary" 
            size="md" 
            iconLeading={RefreshCw01} 
            onClick={handleRefresh}
            disabled={isRefreshing || baseData.isLoading || stockData.isLoading}
          >
            {isRefreshing ? "Actualizando..." : "Actualizar"}
          </Button>
        </div>
      </div>

      {/* IMEI Metrics */}
      <div>
        <h2 className="text-lg font-semibold text-primary mb-4">Dispositivos IMEI</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Dispositivos"
            value={imeiMetrics.total}
            icon={TrendUp01}
            color="blue"
          />
          <MetricCard
            title="Dispositivos Activos"
            value={imeiMetrics.active}
            change={imeiMetrics.total > 0 ? Math.round((imeiMetrics.active / imeiMetrics.total) * 100) : 0}
            changeLabel="del total"
            trend="up"
            icon={TrendUp01}
            color="green"
          />
          <MetricCard
            title="Dispositivos Inactivos"
            value={imeiMetrics.inactive}
            change={imeiMetrics.total > 0 ? Math.round((imeiMetrics.inactive / imeiMetrics.total) * 100) : 0}
            changeLabel="del total"
            trend={imeiMetrics.inactive > imeiMetrics.active ? "up" : "down"}
            icon={TrendDown01}
            color={imeiMetrics.inactive > imeiMetrics.active ? "red" : "orange"}
          />
          <MetricCard
            title="Con Tickets"
            value={imeiMetrics.withTickets}
            change={imeiMetrics.total > 0 ? Math.round((imeiMetrics.withTickets / imeiMetrics.total) * 100) : 0}
            changeLabel="del total"
            trend="neutral"
            color="orange"
          />
        </div>
      </div>

      {/* Stock Metrics */}
      <div>
        <h2 className="text-lg font-semibold text-primary mb-4">Inventario de Stock</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <MetricCard
            title="Total en Stock"
            value={stockMetrics.total}
            icon={TrendUp01}
            color="blue"
          />
          <MetricCard
            title="Disponibles"
            value={stockMetrics.available}
            change={stockMetrics.total > 0 ? Math.round((stockMetrics.available / stockMetrics.total) * 100) : 0}
            changeLabel="disponibilidad"
            trend="up"
            icon={TrendUp01}
            color="green"
          />
          <MetricCard
            title="Asignados"
            value={stockMetrics.assigned}
            change={stockMetrics.total > 0 ? Math.round((stockMetrics.assigned / stockMetrics.total) * 100) : 0}
            changeLabel="asignados"
            trend="neutral"
            color="orange"
          />
        </div>
      </div>

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DistributionCard
          title="IMEI por Distribuidora"
          data={Object.entries(imeiMetrics.distributors).map(([label, value]) => ({
            label,
            value,
            color: label.toLowerCase().includes("eden") ? "bg-blue-500" : "bg-green-500",
          }))}
        />
        
        <DistributionCard
          title="Stock por Distribuidora"
          data={Object.entries(stockMetrics.distributors).map(([label, value]) => ({
            label,
            value,
            color: label.toLowerCase().includes("eden") ? "bg-blue-500" : "bg-green-500",
          }))}
        />
      </div>

      {/* Top Models */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DistributionCard
          title="Top Modelos IMEI"
          data={Object.entries(imeiMetrics.models)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([label, value]) => ({
              label,
              value,
              color: "bg-purple-500",
            }))}
        />
        
        <DistributionCard
          title="Top Modelos Stock"
          data={Object.entries(stockMetrics.models)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([label, value]) => ({
              label,
              value,
              color: "bg-indigo-500",
            }))}
        />
      </div>

      {/* Loading States */}
      {(baseData.isLoading || stockData.isLoading) && (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3">Cargando datos de reportes...</span>
        </div>
      )}
    </div>
  );
}