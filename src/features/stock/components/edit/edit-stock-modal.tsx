"use client";

import { useEffect, useMemo, useState } from "react";
import { BaseModal } from "@/components/modals/base-modal";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { Select } from "@/components/base/select/select";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { DEVICE_STATUS_OPTIONS } from "@/constants/device-status";
import type { InventoryRecord } from "@/lib/types";
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
  is_backup: boolean;
  backup_distributor_id: string;
}

const initialFormState: EditFormState = {
  imei: "",
  modelo: "",
  distribuidora: "",
  status: "NEW",
  asignado_a: "",
  ticket: "",
  purchase_id: "",
  is_backup: false,
  backup_distributor_id: "",
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
          is_backup: inventory.is_backup || false,
          backup_distributor_id: inventory.backup_distributor_id || "",
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

  // Filter distributors to exclude DEPOSITO for backup selector
  const backupDistributorOptions = useMemo(() => {
    return distributorOptions.filter(
      (dist) => dist.name?.toUpperCase() !== 'DEPOSITO'
    );
  }, [distributorOptions]);

  const disableSubmit =
    isSaving ||
    isLoading ||
    !formState.imei ||
    !formState.modelo ||
    !formState.distribuidora ||
    !formState.status ||
    (formState.is_backup && !formState.backup_distributor_id);

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
      // Validate backup fields
      if (formState.is_backup && !formState.backup_distributor_id) {
        toast.error("Debe seleccionar una distribuidora de backup cuando el dispositivo es de backup");
        return;
      }

      const payload = {
        modelo: formState.modelo,
        distribuidora: formState.distribuidora,
        status: formState.status,
        asignado_a: formState.asignado_a?.trim() || null,
        ticket: formState.ticket?.trim() || null,
        purchase_id: formState.purchase_id?.trim() || null,
        is_backup: formState.is_backup,
        backup_distributor_id: formState.backup_distributor_id || null,
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
    <BaseModal
      open={open}
      onOpenChange={onOpenChange}
      title="Editar dispositivo"
      subtitle={formState.imei ? `IMEI: ${formState.imei}` : undefined}
      size="md"
      footer={
        <div className="flex justify-end gap-3 w-full">
          <Button color="secondary" onClick={handleClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button color="primary" onClick={handleSave} disabled={disableSubmit}>
            {isSaving ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      }
    >
      {isLoading && !isReady ? (
        <div className="py-12 text-center text-secondary">Cargando información...</div>
      ) : !isReady ? (
        <div className="py-12 text-center text-secondary">Selecciona un dispositivo para editarlo</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
          </Select>

          <Select
            label="Distribuidora"
            placeholder="Seleccione la distribuidora"
            selectedKey={formState.distribuidora}
            onSelectionChange={(value) => setFormState((prev) => ({ ...prev, distribuidora: value as string }))}
            items={distributorOptions as any}
            isDisabled={isLoading}
            isRequired
          >
            {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
          </Select>

          <Select
            label="Estado"
            selectedKey={formState.status}
            onSelectionChange={(value) => setFormState((prev) => ({ ...prev, status: value as string }))}
            items={statusOptions as any}
            isRequired
          >
            {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
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
            label="Ticket de asignación"
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

          {/* Backup Section */}
          <div className="col-span-full border-t border-gray-700 pt-6">
            <div className="flex flex-col space-y-4">
              <Checkbox
                isSelected={!!formState.is_backup}
                onChange={(checked) => {
                  setFormState((prev) => ({ 
                    ...prev,
                    is_backup: checked,
                    backup_distributor_id: checked ? prev.backup_distributor_id : ""
                  }));
                }}
                label="Es dispositivo de backup"
                hint="Marca si este dispositivo está físicamente en una distribuidora como stock de respaldo"
              />

              {formState.is_backup && (
                <Select
                  isRequired
                  label="Distribuidora de backup"
                  placeholder="Seleccione la distribuidora donde está físicamente"
                  selectedKey={formState.backup_distributor_id}
                  onSelectionChange={(value) => setFormState((prev) => ({ ...prev, backup_distributor_id: value as string }))}
                  items={backupDistributorOptions as any}
                  isDisabled={isLoading}
                >
                  {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
                </Select>
              )}
            </div>
          </div>
        </div>
      )}
    </BaseModal>
  );
}
