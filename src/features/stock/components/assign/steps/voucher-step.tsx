"use client";

import { Button } from "@/components/base/buttons/button";
import { useAssignDeviceStore } from "@/store/assign-device.store";
import { File01, X } from "@untitledui/icons";
import { useShallow } from "zustand/react/shallow";

export function VoucherStep() {
  const [formData, setFormData, nextStep] = useAssignDeviceStore(
    useShallow((s) => [s.formData, s.setFormData, s.nextStep])
  );

  const handleGenerateVoucher = () => {
    setFormData({ generate_voucher: true });
    nextStep();
  };

  const handleSkipVoucher = () => {
    setFormData({ generate_voucher: false, expects_return: false, return_device_imei: '' });
    // Si no genera vale, saltamos directamente al submit
    nextStep();
  };

  return (
    <div className="flex flex-col space-y-5">
      {/* Ícono y título */}
      <div className="text-center space-y-3">
        <div className="mx-auto w-12 h-12 rounded-full bg-blue-900/40 flex items-center justify-center">
          <File01 className="w-6 h-6 text-blue-400" />
        </div>
        
        <div>
          <h3 className="text-lg font-semibold text-primary mb-1">
            Generación de Vale de Envío
          </h3>
          <p className="text-sm text-secondary">
            ¿Deseas generar un vale de envío para esta asignación?
          </p>
        </div>
      </div>

      {/* Información sobre el vale */}
      <div className="rounded-lg bg-gray-900/40 border border-gray-700 p-3 space-y-2">
        <h4 className="text-sm font-semibold text-gray-200">
          ¿Qué incluye el vale de envío?
        </h4>
        <ul className="space-y-1 text-sm text-gray-300">
          <li className="flex items-start gap-2">
            <span className="text-green-400 mt-0.5">•</span>
            <span>Un código único de seguimiento (ENV-YYYYMMDD-XXXXX)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-400 mt-0.5">•</span>
            <span>Información del asignatario y dispositivo</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-400 mt-0.5">•</span>
            <span>Datos de la distribuidora encargada del envío</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-400 mt-0.5">•</span>
            <span>Opción de registrar devolución de equipo anterior</span>
          </li>
        </ul>
      </div>

      {/* Resumen de datos ingresados */}
      <div className="rounded-lg bg-blue-900/20 border border-blue-700/50 p-3">
        <h4 className="text-sm font-semibold text-blue-200 mb-2">
          Resumen de la asignación
        </h4>
        <div className="text-sm text-blue-300 space-y-1">
          <p><span className="font-medium">Asignatario:</span> {formData.assignee_name || 'No especificado'}</p>
          <p><span className="font-medium">Teléfono:</span> {formData.assignee_phone || 'No especificado'}</p>
          <p><span className="font-medium">Ubicación:</span> {formData.delivery_location || 'No especificada'}</p>
        </div>
      </div>

      {/* Botones de acción */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
        <Button
          color="primary"
          size="lg"
          onClick={handleGenerateVoucher}
          className="min-w-[200px]"
          iconLeading={File01}
        >
          Sí, generar vale
        </Button>
        
        <Button
          color="secondary"
          size="lg"
          onClick={handleSkipVoucher}
          className="min-w-[200px]"
          iconLeading={X}
        >
          No, asignar sin vale
        </Button>
      </div>
    </div>
  );
}
