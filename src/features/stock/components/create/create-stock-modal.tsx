"use client";

import { useEffect, useRef, useState } from "react";
import { BaseModal } from "@/components/modals/base-modal";
import { Button } from "@/components/base/buttons/button";
import { useCreateStockStore } from "@/store/create-stock.store";
import { useShallow } from "zustand/react/shallow";
import { IndividualTab } from "./individual-tab";
import { toast } from "sonner";

interface CreateStockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateStockModal({ open, onOpenChange, onSuccess }: CreateStockModalProps) {
  const hasInitialized = useRef(false);
  const [showResults, setShowResults] = useState(false);
  const [lastResult, setLastResult] = useState<{ success: boolean; message?: string; errors?: string[] } | null>(null);

  const [
    activeStep,
    setActiveStep,
    resetState,
    submit,
    isLoading,
    individualData,
    bulkData
  ] = useCreateStockStore(
    useShallow((s) => [
      s.activeStep,
      s.setActiveStep,
      s.resetState,
      s.submit,
      s.isLoading,
      s.individualData,
      s.bulkData
    ])
  );

  // Reset state when modal opens
  useEffect(() => {
    if (open && !hasInitialized.current) {
      hasInitialized.current = true;
      resetState();
      setShowResults(false);
      setLastResult(null);
    }
  }, [open, resetState]);

  // Reset initialization flag when modal closes
  useEffect(() => {
    if (!open) {
      hasInitialized.current = false;
      setShowResults(false);
      setLastResult(null);
    }
  }, [open]);

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    try {
      const result = await submit();
      setLastResult(result);
      setShowResults(true);

      if (result.success) {
        // Show success toast
        toast.success(result.message || 'Dispositivo creado exitosamente');

        // Call onSuccess callback to refresh the table
        onSuccess?.();

        // Close modal after a short delay if completely successful
        if (!result.errors || result.errors.length === 0) {
          setTimeout(() => {
            handleClose();
          }, 1500);
        } else {
          // Show error details for partial success
          result.errors?.forEach(error => {
            toast.error(error);
          });
        }
      } else {
        // Show error toast
        toast.error(result.message || 'Error al crear el dispositivo');

        // Show additional error details if available
        if (result.errors && result.errors.length > 0) {
          result.errors.forEach(error => {
            toast.error(error);
          });
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setLastResult({
        success: false,
        message: errorMessage
      });
      setShowResults(true);

      // Show error toast
      toast.error(errorMessage);
    }
  };

  const canSubmit = () => {
    if (activeStep === 'individual') {
      return (
        individualData.imei.trim() &&
        individualData.modelo.trim() &&
        individualData.distribuidora.trim() &&
        individualData.status?.trim()
      );
    } else {
      return (
        bulkData.modelo.trim() &&
        bulkData.distribuidora.trim() &&
        (bulkData.status?.trim() || 'NEW') &&
        bulkData.imeis.length > 0
      );
    }
  };

  const getSubmitButtonText = () => {
    if (isLoading) {
      return activeStep === 'individual' ? 'Creando dispositivo...' : 'Creando dispositivos...';
    }
    return activeStep === 'individual' ? 'Crear dispositivo' : `Crear ${bulkData.imeis.length} dispositivos`;
  };

  return (
    <BaseModal
      open={open}
      onOpenChange={onOpenChange}
      title="Agregar Stock"
      size="md"
      footer={
        <div className="flex justify-end gap-3 w-full">
          <Button color="secondary" onClick={handleClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button color="primary" onClick={handleSubmit} disabled={!canSubmit() || isLoading}>
            {getSubmitButtonText()}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-primary">Información general del teléfono</h4>
        <IndividualTab />
      </div>
    </BaseModal>
  );
}
