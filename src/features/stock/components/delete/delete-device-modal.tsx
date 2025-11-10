"use client";

import { useEffect } from "react";
import { ModalOverlay, Modal, Dialog } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { TextArea } from "@/components/base/textarea/textarea";
import { RadioButton, RadioGroup } from "@/components/base/radio-buttons/radio-buttons";
import { Badge } from "@/components/base/badges/badges";
import { X, AlertTriangle, Package, Trash01 } from "@untitledui/icons";
import { toast } from "sonner";
import { useDeleteDeviceStore } from "./delete-device.store";

interface DeleteDeviceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deviceInfo: {
    id: string;
    imei: string;
    modelo: string;
    status: string;
  };
  onSuccess?: () => void;
}

export function DeleteDeviceModal({ open, onOpenChange, deviceInfo, onSuccess }: DeleteDeviceModalProps) {
  const {
    isLoading,
    error,
    finalStatus,
    deletionReason,
    setDeviceInfo,
    setFinalStatus,
    setDeletionReason,
    deleteDevice,
    resetState,
  } = useDeleteDeviceStore();

  // Cargar información del dispositivo al abrir
  useEffect(() => {
    if (open) {
      setDeviceInfo(deviceInfo);
    }
  }, [open, deviceInfo, setDeviceInfo]);

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    const result = await deleteDevice();

    if (result.success) {
      toast.success(result.message || "Dispositivo eliminado exitosamente");

      // Esperar un momento antes de cerrar para que el usuario vea el toast
      setTimeout(() => {
        handleClose();
        onSuccess?.();
      }, 1500);
    } else {
      toast.error(result.message || "Error al eliminar el dispositivo");
    }
  };

  return (
    <ModalOverlay isOpen={open} onOpenChange={onOpenChange}>
      <Modal>
        <Dialog className="bg-primary rounded-lg shadow-xl max-w-2xl w-full flex flex-col mx-auto max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center w-full justify-between px-6 py-5 border-b border-secondary shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-error-50">
                <Trash01 className="h-5 w-5 text-error-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-primary">Eliminar Dispositivo</h2>
                <p className="text-sm text-tertiary mt-1">
                  Esta acción marcará el dispositivo como eliminado
                </p>
              </div>
            </div>
            <ButtonUtility onClick={handleClose} icon={X} size="sm" />
          </div>

          {/* Content */}
          <div className="px-6 py-6 space-y-6 overflow-y-auto flex-1">
            {/* Banner con info del dispositivo */}
            <div className="bg-surface-1 border border-surface rounded-lg p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <Package className="h-5 w-5 text-secondary mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-primary">{deviceInfo.modelo}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">IMEI: {deviceInfo.imei}</p>
                  </div>
                </div>
                <Badge size="sm" color="gray">
                  {deviceInfo.status}
                </Badge>
              </div>
            </div>

            {/* Warning Message */}
            <div className="flex gap-3 p-4 rounded-lg border border-warning-500 bg-warning-950">
              <AlertTriangle className="h-5 w-5 text-warning-200 shrink-0 mt-0.5" />
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-warning-200">
                  Eliminación suave (soft delete)
                </span>
                <span className="text-xs text-warning-300">
                  El dispositivo no se eliminará físicamente de la base de datos. Se marcará como eliminado
                  y no aparecerá en los listados, pero conservará todo su historial.
                </span>
              </div>
            </div>

            {/* Estado Final */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-surface">
                <Package className="h-5 w-5 text-brand-primary" />
                <h3 className="text-base font-semibold text-primary">Estado Final (Opcional)</h3>
              </div>

              <RadioGroup
                value={finalStatus || "keep"}
                onChange={(value) => setFinalStatus(value === "keep" ? null : value)}
              >
                <RadioButton
                  value="keep"
                  label="Mantener estado actual"
                  hint={`El dispositivo mantendrá su estado: ${deviceInfo.status}`}
                />
                <RadioButton
                  value="DISPOSED"
                  label="Dar de baja (DISPOSED)"
                  hint="El dispositivo fue dado de baja oficialmente"
                />
                <RadioButton
                  value="SCRAPPED"
                  label="Chatarra (SCRAPPED)"
                  hint="El dispositivo fue desechado como chatarra"
                />
                <RadioButton
                  value="DONATED"
                  label="Donado (DONATED)"
                  hint="El dispositivo fue donado a terceros"
                />
              </RadioGroup>
            </div>

            {/* Motivo de Eliminación */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-surface">
                <h3 className="text-base font-semibold text-primary">Motivo de Eliminación (Opcional)</h3>
              </div>

              <TextArea
                label="Motivo"
                placeholder="Describe el motivo de la eliminación (opcional)"
                value={deletionReason}
                onChange={(e) => setDeletionReason(e.target.value)}
                rows={4}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-error-50 border border-error-200 text-error-700 rounded-lg p-3 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 px-6 py-5 border-t border-surface w-full shrink-0 bg-surface-1">
            <Button color="secondary" onClick={handleClose} isDisabled={isLoading} size="lg">
              Cancelar
            </Button>
            <Button
              color="primary-destructive"
              onClick={handleSubmit}
              isDisabled={isLoading}
              isLoading={isLoading}
              size="lg"
            >
              Eliminar Dispositivo
            </Button>
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
