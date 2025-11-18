"use client";

import { RadioButton, RadioGroup } from "@/components/base/radio-buttons/radio-buttons";
import { useAssignDeviceStore } from "@/store/assign-device.store";
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
    <div className="flex flex-col space-y-4">
      {/* Información del dispositivo - Compacta */}
      {deviceInfo && (
        <div className="bg-surface-1 border border-surface rounded-lg p-3">
          <div className="flex items-center gap-3 text-sm">
            <span className="text-secondary">Dispositivo:</span>
            <span className="font-medium text-primary">{deviceInfo.device_name || deviceInfo.modelo}</span>
            <span className="text-tertiary">•</span>
            <span className="font-mono text-xs text-secondary">{deviceInfo.imei}</span>
          </div>
        </div>
      )}

      {/* Opciones de tipo - Compactas */}
      <RadioGroup
        value={formData.assignment_type || "new"}
        onChange={handleTypeChange}
        aria-label="Tipo de asignación"
      >
        <RadioButton
          value="new"
          label="Nueva Asignación"
          hint="Dispositivo nuevo o adicional"
        />
        <RadioButton
          value="replacement"
          label="Reemplazo de Equipo"
          hint="Sustitución de dispositivo anterior"
        />
      </RadioGroup>
    </div>
  );
}
