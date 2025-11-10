"use client";

import { useEffect } from "react";
import { ModalOverlay, Modal, Dialog } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { TextArea } from "@/components/base/textarea/textarea";
import { RadioButton, RadioGroup } from "@/components/base/radio-buttons/radio-buttons";
import { X, Truck01, Package } from "@untitledui/icons";
import { toast } from "sonner";
import { useUpdateShippingStore } from "./update-shipping.store";

interface UpdateShippingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignmentInfo: {
    id: string;
    assignee_name: string;
    shipping_voucher_id: string | null;
    shipping_status: string | null;
  };
  onSuccess?: () => void;
}

export function UpdateShippingModal({ open, onOpenChange, assignmentInfo, onSuccess }: UpdateShippingModalProps) {
  const {
    isLoading,
    error,
    shippingStatus,
    shippingNotes,
    setAssignmentInfo,
    setShippingStatus,
    setShippingNotes,
    updateShipping,
    resetState,
  } = useUpdateShippingStore();

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
    const result = await updateShipping();

    if (result.success) {
      toast.success(result.message || "Estado de envío actualizado exitosamente");

      // Esperar un momento antes de cerrar para que el usuario vea el toast
      setTimeout(() => {
        handleClose();
        onSuccess?.();
      }, 1500);
    } else {
      toast.error(result.message || "Error al actualizar el estado de envío");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "shipped":
        return "text-brand-primary";
      case "delivered":
        return "text-success-600";
      default:
        return "text-gray-600";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "Pendiente";
      case "shipped":
        return "Enviado";
      case "delivered":
        return "Entregado";
      default:
        return status;
    }
  };

  return (
    <ModalOverlay isOpen={open} onOpenChange={onOpenChange}>
      <Modal>
        <Dialog className="bg-primary rounded-lg shadow-xl max-w-2xl w-full flex flex-col mx-auto max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center w-full justify-between px-6 py-5 border-b border-secondary shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50">
                <Truck01 className="h-5 w-5 text-brand-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-primary">Actualizar Estado de Envío</h2>
                <p className="text-sm text-tertiary mt-1">
                  Marcar el envío como enviado o entregado
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
                  <span className="text-sm font-medium text-secondary">Vale de envío</span>
                  <span className="text-sm text-tertiary">
                    {assignmentInfo.shipping_voucher_id || "Sin generar"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-secondary">Estado actual</span>
                  <span className={`text-sm font-medium ${getStatusColor(assignmentInfo.shipping_status || 'pending')}`}>
                    {getStatusLabel(assignmentInfo.shipping_status || 'pending')}
                  </span>
                </div>
              </div>
            </div>

            {/* Estado de Envío */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-surface">
                <Package className="h-5 w-5 text-brand-primary" />
                <h3 className="text-base font-semibold text-primary">Estado de Envío</h3>
              </div>

              <RadioGroup
                value={shippingStatus}
                onChange={(value) => setShippingStatus(value)}
              >
                <RadioButton
                  value="pending"
                  label="Pendiente"
                  hint="El envío aún no ha sido despachado"
                />
                <RadioButton
                  value="shipped"
                  label="Enviado"
                  hint="El dispositivo fue despachado y está en tránsito"
                />
                <RadioButton
                  value="delivered"
                  label="Entregado"
                  hint="El dispositivo fue entregado al destinatario"
                />
              </RadioGroup>
            </div>

            {/* Notas de Envío */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-surface">
                <h3 className="text-base font-semibold text-primary">Notas (Opcional)</h3>
              </div>

              <TextArea
                label="Notas de envío"
                placeholder="Añade detalles sobre el estado del envío (opcional)"
                value={shippingNotes}
                onChange={(e) => setShippingNotes(e.target.value)}
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
              Actualizar Estado
            </Button>
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
