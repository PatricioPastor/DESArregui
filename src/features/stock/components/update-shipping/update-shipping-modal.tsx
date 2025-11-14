"use client";

import { useEffect, useState } from "react";
import { ModalOverlay, Modal, Dialog } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { TextArea } from "@/components/base/textarea/textarea";
import { RadioButton, RadioGroup } from "@/components/base/radio-buttons/radio-buttons";
import { Tabs } from "@/components/application/tabs/tabs";
import { X, Package } from "@untitledui/icons";
import { toast } from "sonner";
import { useUpdateShippingStore } from "./update-shipping.store";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface UpdateShippingModalProps {
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

export function UpdateShippingModal({ open, onOpenChange, assignmentInfo, onSuccess }: UpdateShippingModalProps) {
  const [activeTab, setActiveTab] = useState<"shipping" | "return">("shipping");
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
  } = useUpdateShippingStore();

  // Cargar información de la asignación al abrir - SIEMPRE sincronizar con los datos más recientes
  useEffect(() => {
    if (open) {
      setAssignmentInfo(assignmentInfo);
      // Forzar que el estado del radio button refleje el estado actual de la asignación
      setShippingStatus(assignmentInfo.shipping_status || 'pending');
      setShippingNotes('');
      setReturnNotes('');

      // Si espera devolución y está entregado, mostrar tab de devolución
      if (assignmentInfo.expects_return && assignmentInfo.shipping_status === 'delivered') {
        setActiveTab('return');
      } else {
        setActiveTab('shipping');
      }
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
      // Primero ejecutar onSuccess para refrescar los datos
      onSuccess?.();
      // Luego cerrar el modal
      setTimeout(() => {
        handleClose();
      }, 800);
    } else {
      toast.error(result.message || "Error al actualizar el estado de envío");
    }
  };

  const handleConfirmReturn = async () => {
    try {
      const response = await fetch(`/api/assignments/${assignmentInfo.id}/return`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          return_received: true,
          return_notes: returnNotes.trim() || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al confirmar devolución');
      }

      toast.success('Devolución confirmada exitosamente');
      // Primero ejecutar onSuccess para refrescar los datos
      onSuccess?.();
      // Luego cerrar el modal
      setTimeout(() => {
        handleClose();
      }, 800);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error desconocido');
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

  const canConfirmReturn = assignmentInfo.expects_return &&
                          assignmentInfo.shipping_status === 'delivered' &&
                          assignmentInfo.return_status === 'pending';

  return (
    <ModalOverlay isOpen={open} onOpenChange={onOpenChange}>
      <Modal>
        <Dialog className="bg-primary rounded-lg shadow-xl max-w-2xl w-full flex flex-col mx-auto">
          {/* Header */}
          <div className="flex items-center w-full justify-between px-6 py-4 border-b border-secondary">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50">
                <Package className="h-5 w-5 text-brand-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-primary">Gestión de Asignación</h2>
                <p className="text-sm text-tertiary">{assignmentInfo.assignee_name}</p>
              </div>
            </div>
            <ButtonUtility onClick={handleClose} icon={X} size="sm" />
          </div>

          {/* Content with Tabs */}
          {assignmentInfo.expects_return ? (
            <Tabs selectedKey={activeTab} onSelectionChange={(key) => setActiveTab(key as "shipping" | "return")}>
              <div className="px-6 pt-4">
                <Tabs.List
                  type="button-minimal"
                  items={[
                    { id: "shipping", label: "Envío" },
                    { id: "return", label: "Devolución" },
                  ]}
                />
              </div>

              <Tabs.Panel id="shipping" className="outline-none">
                <div className="px-6 py-4 space-y-4">
                  {/* Card de información con más detalle */}
                  <div className="bg-surface-1 border border-surface rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-secondary font-medium">Vale de envío</span>
                      <span className="text-sm font-semibold text-primary font-mono">
                        {assignmentInfo.shipping_voucher_id || "Sin generar"}
                      </span>
                    </div>

                    {assignmentInfo.shipping_status && (
                      <div className="flex items-center justify-between pt-2 border-t border-surface">
                        <span className="text-sm text-secondary font-medium">Estado actual</span>
                        <span className={`text-sm font-semibold px-2 py-1 rounded ${
                          assignmentInfo.shipping_status === 'delivered' ? 'bg-success-50 text-success-700' :
                          assignmentInfo.shipping_status === 'shipped' ? 'bg-brand-50 text-brand-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {assignmentInfo.shipping_status === 'delivered' ? '✓ Entregado' :
                           assignmentInfo.shipping_status === 'shipped' ? '📦 Enviado' :
                           '⏳ Pendiente'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Timeline con más detalle */}
                  {(assignmentInfo.shipped_at || assignmentInfo.delivered_at) && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-primary">Historial</h4>

                      {assignmentInfo.shipped_at && (
                        <div className="flex items-start gap-3 px-3 py-2 bg-brand-50 rounded-lg border border-brand-200">
                          <span className="text-lg">📦</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-brand-700">Enviado</p>
                            <p className="text-xs text-brand-600">{getTimeElapsed(assignmentInfo.shipped_at)}</p>
                          </div>
                        </div>
                      )}

                      {assignmentInfo.delivered_at && (
                        <div className="flex items-start gap-3 px-3 py-2 bg-success-50 rounded-lg border border-success-200">
                          <span className="text-lg">✓</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-success-700">Entregado</p>
                            <p className="text-xs text-success-600">{getTimeElapsed(assignmentInfo.delivered_at)}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actualizar estado */}
                  <div className="space-y-2 pt-2">
                    <h4 className="text-sm font-semibold text-primary">Actualizar estado</h4>
                    <RadioGroup value={shippingStatus} onChange={setShippingStatus}>
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

                  {/* Notas opcionales */}
                  <TextArea
                    label="Notas (opcional)"
                    placeholder="Ej: Firma del destinatario, número de tracking adicional..."
                    value={shippingNotes}
                    onChange={(e) => setShippingNotes(e.target.value)}
                    rows={2}
                  />
                </div>
              </Tabs.Panel>

              <Tabs.Panel id="return" className="outline-none">
                <div className="px-6 py-4 space-y-4">
                  {/* Información del dispositivo a devolver */}
                  <div className="bg-surface-1 border border-surface rounded-lg p-4 space-y-3">
                    <h4 className="text-sm font-semibold text-primary">Dispositivo esperado</h4>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-secondary">IMEI</span>
                      <span className="font-mono font-semibold text-primary text-sm">
                        {assignmentInfo.return_device_imei || 'No especificado'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-surface">
                      <span className="text-sm text-secondary font-medium">Estado de devolución</span>
                      <span className={`text-sm font-semibold px-2 py-1 rounded ${
                        assignmentInfo.return_status === 'received' ? 'bg-success-50 text-success-700' :
                        'bg-warning-50 text-warning-700'
                      }`}>
                        {assignmentInfo.return_status === 'received' ? '✓ Recibido' : '⏳ Pendiente'}
                      </span>
                    </div>
                  </div>

                  {canConfirmReturn ? (
                    <>
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-primary">Confirmar recepción</h4>
                        <div className="bg-brand-50 border border-brand-200 rounded-lg p-3 text-sm">
                          <p className="text-brand-700 font-medium mb-1">¿Qué sucederá al confirmar?</p>
                          <ul className="text-brand-600 text-xs space-y-1 ml-4 list-disc">
                            <li>Se marcará la devolución como recibida</li>
                            <li>El dispositivo se actualizará en el inventario como "USADO"</li>
                            <li>Se registrará la fecha y hora de recepción</li>
                          </ul>
                        </div>
                      </div>

                      <TextArea
                        label="Observaciones (opcional)"
                        placeholder="Ej: Dispositivo recibido en buenas condiciones, sin accesorios..."
                        value={returnNotes}
                        onChange={(e) => setReturnNotes(e.target.value)}
                        rows={3}
                      />
                    </>
                  ) : assignmentInfo.return_status === 'received' ? (
                    <div className="bg-success-50 border border-success-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <span className="text-lg">✓</span>
                        <div>
                          <p className="text-sm font-semibold text-success-700 mb-1">Devolución confirmada</p>
                          <p className="text-xs text-success-600">
                            El dispositivo ha sido recibido y registrado en el inventario.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <span className="text-lg">ℹ️</span>
                        <div>
                          <p className="text-sm font-semibold text-gray-700 mb-1">Esperando devolución</p>
                          <p className="text-xs text-gray-600">
                            El dispositivo debe ser entregado antes de poder confirmar la recepción.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Tabs.Panel>

              {/* Footer */}
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-surface bg-surface-1">
                <Button color="secondary" onClick={handleClose} isDisabled={isLoading}>
                  Cancelar
                </Button>
                {activeTab === 'shipping' && (
                  <Button
                    color="primary"
                    onClick={handleUpdateShipping}
                    isDisabled={isLoading}
                    isLoading={isLoading}
                  >
                    Actualizar
                  </Button>
                )}
                {activeTab === 'return' && canConfirmReturn && (
                  <Button
                    color="primary"
                    onClick={handleConfirmReturn}
                    isDisabled={isLoading}
                  >
                    Confirmar Devolución
                  </Button>
                )}
              </div>
            </Tabs>
          ) : (
            <>
              {/* Sin tabs, solo envío */}
              <div className="px-6 py-4 space-y-4">
                {/* Card de información con más detalle */}
                <div className="bg-surface-1 border border-surface rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-secondary font-medium">Vale de envío</span>
                    <span className="text-sm font-semibold text-primary font-mono">
                      {assignmentInfo.shipping_voucher_id || "Sin generar"}
                    </span>
                  </div>

                  {assignmentInfo.shipping_status && (
                    <div className="flex items-center justify-between pt-2 border-t border-surface">
                      <span className="text-sm text-secondary font-medium">Estado actual</span>
                      <span className={`text-sm font-semibold px-2 py-1 rounded ${
                        assignmentInfo.shipping_status === 'delivered' ? 'bg-success-50 text-success-700' :
                        assignmentInfo.shipping_status === 'shipped' ? 'bg-brand-50 text-brand-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {assignmentInfo.shipping_status === 'delivered' ? '✓ Entregado' :
                         assignmentInfo.shipping_status === 'shipped' ? '📦 Enviado' :
                         '⏳ Pendiente'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Timeline con más detalle */}
                {(assignmentInfo.shipped_at || assignmentInfo.delivered_at) && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-primary">Historial</h4>

                    {assignmentInfo.shipped_at && (
                      <div className="flex items-start gap-3 px-3 py-2 bg-brand-50 rounded-lg border border-brand-200">
                        <span className="text-lg">📦</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-brand-700">Enviado</p>
                          <p className="text-xs text-brand-600">{getTimeElapsed(assignmentInfo.shipped_at)}</p>
                        </div>
                      </div>
                    )}

                    {assignmentInfo.delivered_at && (
                      <div className="flex items-start gap-3 px-3 py-2 bg-success-50 rounded-lg border border-success-200">
                        <span className="text-lg">✓</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-success-700">Entregado</p>
                          <p className="text-xs text-success-600">{getTimeElapsed(assignmentInfo.delivered_at)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Actualizar estado */}
                <div className="space-y-2 pt-2">
                  <h4 className="text-sm font-semibold text-primary">Actualizar estado</h4>
                  <RadioGroup value={shippingStatus} onChange={setShippingStatus}>
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

                {/* Notas opcionales */}
                <TextArea
                  label="Notas (opcional)"
                  placeholder="Ej: Firma del destinatario, número de tracking adicional..."
                  value={shippingNotes}
                  onChange={(e) => setShippingNotes(e.target.value)}
                  rows={2}
                />
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-surface bg-surface-1">
                <Button color="secondary" onClick={handleClose} isDisabled={isLoading}>
                  Cancelar
                </Button>
                <Button
                  color="primary"
                  onClick={handleUpdateShipping}
                  isDisabled={isLoading}
                  isLoading={isLoading}
                >
                  Actualizar
                </Button>
              </div>
            </>
          )}
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
