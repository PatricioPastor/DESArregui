"use client";

import { ReactNode } from "react";
import { CheckCircle, Circle, Clock } from "@untitledui/icons";

export type TimelineItemStatus = "completed" | "current" | "pending";

export interface TimelineItem {
  id: string;
  title: string;
  description?: string;
  timestamp?: string;
  status: TimelineItemStatus;
  icon?: ReactNode;
  metadata?: Record<string, string>;
}

interface TimelineProps {
  items: TimelineItem[];
  variant?: "default" | "compact";
}

function getStatusStyles(status: TimelineItemStatus) {
  switch (status) {
    case "completed":
      return {
        dot: "bg-green-500 border-green-500",
        line: "bg-green-500",
        icon: "text-green-500",
        title: "text-primary font-medium",
        description: "text-secondary",
      };
    case "current":
      return {
        dot: "bg-blue-500 border-blue-500 ring-4 ring-blue-500/20",
        line: "bg-gray-700",
        icon: "text-blue-500",
        title: "text-primary font-semibold",
        description: "text-secondary",
      };
    case "pending":
      return {
        dot: "bg-gray-700 border-gray-600",
        line: "bg-gray-700",
        icon: "text-gray-500",
        title: "text-tertiary",
        description: "text-tertiary",
      };
  }
}

function getDefaultIcon(status: TimelineItemStatus) {
  switch (status) {
    case "completed":
      return <CheckCircle className="w-5 h-5" />;
    case "current":
      return <Clock className="w-5 h-5" />;
    case "pending":
      return <Circle className="w-5 h-5" />;
  }
}

export function Timeline({ items, variant = "default" }: TimelineProps) {
  const isCompact = variant === "compact";

  return (
    <div className="relative">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const styles = getStatusStyles(item.status);

        return (
          <div key={item.id} className="relative pb-8 last:pb-0">
            {/* Línea conectora */}
            {!isLast && (
              <div
                className={`absolute left-3 top-8 w-0.5 h-full ${styles.line}`}
              />
            )}

            {/* Contenido del item */}
            <div className="relative flex gap-4">
              {/* Dot / Icon */}
              <div className="relative flex-shrink-0">
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${styles.dot}`}
                >
                  {item.status === "completed" && (
                    <CheckCircle className="w-4 h-4 text-white" />
                  )}
                  {item.status === "current" && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pt-0.5">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h4 className={`text-sm ${styles.title}`}>{item.title}</h4>
                    {item.description && !isCompact && (
                      <p className={`text-xs mt-1 ${styles.description}`}>
                        {item.description}
                      </p>
                    )}
                  </div>
                  {item.timestamp && (
                    <time className="text-xs text-tertiary flex-shrink-0">
                      {item.timestamp}
                    </time>
                  )}
                </div>

                {/* Metadata */}
                {item.metadata && Object.keys(item.metadata).length > 0 && !isCompact && (
                  <div className="mt-2 space-y-1">
                    {Object.entries(item.metadata).map(([key, value]) => (
                      <div key={key} className="text-xs text-secondary">
                        <span className="font-medium">{key}:</span> {value}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
