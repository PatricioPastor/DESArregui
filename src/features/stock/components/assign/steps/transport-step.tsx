"use client";

import { RadioButton, RadioGroup } from "@/components/base/radio-buttons/radio-buttons";
import { useAssignDeviceStore } from "@/store/assign-device.store";
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
    <div className="flex flex-col space-y-4">
      {/* Opciones de transporte - Compactas */}
      <RadioGroup
        value={formData.generate_voucher ? "with_shipping" : "in_person"}
        onChange={handleTransportChange}
        aria-label="Método de entrega"
      >
        <RadioButton
          value="with_shipping"
          label="Con Envío"
          hint="Se generará vale de envío con tracking"
        />
        <RadioButton
          value="in_person"
          label="Entrega en Persona"
          hint="Sin vale de envío, entrega inmediata"
        />
      </RadioGroup>
    </div>
  );
}
