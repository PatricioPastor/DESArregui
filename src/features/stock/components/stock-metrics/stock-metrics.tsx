"use client";

import { ArrowCircleRight, Box, CheckCircle, Database01, Send01, UploadCloud02 } from "@untitledui/icons";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icons";

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  total: Database01,
  assigned: ArrowCircleRight,
  available: Box,
  linked_soti: UploadCloud02,
  in_transit: Send01,
  completed: CheckCircle,
};

interface Metric {
  id: string;
  label: string;
  value: string;
  icon?: React.ReactNode;
  subtitle: string;
}

interface StockMetricsProps {
  isLoading: boolean;
  metrics: Metric[];
}

export function StockMetrics({ isLoading, metrics }: StockMetricsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="flex flex-col gap-4 rounded-lg border border-surface bg-surface-1 p-4 shadow-xs animate-pulse"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-surface-2" />
              <div className="flex flex-col gap-2">
                <div className="h-4 w-24 bg-surface-2 rounded" />
                <div className="h-6 w-16 bg-surface-2 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {metrics.map((metric) => {
        const Icon = metric.icon || Database01 ;
        return (
          <div
            key={metric.id}
            className="flex flex-col gap-4 rounded-lg border border-surface bg-surface-1 p-4 shadow-xs"
          >
            <div className="flex items-center gap-3">
              <FeaturedIcon size="md" color="brand" theme="modern-neue" icon={Icon} />
              <div className="flex flex-col">
                <span className="text-sm font-medium text-secondary">{metric.label}</span>
                <span className="text-2xl font-semibold text-primary">{metric.value}</span>
              </div>
            </div>
            {metric.subtitle && (
              <p className="text-xs text-tertiary">{metric.subtitle}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

