"use client";

import { useEffect, useMemo, useState } from "react";
import { ModalOverlay, Modal, Dialog } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Input } from "@/components/base/input/input";
import { Select } from "@/components/base/select/select";
import { DEVICE_STATUS_OPTIONS } from "@/constants/device-status";
import type { InventoryRecord } from "@/lib/types";
import { X } from "@untitledui/icons";
import { toast } from "sonner";

interface EditStockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  device: InventoryRecord | null;
  onSuccess?: () => void;
}

interface SelectOption {
  id: string;
  label: string;
  [key: string]: any;
}

interface EditFormState {
  imei: string;
  modelo: string;
  distribuidora: string;
  status: string;
  asignado_a: string;
  ticket: string;
  purchase_id: string;
}

const initialFormState: EditFormState = {
  imei: "",
  modelo: "",
  distribuidora: "",
  status: "NEW",
  asignado_a: "",
  ticket: "",
  purchase_id: "",
};

export function EditStockModal({ open, onOpenChange, device, onSuccess }: EditStockModalProps) {
  const [formState, setFormState] = useState<EditFormState>({ ...initialFormState });
  const [modelOptions, setModelOptions] = useState<SelectOption[]>([]);
  const [distributorOptions, setDistributorOptions] = useState<SelectOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const selectedDeviceImei = device?.imei ?? "";

  useEffect(() => {
    if (!open || !selectedDeviceImei) {
      return;
    }

    let isMounted = true;

    const fetchData = async () => {
      try {
        setIsLoading(true);

        const [detailResponse, modelsResponse, distributorsResponse] = await Promise.all([
          fetch(`/api/stock/${selectedDeviceImei}`),
          fetch("/api/models"),
          fetch("/api/distributors"),
        ]);

        const detailResult = await detailResponse.json();
        const modelsResult = await modelsResponse.json();
        const distributorsResult = await distributorsResponse.json();

        if (!isMounted) return;

        if (!detailResult.success) {
          throw new Error(detailResult.error || "No se pudo obtener el detalle del dispositivo");
        }

        const inventory: InventoryRecord = detailResult.data.inventory;

        setModelOptions(modelsResult.success ? modelsResult.data : []);
        setDistributorOptions(distributorsResult.success ? distributorsResult.data : []);

        setFormState({
          imei: inventory.imei,
          modelo: inventory.model_id,
          distribuidora: inventory.distribuidora_id || "",
          status: inventory.status,
          asignado_a: inventory.asignado_a || "",
          ticket: inventory.ticket || "",
          purchase_id: detailResult.data.purchase?.id || "",
        });
      } catch (error) {
        console.error("Error loading device data:", error);
        toast.error(
          error instanceof Error ? error.message : "No se pudo cargar la informacion del dispositivo",
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [open, selectedDeviceImei]);

  const statusOptions = useMemo(() => DEVICE_STATUS_OPTIONS, []);

  const disableSubmit =
    isSaving ||
    isLoading ||
    !formState.imei ||
    !formState.modelo ||
    !formState.distribuidora ||
    !formState.status;

  const handleClose = () => {
    onOpenChange(false);
    setFormState({ ...initialFormState });
  };

  const handleSave = async () => {
    if (!formState.modelo || !formState.distribuidora) {
      toast.error("Modelo y distribuidora son obligatorios");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        modelo: formState.modelo,
        distribuidora: formState.distribuidora,
        status: formState.status,
        asignado_a: formState.asignado_a?.trim() || null,
        ticket: formState.ticket?.trim() || null,
        purchase_id: formState.purchase_id?.trim() || null,
      };

      const response = await fetch(`/api/stock/${formState.imei}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "No se pudo actualizar el dispositivo");
      }

      toast.success(result.message || "Dispositivo actualizado correctamente");
      onSuccess?.();
      handleClose();
    } catch (error) {
      console.error("Error updating device:", error);
      toast.error(error instanceof Error ? error.message : "Error al actualizar el dispositivo");
    } finally {
      setIsSaving(false);
    }
  };

  const isReady = Boolean(formState.imei);

  return (
    <ModalOverlay isOpen={open} onOpenChange={onOpenChange}>
      <Modal>
        <Dialog className="bg-primary rounded-lg shadow-xl max-w-2xl w-full flex flex-col mx-auto">
          <div className="flex items-center w-full justify-between px-6 py-4 border-b border-secondary">
            <div>
              <h2 className="text-lg font-semibold text-primary">Editar dispositivo</h2>
              {formState.imei ? (
                <p className="text-sm text-secondary">IMEI: {formState.imei}</p>
              ) : null}
            </div>
            <ButtonUtility
              onClick={handleClose}
              className="p-2 text-secondary hover:text-primary"
              icon={X}
              size="xs"
            />
          </div>

          <div className="px-6 py-4">
            {isLoading && !isReady ? (
              <div className="py-12 text-center text-secondary">Cargando informacion...</div>
            ) : !isReady ? (
              <div className="py-12 text-center text-secondary">
                Selecciona un dispositivo para editarlo
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <Input id="imei" label="IMEI" value={formState.imei} isDisabled />

                <Select
                  label="Modelo"
                  placeholder="Seleccione el modelo"
                  selectedKey={formState.modelo}
                  onSelectionChange={(value) => setFormState((prev) => ({ ...prev, modelo: value as string }))}
                  items={modelOptions as any}
                  isDisabled={isLoading}
                  isRequired
                >
                  {(item) => (
                    <Select.Item id={item.id}>
                      {item.label}
                    </Select.Item>
                  )}
                </Select>

                <Select
                  label="Distribuidora"
                  placeholder="Seleccione la distribuidora"
                  selectedKey={formState.distribuidora}
                  onSelectionChange={(value) =>
                    setFormState((prev) => ({ ...prev, distribuidora: value as string }))
                  }
                  items={distributorOptions as any}
                  isDisabled={isLoading}
                  isRequired
                >
                  {(item) => (
                    <Select.Item id={item.id}>
                      {item.label}
                    </Select.Item>
                  )}
                </Select>

                <Select
                  label="Estado"
                  selectedKey={formState.status}
                  onSelectionChange={(value) =>
                    setFormState((prev) => ({ ...prev, status: value as string }))
                  }
                  items={statusOptions as any}
                  isRequired
                >
                  {(item) => (
                    <Select.Item id={item.id}>
                      {item.label}
                    </Select.Item>
                  )}
                </Select>

                <Input
                  id="asignado_a"
                  label="Asignado a"
                  placeholder="Nombre o referencia"
                  value={formState.asignado_a}
                  onChange={(value) => setFormState((prev) => ({ ...prev, asignado_a: value }))}
                />

                <Input
                  id="ticket"
                  label="Ticket de asignacion"
                  placeholder="Identificador de ticket"
                  value={formState.ticket}
                  onChange={(value) => setFormState((prev) => ({ ...prev, ticket: value }))}
                />

                <Input
                  id="purchase_id"
                  label="Ticket de compra (opcional)"
                  placeholder="Identificador de compra"
                  value={formState.purchase_id}
                  onChange={(value) => setFormState((prev) => ({ ...prev, purchase_id: value }))}
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 px-6 py-4 border-t border-surface w-full">
            <Button color="secondary" onClick={handleClose} disabled={isSaving}>
              Cancelar
            </Button>
            <Button color="primary" onClick={handleSave} disabled={disableSubmit}>
              {isSaving ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
