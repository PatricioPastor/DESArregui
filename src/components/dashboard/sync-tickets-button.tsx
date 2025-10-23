"use client";

import { useState } from "react";
import { Database02 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { toast } from "sonner";

interface SyncResponse {
  success: boolean;
  processed: number;
  created: number;
  updated: number;
  deactivated: number;
  errors: number;
  error?: string;
}

interface SyncTicketsButtonProps {
  onSyncComplete?: (data: SyncResponse) => void;
  size?:  "sm" | "md" ;
  color?: "primary" | "secondary" ;
  className?: string;
}

export function SyncTicketsButton({
  onSyncComplete,
  size = "sm",
  color = "secondary",
  className
}: SyncTicketsButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSync = async () => {
    setIsLoading(true);

    const toastId = toast.loading("Sincronizando tickets...", {
      description: "Obteniendo datos desde Google Sheets"
    });

    try {
      const response = await fetch('/api/sync/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: SyncResponse = await response.json();

      if (data.success) {
        toast.success("Sincronización completada", {
          id: toastId,
          description: `✅ ${data.processed} procesados • ${data.created} creados • ${data.updated} actualizados`,
          duration: 5000
        });
      } else {
        toast.warning("Sincronización con errores", {
          id: toastId,
          description: `⚠️ ${data.errors} errores • ${data.processed - data.errors} exitosos`,
          duration: 6000
        });
      }

      onSyncComplete?.(data);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';

      toast.error("Error en sincronización", {
        id: toastId,
        description: `❌ ${errorMessage}`,
        duration: 8000
      });

      console.error('Sync error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      color={color}
      size={size}
      iconLeading={Database02}
      onClick={handleSync}
      isLoading={isLoading}
      isDisabled={isLoading}
      showTextWhileLoading
      className={className}
    >
      {isLoading ? "Sincronizando" : "Sincronizar"}
    </Button>
  );
}
