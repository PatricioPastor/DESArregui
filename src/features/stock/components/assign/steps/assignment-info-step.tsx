"use client";

import { useEffect } from "react";
import { Input } from "@/components/base/input/input";
import { Select } from "@/components/base/select/select";
import { TextArea } from "@/components/base/textarea/textarea";
import { useAssignDeviceStore } from "@/store/assign-device.store";
import { InfoCircle } from "@untitledui/icons";
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
    <div className="flex flex-col space-y-6">
      {/* Información del dispositivo */}
      {deviceInfo && (
        <div className="rounded-lg bg-blue-900/20 border border-blue-700/50 p-4">
          <h4 className="text-sm font-semibold text-blue-200 mb-2">
            Dispositivo a asignar
          </h4>
          <div className="text-sm text-blue-300 space-y-1">
            <p><span className="font-medium">Nombre:</span> {deviceInfo.device_name}</p>
            <p><span className="font-medium">IMEI:</span> {deviceInfo.imei}</p>
            {deviceInfo.model && (
              <p><span className="font-medium">Modelo:</span> {deviceInfo.model}</p>
            )}
          </div>
        </div>
      )}

      {/* Formulario */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
          hint="Si no tiene el del asignatario, puede ser el de quien reporta"
        />

        <Input
          id="assignee_email"
          label="Email (Opcional)"
          placeholder="correo@ejemplo.com"
          type="email"
          value={formData.assignee_email}
          onChange={(val) => setFormData({ assignee_email: val })}
          hint="Para notificaciones de envío y recordatorios de devolución"
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
            rows={3}
          />
        </div>
      </div>

      {/* Info Box */}
      <div className="rounded-lg bg-blue-900/40 border border-blue-700 p-5 flex gap-4 items-start">
        <div className="mt-1 text-blue-400">
          <InfoCircle className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-blue-200 mb-1">
            Información de la Asignación
          </h3>
          <p className="text-sm text-blue-300 leading-relaxed">
            Complete los datos del asignatario. Todos los campos marcados con asterisco (*) son obligatorios.
            Esta información será utilizada para generar el registro de asignación y el seguimiento del dispositivo.
          </p>
        </div>
      </div>
    </div>
  );
}
