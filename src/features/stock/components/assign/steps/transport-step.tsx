"use client";

import { RadioButton, RadioGroup } from "@/components/base/radio-buttons/radio-buttons";
import { useAssignDeviceStore } from "@/store/assign-device.store";
import { Truck01, UserCheck01, InfoCircle } from "@untitledui/icons";
import { useShallow } from "zustand/react/shallow";

export function TransportStep() {
  const [formData, setFormData] = useAssignDeviceStore(
    useShallow((s) => [s.formData, s.setFormData])
  );

  const handleTransportChange = (value: string) => {
    const withTransport = value === "with_shipping";
    setFormData({
      generate_voucher: withTransport,
    });
  };

  return (
    <div className="flex flex-col space-y-6">
      {/* Título */}
      <div className="text-center space-y-3">
        <h3 className="text-xl font-semibold text-primary">
          Método de Entrega
        </h3>
        <p className="text-sm text-secondary">
          ¿Cómo se entregará el dispositivo al usuario?
        </p>
      </div>

      {/* Opciones de transporte */}
      <RadioGroup
        value={formData.generate_voucher ? "with_shipping" : "in_person"}
        onChange={handleTransportChange}
        aria-label="Método de entrega"
      >
        {/* Con Envío */}
        <div className="rounded-lg bg-surface-1 border border-surface hover:border-brand-500 transition-colors p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 shrink-0">
              <Truck01 className="h-6 w-6 text-brand-600" />
            </div>
            <div className="flex-1">
              <RadioButton
                value="with_shipping"
                label="Con Envío"
                hint="El dispositivo se enviará por correo o mensajería"
              />
              <div className="mt-3 text-sm text-tertiary space-y-1">
                <p>• Se genera un vale de envío con código único</p>
                <p>• Tracking completo del estado (pendiente → enviado → entregado)</p>
                <p>• Ideal para usuarios en sucursales remotas</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sin Envío (Entrega en Persona) */}
        <div className="rounded-lg bg-surface-1 border border-surface hover:border-success-500 transition-colors p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success-50 shrink-0">
              <UserCheck01 className="h-6 w-6 text-success-600" />
            </div>
            <div className="flex-1">
              <RadioButton
                value="in_person"
                label="Entrega en Persona"
                hint="El dispositivo se entrega directamente al usuario"
              />
              <div className="mt-3 text-sm text-tertiary space-y-1">
                <p>• Sin vale de envío ni tracking de transporte</p>
                <p>• Asignación inmediata sin estados intermedios</p>
                <p>• Ideal para entregas en la misma ubicación</p>
              </div>
            </div>
          </div>
        </div>
      </RadioGroup>

      {/* Info adicional según selección */}
      {formData.generate_voucher ? (
        <div className="rounded-lg bg-brand-950 border border-brand-700 p-4 flex gap-3 items-start">
          <InfoCircle className="w-5 h-5 text-brand-400 mt-0.5 shrink-0" />
          <div className="text-sm text-brand-300">
            <p className="font-medium mb-1">Vale de envío</p>
            <p>
              Se generará un código único (ej: ENV-20251112-AB3CD) para trackear el envío.
              Podrás actualizar el estado del envío desde la vista de Stock.
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-lg bg-success-950 border border-success-700 p-4 flex gap-3 items-start">
          <InfoCircle className="w-5 h-5 text-success-400 mt-0.5 shrink-0" />
          <div className="text-sm text-success-300">
            <p className="font-medium mb-1">Entrega inmediata</p>
            <p>
              La asignación se registrará como entregada inmediatamente.
              No habrá estados de tracking de transporte.
            </p>
          </div>
        </div>
      )}

      {/* Resumen de datos ingresados */}
      <div className="rounded-lg bg-surface-2 border border-surface p-4">
        <h4 className="text-sm font-semibold text-secondary mb-3">
          Resumen hasta ahora
        </h4>
        <div className="text-sm text-tertiary space-y-1">
          <p><span className="font-medium text-secondary">Tipo:</span> {
            formData.assignment_type === "replacement" ? "Reemplazo" : "Nueva Asignación"
          }</p>
          <p><span className="font-medium text-secondary">Método de entrega:</span> {
            formData.generate_voucher ? "Con Envío" : "Entrega en Persona"
          }</p>
          {formData.assignment_type === "replacement" && (
            <p className="pt-2 border-t border-surface">
              <span className="font-medium text-warning-400">Se esperará devolución del equipo anterior</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
