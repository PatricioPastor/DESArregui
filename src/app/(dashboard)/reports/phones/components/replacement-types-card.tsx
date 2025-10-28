"use client";

import { AlertTriangle, Phone, Trash01, XCircle } from "@untitledui/icons";

interface ReplacementTypesCardProps {
  replacementTypes?: {
    ROBO: number;
    ROTURA: number;
    OBSOLETO: number;
    PERDIDA: number;
    SIN_ESPECIFICAR: number;
  };
  loading?: boolean;
  isAdmin?: boolean;
}

const typeConfig = {
  ROBO: {
    label: "Robo",
    icon: AlertTriangle,
    bgColor: "bg-red-50 dark:bg-red-950/20",
    iconColor: "text-red-600 dark:text-red-400",
    borderColor: "border-red-200 dark:border-red-800",
    description: "Dispositivos robados"
  },
  ROTURA: {
    label: "Rotura",
    icon: XCircle,
    bgColor: "bg-orange-50 dark:bg-orange-950/20",
    iconColor: "text-orange-600 dark:text-orange-400",
    borderColor: "border-orange-200 dark:border-orange-800",
    description: "Dispositivos con fallas"
  },
  OBSOLETO: {
    label: "Obsoleto",
    icon: Trash01,
    bgColor: "bg-gray-50 dark:bg-gray-900/50",
    iconColor: "text-gray-600 dark:text-gray-400",
    borderColor: "border-gray-200 dark:border-gray-700",
    description: "Equipos desactualizados"
  },
  PERDIDA: {
    label: "Pérdida",
    icon: AlertTriangle,
    bgColor: "bg-yellow-50 dark:bg-yellow-950/20",
    iconColor: "text-yellow-600 dark:text-yellow-400",
    borderColor: "border-yellow-200 dark:border-yellow-800",
    description: "Dispositivos extraviados"
  },
  SIN_ESPECIFICAR: {
    label: "Sin especificar",
    icon: Phone,
    bgColor: "bg-slate-50 dark:bg-slate-900/50",
    iconColor: "text-slate-500 dark:text-slate-400",
    borderColor: "border-slate-200 dark:border-slate-700",
    description: "Tipo no definido"
  }
};

export function ReplacementTypesCard({ replacementTypes, loading, isAdmin = false }: ReplacementTypesCardProps) {
  // Solo mostrar skeleton si no hay datos previos
  if (loading && !replacementTypes) {
    return (
      <div className="rounded-lg border border-surface bg-surface-1 p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <div className="h-5 w-48 animate-pulse rounded bg-gray-200"></div>
            <div className="h-4 w-64 animate-pulse rounded bg-gray-100"></div>
          </div>
          <div className="h-6 w-20 animate-pulse rounded-full bg-gray-200"></div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-100"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!replacementTypes) {
    return null;
  }

  // Filtrar SIN_ESPECIFICAR para usuarios no admin
  const displayTypes = Object.entries(replacementTypes).filter(
    ([type]) => isAdmin || type !== 'SIN_ESPECIFICAR'
  );

  const total = displayTypes.reduce((sum, [, count]) => sum + count, 0);

  if (total === 0) {
    return (
      <div className="rounded-lg border border-surface bg-surface-1 p-6">
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">
            No se registraron recambios en el período seleccionado
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-surface bg-surface-1 p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Tipos de Recambio</h3>
          <p className="text-sm text-muted-foreground">
            Distribución de recambios en el período analizado
          </p>
        </div>
        <div className="rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1">
          <span className="text-sm font-medium">{total} Total</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
        {displayTypes.map(([type, count]) => {
          const config = typeConfig[type as keyof typeof typeConfig];
          const Icon = config.icon;
          const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : "0";

          return (
            <div
              key={type}
              className={`flex flex-col gap-3 rounded-lg border ${config.borderColor} ${config.bgColor} p-4 transition-all hover:shadow-sm`}
            >
              <div className="flex items-center justify-between">
                <div className={`rounded-lg ${config.bgColor} p-2.5`}>
                  <Icon className={`h-5 w-5 ${config.iconColor}`} />
                </div>
                <span className="text-xs font-medium text-muted-foreground">{percentage}%</span>
              </div>

              <div className="flex flex-col gap-0.5">
                <span className="text-2xl font-bold tracking-tight">{count}</span>
                <span className="text-sm font-medium text-foreground">{config.label}</span>
                <span className="text-xs text-muted-foreground">{config.description}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
