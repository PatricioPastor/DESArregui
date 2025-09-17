"use client";

import { useState } from "react";
import { Input } from "@/components/base/input/input";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { TextArea } from "@/components/base/textarea/textarea";
import { Plus, Trash01 } from "@untitledui/icons";
import { useCreateStockStore } from "@/store/create-stock.store";
import { useShallow } from 'zustand/react/shallow';

// Arrays para los selects - puedes reemplazar estos con calls a API
export const modelOptions = [
  { value: "Samsung A16", label: "Samsung A16" },
  { value: "Samsung A24", label: "Samsung A24" },
  { value: "Samsung A34", label: "Samsung A34" },
  { value: "iPhone 14", label: "iPhone 14" },
  { value: "iPhone 15", label: "iPhone 15" },
  { value: "Motorola Edge 40", label: "Motorola Edge 40" },
  { value: "Xiaomi Redmi Note 12", label: "Xiaomi Redmi Note 12" },
];

export const distributorOptions = [
  { value: "EDEA", label: "EDEA" },
  { value: "EDEN", label: "EDEN" },
  { value: "EDES", label: "EDES" },
  { value: "EDESA", label: "EDESA" },
];

export function BulkTab() {
  const [newImei, setNewImei] = useState("");
  const [bulkImeiText, setBulkImeiText] = useState("");

  const [bulkData, setBulkData, addBulkImei, removeBulkImei, setBulkImeis] = useCreateStockStore(
    useShallow((s) => [s.bulkData, s.setBulkData, s.addBulkImei, s.removeBulkImei, s.setBulkImeis])
  );


  const handleAddImei = () => {
    if (newImei.trim() && !bulkData.imeis.includes(newImei.trim())) {
      addBulkImei(newImei.trim());
      setNewImei("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddImei();
    }
  };

  const processBulkImeis = () => {
    const imeis = bulkImeiText
      .split(/[\n,\s]+/)
      .map(imei => imei.trim())
      .filter(imei => imei.length > 0);

    // Remove duplicates and filter out existing ones
    const uniqueImeis = [...new Set(imeis)].filter(imei => !bulkData.imeis.includes(imei));

    setBulkImeis([...bulkData.imeis, ...uniqueImeis]);
    setBulkImeiText("");
  };

  return (
    <div className="space-y-6 p-1">
      <div className="space-y-4">
        <div className="space-y-2">
          {/* Aquí puedes reemplazar Input por Select usando modelOptions */}
          <Input
            id="bulk-modelo"
            placeholder="Ej: Samsung A16, iPhone 14, etc."
            label="Modelo (para todos los dispositivos)"
            value={bulkData.modelo}
            onChange={(val) => setBulkData({ modelo: val })}
            isRequired
          />
        </div>

        <div className="space-y-2">
          {/* Aquí puedes reemplazar Input por Select usando distributorOptions */}
          <Input
            id="bulk-distribuidora"
            placeholder="Ej: EDEA, EDEN, etc."
            label="Distribuidora (para todos los dispositivos)"
            value={bulkData.distribuidora}
            onChange={(val) => setBulkData({ distribuidora: val })}
            isRequired
          />
        </div>

        <div className="space-y-2">
          <Input
            id="bulk-asignado_a"
            placeholder="Nombre de la persona asignada"
            label="Asignado a (opcional, para todos)"
            value={bulkData.asignado_a}
            onChange={(val) => setBulkData({ asignado_a: val })}
          />
        </div>

        <div className="space-y-2">
          <Input
            id="bulk-ticket"
            placeholder="Número de ticket sin DESA-"
            label="Ticket (opcional, para todos)"
            value={bulkData.ticket}
            onChange={(val) => setBulkData({ ticket: val })}
          />
        </div>
      </div>

      <div className="border-t border-secondary pt-6">
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-primary">IMEIs de los dispositivos</h3>

          {/* Add single IMEI */}
          <div className="flex gap-2">
            <Input
              placeholder="Agregar IMEI individual"
              value={newImei}
              onChange={(val) => setNewImei(val)}
              onKeyDown={handleKeyDown}
              className="flex-1"
            />
            <Button
              size="md"
              color="secondary"
              iconLeading={Plus}
              onClick={handleAddImei}
              disabled={!newImei.trim()}
            >
              Agregar
            </Button>
          </div>

          {/* Bulk IMEI input */}
          <div className="space-y-2">
            <label htmlFor="bulk-imeis" className="text-sm font-medium text-primary">
              O pegar múltiples IMEIs (separados por líneas, comas o espacios)
            </label>
            {/* <TextArea
              id="bulk-imeis"
              placeholder="Pegue aquí múltiples IMEIs separados por líneas, comas o espacios"
              value={bulkImeiText}
              onChange={(val) => setBulkImeiText(val)}
              rows={4}
            /> */}
            <Button
              size="sm"
              color="secondary"
              onClick={processBulkImeis}
              disabled={!bulkImeiText.trim()}
            >
              Procesar IMEIs
            </Button>
          </div>

          {/* IMEI List */}
          {bulkData.imeis.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-primary">
                IMEIs agregados ({bulkData.imeis.length})
              </h4>
              <div className="max-h-40 overflow-y-auto border border-secondary rounded-md p-3 space-y-2">
                {bulkData.imeis.map((imei, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 rounded px-3 py-2">
                    <span className="font-mono text-sm">{imei}</span>
                    <ButtonUtility
                      size="xs"
                      color="tertiary"
                      icon={Trash01}
                      onClick={() => removeBulkImei(index)}
                      tooltip="Eliminar IMEI"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-md bg-orange-50 border border-orange-200 p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-orange-800">
              Creación Masiva
            </h3>
            <div className="mt-2 text-sm text-orange-700">
              <p>
                Todos los dispositivos compartirán el modelo, distribuidora y datos opcionales.
                Solo necesita agregar los IMEIs únicos para cada dispositivo.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}