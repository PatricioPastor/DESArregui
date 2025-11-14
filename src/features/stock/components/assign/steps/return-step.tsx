"use client";

import { useState, useEffect } from "react";
import { Switch } from "@/components/base/switch/switch";
import { Input } from "@/components/base/input/input";
import { Button } from "@/components/base/buttons/button";
import { useAssignDeviceStore } from "@/store/assign-device.store";
import { InfoCircle, RefreshCw01, AlertCircle, Plus } from "@untitledui/icons";
import { useShallow } from "zustand/react/shallow";
import { toast } from "sonner";

interface IMEIValidation {
  isValid: boolean | null; // null = no validado, true = existe, false = no existe
  isValidating: boolean;
  deviceInfo?: {
    id: string;
    model: string;
    status: string;
  };
}

export function ReturnStep() {
  const [formData, setFormData] = useAssignDeviceStore(
    useShallow((s) => [s.formData, s.setFormData])
  );

  const [imeiValidation, setImeiValidation] = useState<IMEIValidation>({
    isValid: null,
    isValidating: false,
  });

  const handleExpectsReturnChange = (checked: boolean) => {
    setFormData({
      expects_return: checked,
      return_device_imei: checked ? formData.return_device_imei : ''
    });

    // Reset validación al desactivar
    if (!checked) {
      setImeiValidation({ isValid: null, isValidating: false });
    }
  };

  // Validar IMEI cuando cambia (con debounce)
  useEffect(() => {
    if (!formData.expects_return || !formData.return_device_imei.trim()) {
      setImeiValidation({ isValid: null, isValidating: false });
      return;
    }

    const imei = formData.return_device_imei.trim();
    if (imei.length < 10) {
      setImeiValidation({ isValid: null, isValidating: false });
      return;
    }

    const timeoutId = setTimeout(async () => {
      setImeiValidation({ isValid: null, isValidating: true });

      try {
        const response = await fetch(`/api/stock?imei=${encodeURIComponent(imei)}`);
        const data = await response.json();

        if (response.ok && data.data && data.data.length > 0) {
          const device = data.data[0];
          setImeiValidation({
            isValid: true,
            isValidating: false,
            deviceInfo: {
              id: device.raw?.id,
              model: device.modelo,
              status: device.status,
            },
          });
        } else {
          setImeiValidation({ isValid: false, isValidating: false });
        }
      } catch (error) {
        console.error('Error validating IMEI:', error);
        setImeiValidation({ isValid: null, isValidating: false });
        toast.error('Error al validar el IMEI');
      }
    }, 800);

    return () => clearTimeout(timeoutId);
  }, [formData.return_device_imei, formData.expects_return]);

  return (
    <div className="flex flex-col space-y-6">
      {/* Ícono y título */}
      <div className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-purple-900/40 flex items-center justify-center">
          <RefreshCw01 className="w-8 h-8 text-purple-400" />
        </div>
        
        <div>
          <h3 className="text-lg font-semibold text-primary mb-2">
            Gestión de Devolución
          </h3>
          <p className="text-sm text-secondary">
            Registra si se espera la devolución de otro dispositivo
          </p>
        </div>
      </div>

      {/* Switch para activar devolución */}
      <div className="rounded-lg bg-gray-900/40 border border-gray-700 p-6">
        <div className="flex items-start gap-4">
          <Switch
            isSelected={formData.expects_return}
            onChange={handleExpectsReturnChange}
            className="mt-1"
          />
          <div className="flex-1">
            <label className="text-base font-medium text-primary cursor-pointer">
              ¿Se espera la devolución de otro dispositivo?
            </label>
            <p className="mt-1 text-sm text-secondary">
              Activa esta opción si el asignatario debe devolver un equipo anterior
            </p>
          </div>
        </div>

        {/* Campo condicional para IMEI */}
        {formData.expects_return && (
          <div className="mt-6 pl-12 space-y-3">
            <Input
              id="return_device_imei"
              label="IMEI del dispositivo a devolver"
              placeholder="Ingrese el IMEI del equipo que será devuelto"
              value={formData.return_device_imei}
              onChange={(val) => setFormData({ return_device_imei: val })}
              isRequired
              hint={imeiValidation.isValidating ? "Validando IMEI..." : "Este IMEI será registrado para seguimiento de la devolución"}
            />

            {/* Estado de validación */}
            {imeiValidation.isValid === true && imeiValidation.deviceInfo && (
              <div className="rounded-lg bg-green-900/20 border border-green-700/50 p-3 flex gap-2 items-start">
                <InfoCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-green-300">
                  <p className="font-medium">✓ Dispositivo encontrado</p>
                  <p className="mt-1">
                    {imeiValidation.deviceInfo.model} - Estado: {imeiValidation.deviceInfo.status}
                  </p>
                </div>
              </div>
            )}

            {imeiValidation.isValid === false && (
              <div className="rounded-lg bg-yellow-900/20 border border-yellow-700/50 p-3 space-y-3">
                <div className="flex gap-2 items-start">
                  <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-yellow-300 flex-1">
                    <p className="font-medium">⚠ Dispositivo no encontrado en el inventario</p>
                    <p className="mt-1">
                      El IMEI no está registrado. Puedes continuar con la asignación
                      o registrar el dispositivo ahora.
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  color="secondary"
                  iconLeading={Plus}
                  onClick={() => {
                    window.open(`/stock?action=create&imei=${formData.return_device_imei}`, '_blank');
                  }}
                >
                  Registrar Dispositivo Ahora
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Información del vale generado */}
      {formData.generate_voucher && (
        <div className="rounded-lg bg-green-900/20 border border-green-700/50 p-4">
          <div className="flex items-start gap-3">
            <InfoCircle className="w-5 h-5 text-green-400 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-green-200 mb-1">
                Vale de envío
              </h4>
              <p className="text-sm text-green-300">
                Se generará un vale de envío con código único para esta asignación.
                {formData.expects_return && ' La información de devolución quedará registrada en el vale.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Resumen final */}
      <div className="rounded-lg bg-blue-900/20 border border-blue-700/50 p-4">
        <h4 className="text-sm font-semibold text-blue-200 mb-3">
          Resumen de la asignación
        </h4>
        <div className="text-sm text-blue-300 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <p><span className="font-medium">Asignatario:</span> {formData.assignee_name}</p>
            <p><span className="font-medium">Teléfono:</span> {formData.assignee_phone}</p>
            <p><span className="font-medium">Ubicación:</span> {formData.delivery_location}</p>
            <p><span className="font-medium">Vale de envío:</span> {formData.generate_voucher ? 'Sí' : 'No'}</p>
          </div>
          {formData.expects_return && (
            <p className="pt-2 border-t border-blue-700/50">
              <span className="font-medium">IMEI a devolver:</span> {formData.return_device_imei || 'Pendiente'}
            </p>
          )}
        </div>
      </div>

      {/* Nota informativa */}
      <div className="rounded-lg bg-yellow-900/20 border border-yellow-700/50 p-4 flex gap-3 items-start">
        <InfoCircle className="w-5 h-5 text-yellow-400 mt-0.5" />
        <div className="text-sm text-yellow-300">
          <p className="font-medium mb-1">Nota importante:</p>
          <p>
            Al confirmar la asignación, el estado del dispositivo cambiará a "ASSIGNED" y 
            se generará un registro completo de la operación en el sistema.
          </p>
        </div>
      </div>
    </div>
  );
}
