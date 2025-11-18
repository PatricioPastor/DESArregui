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
    <div className="flex flex-col space-y-4">

      {/* Switch para activar devolución - Compacto */}
      <div className="bg-surface-1 border border-surface rounded-lg p-3">
        <div className="flex items-center gap-3">
          <Switch
            isSelected={formData.expects_return}
            onChange={handleExpectsReturnChange}
          />
          <label className="text-sm font-medium text-primary cursor-pointer">
            Se espera devolución de dispositivo
          </label>
        </div>

        {/* Campo condicional para IMEI */}
        {formData.expects_return && (
          <div className="mt-3 space-y-2">
            <Input
              id="return_device_imei"
              label="IMEI del dispositivo a devolver"
              placeholder="Ingrese el IMEI del equipo que será devuelto"
              value={formData.return_device_imei}
              onChange={(val) => setFormData({ return_device_imei: val })}
              isRequired
              hint={imeiValidation.isValidating ? "Validando IMEI..." : "IMEI del dispositivo a devolver"}
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

    </div>
  );
}
