"use client";

import { useEffect, useState } from "react";
import { BaseModal } from "@/components/modals/base-modal";
import { Button } from "@/components/base/buttons/button";
import { TextArea } from "@/components/base/textarea/textarea";
import { RadioButton, RadioGroup } from "@/components/base/radio-buttons/radio-buttons";
import { Package, CheckCircle } from "@untitledui/icons";
import { toast } from "sonner";
import { useEditShippingStore } from "./edit-shipping.store";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface EditShippingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignmentInfo: {
    id: string;
    assignee_name: string;
    shipping_voucher_id: string | null;
    shipping_status: string | null;
    shipped_at?: string | null;
    delivered_at?: string | null;
    expects_return?: boolean;
    return_status?: string | null;
    return_device_imei?: string | null;
  };
  onSuccess?: () => void;
}

export function EditShippingModal({
  open,
  onOpenChange,
  assignmentInfo,
  onSuccess,
}: EditShippingModalProps) {
  const [returnNotes, setReturnNotes] = useState("");

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
    deliverShipping,
  } = useEditShippingStore();

  useEffect(() => {
    if (open) {
      setAssignmentInfo(assignmentInfo);
      setShippingStatus(assignmentInfo.shipping_status || "pending");
      setShippingNotes("");
      setReturnNotes("");
    }
  }, [open, assignmentInfo, setAssignmentInfo, setShippingStatus, setShippingNotes]);

  const handleClose = () => {
    resetState();
    setReturnNotes("");
    onOpenChange(false);
  };

  const handleUpdateShipping = async () => {
    const result = await updateShipping();

    if (result.success) {
      toast.success(result.message || "Estado de envío actualizado exitosamente");
      onSuccess?.();
      setTimeout(() => {
        handleClose();
      }, 800);
    } else {
      toast.error(result.message || "Error al actualizar el estado de envío");
    }
  };

  const handleDeliverShipping = async () => {
    const result = await deliverShipping();

    if (result.success) {
      toast.success(result.message || "Envío marcado como entregado");
      onSuccess?.();
      setTimeout(() => {
        handleClose();
      }, 800);
    } else {
      toast.error(result.message || "Error al marcar como entregado");
    }
  };

  const handleConfirmReturn = async () => {
    try {
      const response = await fetch(`/api/assignments/${assignmentInfo.id}/return`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          return_received: true,
          return_notes: returnNotes.trim() || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Error al confirmar devolución");
      }

      toast.success("Devolución confirmada exitosamente");
      onSuccess?.();
      setTimeout(() => {
        handleClose();
      }, 800);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error desconocido");
    }
  };

  const getTimeElapsed = (dateString: string | null | undefined) => {
    if (!dateString) return null;
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: es });
    } catch {
      return null;
    }
  };

  const canConfirmReturn =
    assignmentInfo.expects_return &&
    assignmentInfo.shipping_status === "delivered" &&
    (assignmentInfo.return_status === "pending" || assignmentInfo.return_status === null);

  const isShipped = shippingStatus === "shipped";

  return (
    <BaseModal
      open={open}
      onOpenChange={onOpenChange}
      title="Editar Envío"
      subtitle={assignmentInfo.assignee_name}
      size="lg"
      footer={
        <div className="flex justify-end gap-3 w-full">
          <Button color="secondary" onClick={handleClose} isDisabled={isLoading}>
            Cancelar
          </Button>
          {canConfirmReturn ? (
            <Button color="primary" onClick={handleConfirmReturn} isDisabled={isLoading}>
              Confirmar Devolución
            </Button>
          ) : (
            <Button
              color="primary"
              onClick={handleUpdateShipping}
              isDisabled={isLoading}
              isLoading={isLoading}
            >
              Guardar Cambios
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        {/* Información resumida en grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Vale de envío */}
          <div className="bg-surface-1 border border-surface rounded-lg p-3">
            <div className="text-xs font-medium text-secondary uppercase tracking-wide mb-1.5">
              Vale de envío
            </div>
            <div className="text-sm font-semibold text-primary font-mono">
              {assignmentInfo.shipping_voucher_id || "Sin generar"}
            </div>
          </div>

          {/* Estado actual */}
          {assignmentInfo.shipping_status && (
            <div className="bg-surface-1 border border-surface rounded-lg p-3">
              <div className="text-xs font-medium text-secondary uppercase tracking-wide mb-1.5">
                Estado actual
              </div>
              <span
                className={`text-xs font-semibold px-2 py-1 rounded inline-block ${
                  assignmentInfo.shipping_status === "delivered"
                    ? "bg-success-500/20 text-success-400"
                    : assignmentInfo.shipping_status === "shipped"
                      ? "bg-brand-500/20 text-brand-400"
                      : "bg-surface-2 text-secondary"
                }`}
              >
                {assignmentInfo.shipping_status === "delivered"
                  ? "✓ Entregado"
                  : assignmentInfo.shipping_status === "shipped"
                    ? "📦 Enviado"
                    : "⏳ Pendiente"}
              </span>
            </div>
          )}

          {/* Timeline */}
          {(assignmentInfo.shipped_at || assignmentInfo.delivered_at) && (
            <div className="bg-surface-1 border border-surface rounded-lg p-3">
              <div className="text-xs font-medium text-secondary uppercase tracking-wide mb-1.5">
                Progreso
              </div>
              <div className="flex flex-col gap-1 text-xs text-secondary">
                {assignmentInfo.shipped_at && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-brand-400">📦</span>
                    <span>Enviado {getTimeElapsed(assignmentInfo.shipped_at)}</span>
                  </div>
                )}
                {assignmentInfo.delivered_at && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-success-400">✓</span>
                    <span>Entregado {getTimeElapsed(assignmentInfo.delivered_at)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Botón destacado para marcar como entregado */}
        {isShipped && (
          <div className="bg-surface-1 border border-success-500/30 rounded-lg p-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm font-semibold text-success-400">Marcar como entregado</p>
                <p className="text-xs text-success-500/70 mt-0.5">
                  El dispositivo fue recibido por el destinatario
                </p>
              </div>
              <Button
                size="sm"
                color="primary"
                iconLeading={CheckCircle}
                onClick={handleDeliverShipping}
                disabled={isLoading}
                isLoading={isLoading}
              >
                Entregado
              </Button>
            </div>
          </div>
        )}

        {/* Cambiar estado y Notas en grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Actualizar Estado */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-primary">Cambiar estado</h4>
            <RadioGroup value={shippingStatus} onChange={setShippingStatus}>
              <RadioButton value="pending" label="Pendiente" hint="El envío aún no ha sido despachado" />
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

          {/* Notas */}
          <div>
            <TextArea
              label="Notas (opcional)"
              placeholder="Ej: Firma del destinatario, número de tracking adicional..."
              value={shippingNotes}
              onChange={(e) => setShippingNotes(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        {/* Gestión de Devolución */}
        {assignmentInfo.expects_return && (
          <div className="border-t border-surface pt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Información de devolución */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-primary">Devolución</h4>
                <div className="bg-surface-1 border border-surface rounded-lg p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-secondary uppercase tracking-wide">IMEI esperado</span>
                    <span className="font-mono font-semibold text-primary text-sm">
                      {assignmentInfo.return_device_imei || "No especificado"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-surface">
                    <span className="text-xs font-medium text-secondary uppercase tracking-wide">Estado</span>
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded ${
                        assignmentInfo.return_status === "received"
                          ? "bg-success-500/20 text-success-400"
                          : "bg-warning-500/20 text-warning-400"
                      }`}
                    >
                      {assignmentInfo.return_status === "received" ? "✓ Recibido" : "⏳ Pendiente"}
                    </span>
                  </div>
                </div>

                {canConfirmReturn ? null : assignmentInfo.return_status === "received" ? (
                  <div className="bg-success-500/20 border border-success-500/30 rounded-lg p-3">
                    <p className="text-sm text-success-400">Devolución confirmada y registrada</p>
                  </div>
                ) : (
                  <div className="bg-surface-2 border border-surface rounded-lg p-3">
                    <p className="text-xs text-secondary">
                      El dispositivo debe ser entregado antes de poder confirmar la recepción.
                    </p>
                  </div>
                )}
              </div>

              {/* Observaciones de devolución */}
              {canConfirmReturn && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-primary">Confirmar devolución</h4>
                  <TextArea
                    label="Observaciones (opcional)"
                    placeholder="Ej: Dispositivo recibido en buenas condiciones..."
                    value={returnNotes}
                    onChange={(e) => setReturnNotes(e.target.value)}
                    rows={4}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </BaseModal>
  );
}

