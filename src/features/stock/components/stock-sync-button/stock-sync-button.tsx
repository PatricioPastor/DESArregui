"use client";

import { useState } from "react";
import { Database01 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { toast } from "sonner";

interface StockSyncButtonProps {
  onSyncComplete: () => Promise<void>;
  disabled?: boolean;
}

export function StockSyncButton({ onSyncComplete, disabled }: StockSyncButtonProps) {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      const loadingToast = toast.loading("Sincronizando con Google Sheets...");
      const response = await fetch("/api/sync/stock", {
        method: "POST",
      });
      const result = await response.json().catch(() => null);
      toast.dismiss(loadingToast);

      if (!response.ok) {
        const errorMessage =
          result && typeof result === "object" && "error" in result
            ? (result.error as string)
            : "Error al sincronizar";
        throw new Error(errorMessage);
      }

      if (!result || typeof result !== "object") {
        throw new Error("Respuesta inválida del servidor");
      }

      const {
        success,
        processed,
        created,
        updated,
        createdModels,
        createdDistributors,
        errors,
        details,
      } = result as {
        success: boolean;
        processed: number;
        created: number;
        updated: number;
        createdModels: number;
        createdDistributors: number;
        errors: number;
        details?: {
          totalErrors: number;
          truncated: boolean;
          sampledErrors: Array<{
            device: { imei?: string; modelo?: string };
            error: string;
          }>;
        };
      };

      const baseSummary = `Procesados: ${processed} | Creados: ${created} | Actualizados: ${updated} | Modelos: ${createdModels} | Distribuidoras: ${createdDistributors}`;

      if (!success || errors > 0) {
        const sampledErrors = details?.sampledErrors ?? [];
        const truncated = details?.truncated ?? false;
        let sampleDescription = "";
        if (sampledErrors.length > 0) {
          const formattedSamples = sampledErrors
            .slice(0, 3)
            .map(({ device, error }) => {
              const identifier = device.imei || device.modelo || "Equipo sin IMEI";
              return `${identifier}: ${error}`;
            })
            .join(" | ");
          sampleDescription = ` | Ejemplos: ${formattedSamples}${truncated ? " (más errores omitidos)" : ""}`;
        }
        toast.error("Sincronización finalizada con errores", {
          description: `${baseSummary} | Errores: ${errors}${sampleDescription}`,
          duration: 6000,
        });
      } else {
        toast.success("Sincronización completada", {
          description: baseSummary,
          duration: 5000,
        });
      }

      await onSyncComplete();
    } catch (error) {
      console.error("Error syncing stock:", error);
      toast.error(
        error instanceof Error ? error.message : "Error al sincronizar con la base de datos"
      );
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Button
      color="secondary"
      size="md"
      iconLeading={Database01}
      onClick={handleSync}
      disabled={disabled || isSyncing}
    >
      {isSyncing ? "Sincronizando..." : "Sincronizar DB"}
    </Button>
  );
}



