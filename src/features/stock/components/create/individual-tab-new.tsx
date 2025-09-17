"use client";

import { useEffect } from "react";
import { Input } from "@/components/base/input/input";
import { Select } from "@/components/base/select/select";
import { useCreateStockStore } from "@/store/create-stock.store";
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

  return (
    <div className="space-y-6 flex flex-col gap-4 items-start justify-start p-1">
      <div className="space-y-4 ">
        
          <Input
            id="imei"
            placeholder="Ingrese el IMEI del dispositivo"
            label="IMEI"
            value={individualData.imei}
            onChange={(val) => setIndividualData({ imei: val })}
            isRequired
          />
        


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
              <Select.Item id={item.id} supportingText={item.supportingText} isDisabled={item.isDisabled} icon={item.icon} avatarUrl={item.avatarUrl}>
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
              <Select.Item id={item.id} supportingText={item.supportingText} isDisabled={item.isDisabled} icon={item.icon} avatarUrl={item.avatarUrl}>
                    {item.label}
              </Select.Item>
            )}
          </Select>


        
          <Input
            id="asignado_a"
            placeholder="Nombre de la persona asignada"
            label="Asignado a (opcional)"
            value={individualData.asignado_a}
            onChange={(val) => setIndividualData({ asignado_a: val })}
          />
        

        
          <Input
            id="ticket"
            placeholder="Número de ticket sin DESA-"
            label="Ticket (opcional)"
            value={individualData.ticket}
            onChange={(val) => setIndividualData({ ticket: val })}
          />
      </div>
      

      <div className="rounded-md bg-blue-900/50 border-2 border-blue-400 p-4">
        <div className="flex items-start">
          <InfoCircle className="text-blue-300"/>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-300">
              Dispositivo Individual
            </h3>
            <div className="mt-2 text-sm text-blue-400">
              <p>
                Complete la información del dispositivo. Los campos IMEI, modelo y distribuidora son obligatorios.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}