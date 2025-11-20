"use client";

import { useEffect, useMemo } from "react";
import { Input } from "@/components/base/input/input";
import { Select } from "@/components/base/select/select";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { useCreateStockStore } from "@/store/create-stock.store";
import { DEVICE_STATUS_OPTIONS } from "@/constants/device-status";
import { InfoCircle } from "@untitledui/icons";
import { useShallow } from "zustand/react/shallow";

export function IndividualTab() {
  const [
    individualData,
    setIndividualData,
    modelOptions,
    distributorOptions,
    isLoadingOptions,
    fetchAllOptions
  ] = useCreateStockStore(
    useShallow((s) => [
      s.individualData,
      s.setIndividualData,
      s.modelOptions,
      s.distributorOptions,
      s.isLoadingOptions,
      s.fetchAllOptions
    ])
  );

  useEffect(() => {
    fetchAllOptions();
  }, [fetchAllOptions]);

  // Filter distributors to exclude DEPOSITO for backup selector
  const backupDistributorOptions = useMemo(() => {
    return distributorOptions.filter(
      (dist) => dist.name?.toUpperCase() !== 'DEPOSITO'
    );
  }, [distributorOptions]);

  return (
    <div className="flex flex-col space-y-6">
      {/* Inputs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Input
          id="imei"
          label="IMEI"
          placeholder="Ingrese el IMEI del dispositivo"
          value={individualData.imei}
          onChange={(val) => setIndividualData({ imei: val })}
          isRequired
        />

        <Select
          isRequired
          label="Estado"
          placeholder="Seleccione el estado del dispositivo"
          selectedKey={individualData.status}
          onSelectionChange={(val) => setIndividualData({ status: val as string })}
          items={DEVICE_STATUS_OPTIONS as any}
        >
          {(item) => (
            <Select.Item id={item.id}>
              {item.label}
            </Select.Item>
          )}
        </Select>

        <Select
          isRequired
          label="Modelo"
          placeholder="Seleccione el modelo del dispositivo"
          selectedKey={individualData.modelo}
          onSelectionChange={(val) => setIndividualData({ modelo: val as string })}
          items={modelOptions as any}
          isDisabled={isLoadingOptions}
        >
          {(item) => (
            <Select.Item
              id={item.id}
              supportingText={item.supportingText}
              isDisabled={item.isDisabled}
              icon={item.icon}
              avatarUrl={item.avatarUrl}
            >
              {item.label}
            </Select.Item>
          )}
        </Select>

        <Select
          isRequired
          label="Distribuidora"
          placeholder="Seleccione la distribuidora"
          selectedKey={individualData.distribuidora}
          onSelectionChange={(val) => setIndividualData({ distribuidora: val as string })}
          items={distributorOptions as any}
          isDisabled={isLoadingOptions}
        >
          {(item) => (
            <Select.Item
              id={item.id}
              supportingText={item.supportingText}
              isDisabled={item.isDisabled}
              icon={item.icon}
              avatarUrl={item.avatarUrl}
            >
              {item.label}
            </Select.Item>
          )}
        </Select>

        <Input
          id="asignado_a"
          label="Asignado a (opcional)"
          placeholder="Nombre de la persona asignada"
          value={individualData.asignado_a}
          onChange={(val) => setIndividualData({ asignado_a: val })}
        />

        <Input
          id="ticket"
          label="Ticket de asignacion (opcional)"
          placeholder="Número de ticket sin DESA-"
          value={individualData.ticket}
          onChange={(val) => setIndividualData({ ticket: val })}
        />

        <Input
          id="purchase_id"
          label="Ticket de compra (opcional)"
          placeholder="Identificador de compra"
          value={individualData.purchase_id}
          onChange={(val) => setIndividualData({ purchase_id: val })}
        />
      </div>

      {/* Backup Section */}
      <div className="border-t border-gray-700 pt-6">
        <div className="flex flex-col space-y-4">
          <Checkbox
            isSelected={individualData.is_backup || false}
            onChange={(checked) => {
              setIndividualData({ 
                is_backup: checked,
                backup_distributor_id: checked ? undefined : undefined
              });
            }}
            label="Es dispositivo de backup"
            hint="Marca si este dispositivo está físicamente en una distribuidora como stock de respaldo"
          />

          {individualData.is_backup && (
            <Select
              isRequired
              label="Distribuidora de backup"
              placeholder="Seleccione la distribuidora donde está físicamente"
              selectedKey={individualData.backup_distributor_id}
              onSelectionChange={(val) => setIndividualData({ backup_distributor_id: val as string })}
              items={backupDistributorOptions as any}
              isDisabled={isLoadingOptions}
            >
              {(item) => (
                <Select.Item
                  id={item.id}
                  supportingText={item.supportingText}
                  isDisabled={item.isDisabled}
                  icon={item.icon}
                  avatarUrl={item.avatarUrl}
                >
                  {item.label}
                </Select.Item>
              )}
            </Select>
          )}
        </div>
      </div>

      {/* Info Box */}
      <div className="rounded-lg bg-blue-900/40 border border-blue-700 p-5 flex gap-4 items-start">
        <div className="mt-1 text-blue-400">
          <InfoCircle className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-blue-200 mb-1">
            Dispositivo Individual
          </h3>
          <p className="text-sm text-blue-300 leading-relaxed">
            Complete la información del dispositivo. Los campos <strong>IMEI</strong>, <strong>modelo</strong> y <strong>distribuidora</strong> son obligatorios.
          </p>
        </div>
      </div>
    </div>
  );
}
