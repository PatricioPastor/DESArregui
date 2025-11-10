"use client";

import { useEffect } from "react";
import { ModalOverlay, Modal, Dialog } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { TextArea } from "@/components/base/textarea/textarea";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { X, AlertCircle, CheckCircle } from "@untitledui/icons";
import { toast } from "sonner";
import { useCloseAssignmentStore } from "./close-assignment.store";
import { formatInventoryDate } from "@/lib/inventory-utils";

interface CloseAssignmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignmentInfo: {
    id: string;
    assignee_name: string;
    at: string;
  };
  onSuccess?: () => void;
}

export function CloseAssignmentModal({ open, onOpenChange, assignmentInfo, onSuccess }: CloseAssignmentModalProps) {
  const {
    isLoading,
    error,
    closureReason,
    deviceReturned,
    setAssignmentInfo,
    setClosureReason,
    setDeviceReturned,
    closeAssignment,
    resetState,
  } = useCloseAssignmentStore();

  // Cargar información de la asignación al abrir
  useEffect(() => {
    if (open) {
      setAssignmentInfo(assignmentInfo);
    }
  }, [open, assignmentInfo, setAssignmentInfo]);

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    const result = await closeAssignment();

    if (result.success) {
      toast.success(result.message || "Asignación cerrada exitosamente");

      // Esperar un momento antes de cerrar para que el usuario vea el toast
      setTimeout(() => {
        handleClose();
        onSuccess?.();
      }, 1500);
    } else {
      toast.error(result.message || "Error al cerrar la asignación");
    }
  };

  return (
    <ModalOverlay isOpen={open} onOpenChange={onOpenChange}>
      <Modal>
        <Dialog className="bg-primary rounded-lg shadow-xl max-w-2xl w-full flex flex-col mx-auto max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center w-full justify-between px-6 py-5 border-b border-secondary shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning-50">
                <CheckCircle className="h-5 w-5 text-warning-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-primary">Finalizar Asignación</h2>
                <p className="text-sm text-tertiary mt-1">
                  Cerrar la asignación activa del dispositivo
                </p>
              </div>
            </div>
            <ButtonUtility onClick={handleClose} icon={X} size="sm" />
          </div>

          {/* Content */}
          <div className="px-6 py-6 space-y-6 overflow-y-auto flex-1">
            {/* Banner con info de la asignación */}
            <div className="bg-surface-1 border border-surface rounded-lg p-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-secondary">Asignado a</span>
                  <span className="text-sm font-semibold text-primary">{assignmentInfo.assignee_name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-secondary">Fecha de asignación</span>
                  <span className="text-sm text-tertiary">{formatInventoryDate(assignmentInfo.at)}</span>
                </div>
              </div>
            </div>

            {/* Warning Message */}
            <div className="flex gap-3 p-4 rounded-lg border border-warning-500 bg-warning-950">
              <AlertCircle className="h-5 w-5 text-warning-200 shrink-0 mt-0.5" />
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-warning-200">
                  Importante
                </span>
                <span className="text-xs text-warning-300">
                  Al cerrar esta asignación, el dispositivo quedará disponible para ser reasignado o eliminado.
                  El estado del dispositivo se cambiará a "USADO".
                </span>
              </div>
            </div>

            {/* Opciones */}
            <div className="space-y-4">
              <div className="p-3 rounded-lg border border-surface bg-surface-1">
                <Checkbox
                  isSelected={deviceReturned}
                  onChange={(isSelected) => setDeviceReturned(isSelected)}
                  label="Dispositivo devuelto"
                  hint="Marcar si el dispositivo fue físicamente devuelto"
                />
              </div>
            </div>

            {/* Motivo de Cierre */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-surface">
                <h3 className="text-base font-semibold text-primary">Motivo de Cierre (Opcional)</h3>
              </div>

              <TextArea
                label="Motivo"
                placeholder="Describe el motivo del cierre de la asignación (opcional)"
                value={closureReason}
                onChange={(e) => setClosureReason(e.target.value)}
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
              color="primary"
              onClick={handleSubmit}
              isDisabled={isLoading}
              isLoading={isLoading}
              size="lg"
            >
              Finalizar Asignación
            </Button>
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
