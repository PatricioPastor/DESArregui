"use client";

import { useEffect, useState } from "react";
import { BaseModal } from "@/components/modals/base-modal";
import { Button } from "@/components/base/buttons/button";
import { TextArea } from "@/components/base/textarea/textarea";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { Input } from "@/components/base/input/input";
import { PackageCheck, AlertCircle, CheckCircle, SearchLg } from "@untitledui/icons";
import { toast } from "sonner";
import { useRegisterReturnStore } from "./register-return.store";
import { formatInventoryDate } from "@/lib/inventory-utils";

interface RegisterReturnModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignmentInfo: {
    id: string;
    assignee_name: string;
    return_device_imei: string;
    at: string;
  };
  onSuccess?: () => void;
}

export function RegisterReturnModal({
  open,
  onOpenChange,
  assignmentInfo,
  onSuccess,
}: RegisterReturnModalProps) {
  const {
    isLoading,
    error,
    returnReceived,
    returnNotes,
    setAssignmentInfo,
    setReturnReceived,
    setReturnNotes,
    registerReturn,
    resetState,
  } = useRegisterReturnStore();

  const [imeiToVerify, setImeiToVerify] = useState("");
  const [deviceFound, setDeviceFound] = useState<{
    found: boolean;
    model?: string;
    status?: string;
  } | null>(null);
  const [isValidatingImei, setIsValidatingImei] = useState(false);

  // Cargar información de la asignación al abrir
  useEffect(() => {
    if (open) {
      setAssignmentInfo(assignmentInfo);
      setImeiToVerify(assignmentInfo.return_device_imei || "");
      setDeviceFound(null);
    }
  }, [open, assignmentInfo, setAssignmentInfo]);

  // Validar IMEI cuando cambia
  useEffect(() => {
    if (!imeiToVerify.trim() || imeiToVerify === assignmentInfo.return_device_imei) {
      setDeviceFound(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      if (imeiToVerify.length < 10) {
        setDeviceFound(null);
        return;
      }

      setIsValidatingImei(true);
      try {
        const response = await fetch(`/api/stock?imei=${encodeURIComponent(imeiToVerify)}`);
        const data = await response.json();

        if (response.ok && data.data && data.data.length > 0) {
          const device = data.data[0];
          setDeviceFound({
            found: true,
            model: device.modelo,
            status: device.status,
          });
        } else {
          setDeviceFound({ found: false });
        }
      } catch (error) {
        console.error("Error validating IMEI:", error);
        setDeviceFound(null);
      } finally {
        setIsValidatingImei(false);
      }
    }, 800);

    return () => clearTimeout(timeoutId);
  }, [imeiToVerify, assignmentInfo.return_device_imei]);

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    const result = await registerReturn();

    if (result.success) {
      toast.success(result.message || "Devolución registrada exitosamente");

      setTimeout(() => {
        handleClose();
        onSuccess?.();
      }, 1500);
    } else {
      toast.error(result.message || "Error al registrar la devolución");
    }
  };

  return (
    <BaseModal
      open={open}
      onOpenChange={onOpenChange}
      title="Registrar Devolución"
      subtitle={`Asignado a: ${assignmentInfo.assignee_name}`}
      size="md"
      footer={
        <div className="flex justify-end gap-3 w-full">
          <Button color="secondary" onClick={handleClose} isDisabled={isLoading}>
            Cancelar
          </Button>
          <Button
            color="primary"
            onClick={handleSubmit}
            isDisabled={!returnReceived || isLoading}
            isLoading={isLoading}
            iconLeading={returnReceived ? CheckCircle : undefined}
          >
            {returnReceived ? "Confirmar Devolución" : "Selecciona la confirmación"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Información de la asignación */}
        <div className="bg-surface-1 border border-surface rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-secondary">Fecha de asignación</span>
            <span className="text-primary">{formatInventoryDate(assignmentInfo.at)}</span>
          </div>
        </div>

        {/* Gestión del IMEI */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <PackageCheck className="h-4 w-4 text-secondary" />
            <h3 className="text-sm font-semibold text-primary">IMEI del dispositivo devuelto</h3>
          </div>

          <div className="bg-surface-1 border border-surface rounded-lg p-3 space-y-3">
            <div>
              <Input
                label="IMEI registrado en la asignación"
                value={assignmentInfo.return_device_imei}
                isDisabled
                icon={SearchLg}
              />
            </div>

            <div className="text-xs text-secondary">
              Si el IMEI recibido es diferente, puedes verificarlo aquí:
            </div>

            <Input
              label="Verificar IMEI recibido (opcional)"
              placeholder="Ingresa el IMEI del dispositivo recibido"
              value={imeiToVerify}
              onChange={(val) => setImeiToVerify(val)}
              icon={SearchLg}
              isLoading={isValidatingImei}
            />

            {deviceFound?.found === true && (
              <div className="bg-success-50 border border-success-200 rounded-lg p-3 flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-success-600 mt-0.5 shrink-0" />
                <div className="text-xs text-success-700">
                  <p className="font-medium">Dispositivo encontrado en inventario</p>
                  <p className="mt-1">Modelo: {deviceFound.model} • Estado: {deviceFound.status}</p>
                </div>
              </div>
            )}

            {deviceFound?.found === false && (
              <div className="bg-warning-50 border border-warning-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-warning-600 mt-0.5 shrink-0" />
                <div className="text-xs text-warning-700">
                  <p className="font-medium">Dispositivo no encontrado</p>
                  <p className="mt-1">Este IMEI no está registrado en el inventario</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Confirmación */}
        <div className="bg-surface-1 border border-surface rounded-lg p-3">
          <Checkbox
            isSelected={returnReceived}
            onChange={(isSelected) => setReturnReceived(isSelected)}
            label="Confirmo que recibí el dispositivo físicamente"
            hint="Marca esta casilla solo si el dispositivo fue devuelto"
          />
        </div>

        {/* Notas */}
        <TextArea
          label="Notas sobre el estado del dispositivo (opcional)"
          placeholder="Describe el estado físico, accesorios incluidos, daños, etc."
          value={returnNotes}
          onChange={(e) => setReturnNotes(e.target.value)}
          rows={3}
        />

        {/* Info importante */}
        <div className="bg-brand-50 border border-brand-200 rounded-lg p-3 flex gap-2">
          <AlertCircle className="h-4 w-4 text-brand-600 mt-0.5 shrink-0" />
          <div className="text-xs text-brand-700">
            <p className="font-medium">Al confirmar:</p>
            <p className="mt-1">• El dispositivo se marcará como "USADO"</p>
            <p>• Quedará disponible para reasignación</p>
            <p>• La asignación estará lista para cerrar</p>
          </div>
        </div>

        {error && (
          <div className="bg-error-50 border border-error-200 text-error-700 rounded-lg p-3 text-sm">
            {error}
          </div>
        )}
      </div>
    </BaseModal>
  );
}
