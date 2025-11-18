"use client";

import { useEffect } from "react";
import { Input } from "@/components/base/input/input";
import { Select } from "@/components/base/select/select";
import { TextArea } from "@/components/base/textarea/textarea";
import { useAssignDeviceStore } from "@/store/assign-device.store";
import { useShallow } from "zustand/react/shallow";

export function AssignmentInfoStep() {
  const [
    formData,
    setFormData,
    distributorOptions,
    isLoadingOptions,
    fetchDistributorOptions,
    deviceInfo,
  ] = useAssignDeviceStore(
    useShallow((s) => [
      s.formData,
      s.setFormData,
      s.distributorOptions,
      s.isLoadingOptions,
      s.fetchDistributorOptions,
      s.deviceInfo,
    ])
  );

  // Cargar opciones de distribuidoras al montar el componente
  useEffect(() => {
    fetchDistributorOptions();
  }, [fetchDistributorOptions]);

  return (
    <div className="flex flex-col space-y-4">
      {/* Formulario */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          id="assignee_name"
          label="Nombre y Apellido"
          placeholder="Nombre completo del asignatario"
          value={formData.assignee_name}
          onChange={(val) => setFormData({ assignee_name: val })}
          isRequired
        />

        <Input
          id="assignee_phone"
          label="Teléfono de Contacto"
          placeholder="Número de teléfono"
          value={formData.assignee_phone}
          onChange={(val) => setFormData({ assignee_phone: val })}
          isRequired
        />

        <Input
          id="assignee_email"
          label="Email (Opcional)"
          placeholder="correo@ejemplo.com"
          type="email"
          value={formData.assignee_email}
          onChange={(val) => setFormData({ assignee_email: val })}
        />

        <Select
          isRequired
          label="Distribuidora"
          placeholder="Seleccione la distribuidora"
          selectedKey={formData.distributor_id}
          onSelectionChange={(val) => setFormData({ distributor_id: val as string })}
          items={distributorOptions as any}
          isDisabled={isLoadingOptions}
        >
          {(item) => (
            <Select.Item
              id={item.id}
              supportingText={item.supportingText}
            >
              {item.label}
            </Select.Item>
          )}
        </Select>

        <Input
          id="delivery_location"
          label="Ubicación de Entrega"
          placeholder="Dirección o lugar de entrega"
          value={formData.delivery_location}
          onChange={(val) => setFormData({ delivery_location: val })}
          isRequired
        />

        <div className="sm:col-span-2">
          <TextArea
            id="contact_details"
            label="Contacto Adicional (Opcional)"
            placeholder="Información de contacto adicional o notas importantes"
            value={formData.contact_details}
            onChange={(e) => setFormData({ contact_details: e.target.value })}
            rows={2}
          />
        </div>
      </div>
    </div>
  );
}
