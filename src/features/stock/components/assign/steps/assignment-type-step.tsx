"use client";

import { RadioButton, RadioGroup } from "@/components/base/radio-buttons/radio-buttons";
import { useAssignDeviceStore } from "@/store/assign-device.store";
import { UserPlus01, RefreshCw01, InfoCircle } from "@untitledui/icons";
import { useShallow } from "zustand/react/shallow";

export function AssignmentTypeStep() {
  const [formData, setFormData, deviceInfo] = useAssignDeviceStore(
    useShallow((s) => [s.formData, s.setFormData, s.deviceInfo])
  );

  const handleTypeChange = (value: string) => {
    const isReplacement = value === "replacement";
    setFormData({
      assignment_type: value as "new" | "replacement",
      expects_return: isReplacement, // Auto-set si es reemplazo
      return_device_imei: isReplacement ? formData.return_device_imei : "",
    });
  };

  return (
    <div className="flex flex-col space-y-6">
      {/* Información del dispositivo */}
      {deviceInfo && (
        <div className="rounded-lg bg-brand-950 border border-brand-700 p-4">
          <h4 className="text-sm font-semibold text-brand-200 mb-2">
            Dispositivo a asignar
          </h4>
          <div className="text-sm text-brand-300 space-y-1">
            <p><span className="font-medium">Nombre:</span> {deviceInfo.device_name || deviceInfo.modelo}</p>
            <p><span className="font-medium">IMEI:</span> {deviceInfo.imei}</p>
            {deviceInfo.model && (
              <p><span className="font-medium">Modelo:</span> {deviceInfo.model}</p>
            )}
          </div>
        </div>
      )}

      {/* Título */}
      <div className="text-center space-y-3">
        <h3 className="text-xl font-semibold text-primary">
          Tipo de Asignación
        </h3>
        <p className="text-sm text-secondary">
          Selecciona si esta es una nueva asignación o un reemplazo de equipo
        </p>
      </div>

      {/* Opciones de tipo */}
      <RadioGroup
        value={formData.assignment_type || "new"}
        onChange={handleTypeChange}
        aria-label="Tipo de asignación"
      >
        {/* Nueva Asignación */}
        <div className="rounded-lg bg-surface-1 border border-surface hover:border-brand-500 transition-colors p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 shrink-0">
              <UserPlus01 className="h-6 w-6 text-brand-600" />
            </div>
            <div className="flex-1">
              <RadioButton
                value="new"
                label="Nueva Asignación"
                hint="Asignación de dispositivo nuevo a un usuario"
              />
              <div className="mt-3 text-sm text-tertiary space-y-1">
                <p>• El dispositivo se asigna por primera vez o es adicional</p>
                <p>• No se espera devolución de equipo anterior (opcional)</p>
                <p>• Ideal para nuevos ingresos o equipos adicionales</p>
              </div>
            </div>
          </div>
        </div>

        {/* Reemplazo */}
        <div className="rounded-lg bg-surface-1 border border-surface hover:border-warning-500 transition-colors p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warning-50 shrink-0">
              <RefreshCw01 className="h-6 w-6 text-warning-600" />
            </div>
            <div className="flex-1">
              <RadioButton
                value="replacement"
                label="Reemplazo de Equipo"
                hint="Sustitución de un dispositivo anterior por uno nuevo"
              />
              <div className="mt-3 text-sm text-tertiary space-y-1">
                <p>• El usuario ya tiene un equipo que debe devolver</p>
                <p>• Se registra el IMEI del dispositivo a devolver</p>
                <p>• Tracking completo de devolución incluido</p>
              </div>
            </div>
          </div>
        </div>
      </RadioGroup>

      {/* Info adicional si es reemplazo */}
      {formData.assignment_type === "replacement" && (
        <div className="rounded-lg bg-warning-950 border border-warning-700 p-4 flex gap-3 items-start">
          <InfoCircle className="w-5 h-5 text-warning-400 mt-0.5 shrink-0" />
          <div className="text-sm text-warning-300">
            <p className="font-medium mb-1">Reemplazo seleccionado</p>
            <p>
              En los siguientes pasos se solicitará el IMEI del dispositivo que el usuario
              debe devolver. El sistema hará seguimiento automático de la devolución.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
