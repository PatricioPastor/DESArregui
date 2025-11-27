"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ArrowCircleRight, 
  Box, 
  Phone01, 
  Signal01, 
  BarChart03,
  ArrowRight,
  Database01,
  CheckCircle
} from "@untitledui/icons";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icons";
import { Button } from "@/components/base/buttons/button";
import { useKpiData } from "@/hooks/use-kpi-data";
import { useSOTIData } from "@/hooks/use-soti-data";
import { useStockData } from "@/hooks/use-stock-data";
import { useSimsData } from "@/hooks/use-sims-data";
import { useSession } from "@/lib/auth-client";
import { isAdmin } from "@/utils/user-roles";

// Get current quarter date range
const getCurrentQuarterRange = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-11
  
  if (month >= 0 && month <= 2) {
    return { start: `${year}-01-01`, end: `${year}-03-31` };
  } else if (month >= 3 && month <= 5) {
    return { start: `${year}-04-01`, end: `${year}-06-30` };
  } else if (month >= 6 && month <= 8) {
    return { start: `${year}-07-01`, end: `${year}-09-30` };
  } else {
    return { start: `${year}-10-01`, end: `${year}-12-31` };
  }
};

interface QuickAccessCardProps {
  title: string;
  description: string;
  icon: any;
  href: string;
  stats?: {
    label: string;
    value: string | number;
  }[];
  loading?: boolean;
}

function QuickAccessCard({ 
  title, 
  description, 
  icon: Icon, 
  href, 
  stats = [],
  loading = false 
}: QuickAccessCardProps) {
  return (
    <Link href={href}>
      <div className="group rounded-lg border border-surface bg-surface-1 p-6 hover:shadow-md hover:border-brand/20 transition-all cursor-pointer">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <FeaturedIcon 
              size="md" 
              color="brand" 
              theme="modern-neue" 
              icon={Icon} 
            />
            <div>
              <h3 className="font-semibold text-primary group-hover:text-brand transition-colors">
                {title}
              </h3>
              <p className="text-sm text-tertiary mt-1">{description}</p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-tertiary group-hover:text-brand group-hover:translate-x-1 transition-all" />
        </div>
        
        {stats.length > 0 && (
          <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-surface">
            {stats.map((stat, idx) => (
              <div key={idx}>
                <p className="text-xs text-tertiary">{stat.label}</p>
                <p className="text-lg font-semibold text-primary mt-1">
                  {loading ? "..." : (stat.value !== undefined && stat.value !== null ? stat.value : 0)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const isAdminUser = isAdmin(session?.user?.email);
  
  // Use state to avoid hydration issues
  const [quarterRange, setQuarterRange] = useState<{ start: string; end: string } | null>(null);
  const [currentQuarter, setCurrentQuarter] = useState<string>("");
  
  useEffect(() => {
    const range = getCurrentQuarterRange();
    setQuarterRange(range);
    const month = new Date().getMonth();
    setCurrentQuarter(`Q${Math.floor((month + 3) / 3)} ${new Date().getFullYear()}`);
  }, []);
  
  const { data: kpiData, loading: kpiLoading } = useKpiData({
    startDate: quarterRange?.start,
    endDate: quarterRange?.end,
  });
  
  const { data: sotiData, loading: sotiLoading, lastUpdated: sotiLastUpdated } = useSOTIData();
  const { data: stockData, isLoading: stockLoading, statusSummary } = useStockData();
  const { data: simsData, isLoading: simsLoading, totalRecords: simsTotal } = useSimsData();

  // Calculate SOTI stats
  const sotiStats = useMemo(() => {
    if (!sotiData || sotiData.length === 0) return { total: 0, connected: 0, withoutTicket: 0 };
    
    const connected = sotiData.filter(
      (record) => record.fecha_conexion && !record.fecha_desconexion
    ).length;
    
    const withoutTicket = sotiData.filter(
      (record) => !record.id_ticket_jira && record.nombre_dispositivo?.includes('_')
    ).length;
    
    return {
      total: sotiData.length,
      connected,
      withoutTicket,
    };
  }, [sotiData]);

  // Calculate Stock stats - Disponibles = NEW + USED según estados de la DB
  const stockStats = useMemo(() => {
    if (!stockData || stockData.length === 0) return { total: 0, available: 0, assigned: 0 };
    
    // Disponibles son los dispositivos con status NEW o USED
    const available = stockData.filter((record) => {
      return record.status === 'NEW' || record.status === 'USED';
    }).length;
    
    // Asignados son los que tienen status ASSIGNED o tienen una asignación activa
    const assigned = stockData.filter((record) => {
      // Usar is_assigned si está disponible, sino verificar el status o las asignaciones
      if (record.is_assigned !== undefined) {
        return record.is_assigned;
      }
      const latestAssignment = record.raw?.assignments?.[0];
      const hasActiveAssignment = latestAssignment && latestAssignment.status === 'active';
      return record.status === 'ASSIGNED' || hasActiveAssignment;
    }).length;
    
    return {
      total: stockData.length,
      available,
      assigned,
    };
  }, [stockData]);

  // Calculate SIMS total - use totalRecords if available, otherwise fallback to data length
  const simsTotalCount = useMemo(() => {
    // While loading, return 0 (will show "..." via loading prop)
    if (simsLoading) return 0;
    
    // Prefer totalRecords from API response
    if (simsTotal !== undefined && simsTotal !== null && simsTotal > 0) {
      return simsTotal;
    }
    
    // Fallback to data length if we have data
    if (simsData && Array.isArray(simsData) && simsData.length > 0) {
      return simsData.length;
    }
    
    // Default to 0 if no data
    return 0;
  }, [simsLoading, simsTotal, simsData]);

  // Format date helper
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
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

  const kpiCards = useMemo(() => {
    if (kpiLoading || !kpiData || !quarterRange) {
      return [
        { label: "Solicitudes", value: "...", icon: Database01, subtitle: "" },
        { label: "Recambios", value: "...", icon: ArrowCircleRight, subtitle: "" },
        { label: "Asignaciones", value: "...", icon: CheckCircle, subtitle: "" },
        { label: "Stock", value: "...", icon: Box, subtitle: "" },
      ];
    }

    return [
      {
        label: "Solicitudes",
        value: kpiData.requests || 0,
        icon: Database01,
        subtitle: `Período ${currentQuarter}`,
      },
      {
        label: "Recambios",
        value: kpiData.replacements || 0,
        icon: ArrowCircleRight,
        subtitle: `${kpiData.replacement_rate?.toFixed(1) || 0}% del total`,
      },
      {
        label: "Asignaciones",
        value: kpiData.assignments || 0,
        icon: CheckCircle,
        subtitle: "Nuevas asignaciones",
      },
      {
        label: "Stock Disponible",
        value: kpiData.stock_current || 0,
        icon: Box,
        subtitle: `${kpiData.total_devices || 0} dispositivos totales`,
      },
    ];
  }, [kpiData, kpiLoading, quarterRange, currentQuarter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Mesa de Entrada</h1>
        <p className="text-sm text-tertiary">
          Dashboard principal de Mesa de Ayuda - Nivel 2
        </p>
      </div>

      {/* Main KPIs */}
      <section className="space-y-3">
        <h2 className="text-lg font-medium text-primary">Indicadores Principales</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpiCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <div
                key={idx}
                className="flex flex-col gap-4 rounded-lg border border-surface bg-surface-1 p-4 shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <FeaturedIcon size="md" color="brand" theme="modern-neue" icon={Icon} />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-secondary">{card.label}</span>
                    <span className="text-2xl font-semibold text-primary">
                      {card.value}
                    </span>
                  </div>
                </div>
                {card.subtitle && (
                  <p className="text-xs text-tertiary">{card.subtitle}</p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Quick Access Cards */}
      <section className="space-y-3">
        <h2 className="text-lg font-medium text-primary">Acceso Rápido</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <QuickAccessCard
            title="SOTI"
            description="Dispositivos y conexiones"
            icon={Phone01}
            href="/soti"
            loading={sotiLoading}
            stats={[
              { label: "Total", value: sotiStats.total },
              { label: "Conectados", value: sotiStats.connected },
            ]}
          />
          
          <QuickAccessCard
            title="Inventario"
            description="Gestión de dispositivos"
            icon={Box}
            href="/stock"
            loading={stockLoading}
            stats={[
              { label: "Total", value: stockStats.total },
              { label: "Disponibles", value: stockStats.available },
            ]}
          />
          
          <QuickAccessCard
            title="SIMS"
            description="Gestión de tarjetas SIM"
            icon={Signal01}
            href="/sims"
            loading={simsLoading}
            stats={[
              { label: "Total", value: simsTotalCount },
            ]}
          />
          
          <QuickAccessCard
            title="Reportes"
            description="Análisis y estadísticas"
            icon={BarChart03}
            href="/reports/phones"
            stats={[
              { label: "Período", value: currentQuarter || "..." },
            ]}
          />
        </div>
      </section>

      {/* Status Summary */}
      <section className="space-y-3">
        <h2 className="text-lg font-medium text-primary">Resumen de Estado</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* SOTI Status */}
          <div className="rounded-lg border border-surface bg-surface-1 p-4">
            <div className="flex items-center gap-3 mb-3">
              <FeaturedIcon size="md" color="brand" theme="modern-neue" icon={Phone01} />
              <h3 className="font-semibold text-primary">Estado SOTI</h3>
            </div>
            {sotiLoading ? (
              <div className="text-sm text-tertiary">Cargando...</div>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-tertiary">Dispositivos totales:</span>
                  <span className="font-medium text-primary">{sotiStats.total}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-tertiary">Conectados:</span>
                  <span className="font-medium text-success">{sotiStats.connected}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-tertiary">Sin ticket:</span>
                  <span className={`font-medium ${sotiStats.withoutTicket > 0 ? 'text-warning' : 'text-primary'}`}>
                    {sotiStats.withoutTicket}
                  </span>
                </div>
                {sotiLastUpdated && (
                  <div className="pt-2 mt-2 border-t border-surface">
                    <p className="text-xs text-tertiary">
                      Última actualización: {formatDate(sotiLastUpdated)}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Stock Status */}
          <div className="rounded-lg border border-surface bg-surface-1 p-4">
            <div className="flex items-center gap-3 mb-3">
              <FeaturedIcon size="md" color="brand" theme="modern-neue" icon={Box} />
              <h3 className="font-semibold text-primary">Estado Inventario</h3>
            </div>
            {stockLoading ? (
              <div className="text-sm text-tertiary">Cargando...</div>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-tertiary">Dispositivos totales:</span>
                  <span className="font-medium text-primary">{stockStats.total}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-tertiary">Disponibles:</span>
                  <span className="font-medium text-success">{stockStats.available}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-tertiary">Asignados:</span>
                  <span className="font-medium text-primary">{stockStats.assigned}</span>
                </div>
                {statusSummary && statusSummary.length > 0 && (
                  <div className="pt-2 mt-2 border-t border-surface">
                    <p className="text-xs text-tertiary">
                      {statusSummary.length} estados diferentes
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      {isAdminUser && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium text-primary">Acciones Rápidas</h2>
          <div className="flex flex-wrap gap-3">
            <Button
              color="primary"
              size="md"
              iconLeading={Phone01}
              onClick={() => router.push('/soti')}
            >
              Ver Dispositivos SOTI
            </Button>
            <Button
              color="secondary"
              size="md"
              iconLeading={Box}
              onClick={() => router.push('/stock')}
            >
              Gestionar Inventario
            </Button>
            <Button
              color="secondary"
              size="md"
              iconLeading={BarChart03}
              onClick={() => router.push('/reports/phones')}
            >
              Ver Reportes
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
