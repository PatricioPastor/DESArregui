"use client";

import { useEffect, useRef } from "react";
import { BaseModal } from "@/components/modals/base-modal";
import { Button } from "@/components/base/buttons/button";
import { useAssignDeviceStore } from "@/store/assign-device.store";
import { useShallow } from "zustand/react/shallow";
import { AssignmentTypeStep } from "./steps/assignment-type-step";
import { TransportStep } from "./steps/transport-step";
import { AssignmentInfoStep } from "./steps/assignment-info-step";
import { ReturnStep } from "./steps/return-step";
import { ChevronLeft, ChevronRight, Check } from "@untitledui/icons";
import { toast } from "sonner";

interface AssignDeviceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deviceId: string | null;
  deviceName: string | null;
  deviceInfo?: any;
  onSuccess?: () => void;
}

export function AssignDeviceModal({ 
  open, 
  onOpenChange, 
  deviceId,
  deviceInfo,
  deviceName,
  onSuccess 
}: AssignDeviceModalProps) {
  const hasInitialized = useRef(false);
  
  const [
    currentStep,
    setCurrentStep,
    nextStep,
    previousStep,
    resetState,
    submit,
    isLoading,
    formData,
    error,
    setDeviceId,
    setDeviceInfo,
  ] = useAssignDeviceStore(
    useShallow((s) => [
      s.currentStep,
      s.setCurrentStep,
      s.nextStep,
      s.previousStep,
      s.resetState,
      s.submit,
      s.isLoading,
      s.formData,
      s.error,
      s.setDeviceId,
      s.setDeviceInfo,
    ])
  );

  // Configurar el dispositivo cuando se abre el modal
  useEffect(() => {
    if (open && !hasInitialized.current) {
      hasInitialized.current = true;
      resetState();
      if (deviceId) {
        setDeviceId(deviceId);
        setDeviceInfo(deviceInfo);
      }
    }
  }, [open, deviceId, deviceInfo, resetState, setDeviceId, setDeviceInfo]);

  // Reset cuando se cierra el modal
  useEffect(() => {
    if (!open) {
      hasInitialized.current = false;
    }
  }, [open]);

  // Mostrar error si existe
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleNext = () => {
    nextStep();
  };

  const handlePrevious = () => {
    previousStep();
  };

  const handleSubmit = async () => {
    try {
      const result = await submit();
      
      if (result.success) {
        toast.success(result.message || 'Asignación creada exitosamente');
        
        // Si se generó un vale, mostrar el ID
        if (result.data?.shipping_voucher_id) {
          toast.info(`Vale de envío: ${result.data.shipping_voucher_id}`);
        }
        
        onSuccess?.();
        
        setTimeout(() => {
          handleClose();
        }, 1500);
      } else {
        toast.error(result.message || 'Error al crear la asignación');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      toast.error(errorMessage);
    }
  };

  // Calcular el total de pasos según el tipo de asignación
  const getTotalSteps = () => {
    // Si es reemplazo: 4 pasos (Tipo, Transporte, Info, Devolución)
    // Si es nueva: 3 pasos (Tipo, Transporte, Info)
    return formData.assignment_type === "replacement" ? 4 : 3;
  };

  // Determinar qué paso mostrar
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <AssignmentTypeStep />;
      case 2:
        return <TransportStep />;
      case 3:
        return <AssignmentInfoStep />;
      case 4:
        return <ReturnStep />;
      default:
        return null;
    }
  };

  // Determinar título del paso
  const getStepTitle = () => {
    switch (currentStep) {
      case 1:
        return "Tipo de Asignación";
      case 2:
        return "Método de Entrega";
      case 3:
        return "Información de Contacto";
      case 4:
        return "Dispositivo a Devolver";
      default:
        return "Asignar Dispositivo";
    }
  };

  // Validar si puede avanzar al siguiente paso
  const canProceed = () => {
    switch (currentStep) {
      case 1:
        // Paso 1: Tipo de asignación - siempre puede avanzar (tiene valor por defecto)
        return true;
      case 2:
        // Paso 2: Método de entrega - siempre puede avanzar (tiene valor por defecto)
        return true;
      case 3:
        // Paso 3: Información de contacto - validar campos requeridos
        return formData.assignee_name.trim() &&
               formData.assignee_phone.trim() &&
               formData.distributor_id &&
               formData.delivery_location.trim();
      case 4:
        // Paso 4: Devolución - validar IMEI si espera devolución
        return formData.expects_return ? formData.return_device_imei.trim() !== '' : true;
      default:
        return true;
    }
  };

  // Determinar si es el último paso
  const isLastStep = () => {
    const totalSteps = getTotalSteps();
    return currentStep === totalSteps;
  };

  return (
    <BaseModal
      open={open}
      onOpenChange={onOpenChange}
      title={getStepTitle()}
      subtitle={`Paso ${currentStep} de ${getTotalSteps()}`}
      size="lg"
      footer={
        <div className="flex justify-between gap-3 w-full">
          <div>
            {currentStep > 1 && (
              <Button
                color="secondary"
                onClick={handlePrevious}
                disabled={isLoading}
                iconLeading={ChevronLeft}
              >
                Anterior
              </Button>
            )}
          </div>

          <div className="flex gap-3">
            <Button color="secondary" onClick={handleClose} disabled={isLoading}>
              Cancelar
            </Button>

            {!isLastStep() && (
              <Button
                color="primary"
                onClick={handleNext}
                disabled={!canProceed() || isLoading}
                iconTrailing={ChevronRight}
              >
                Siguiente
              </Button>
            )}

            {isLastStep() && (
              <Button
                color="primary"
                onClick={handleSubmit}
                disabled={!canProceed() || isLoading}
                iconLeading={Check}
              >
                {isLoading ? "Asignando..." : "Confirmar Asignación"}
              </Button>
            )}
          </div>
        </div>
      }
    >
      {/* Progress bar */}
      <div className="mb-4 pb-3 border-b border-surface">
        <div className="flex gap-2">
          {Array.from({ length: getTotalSteps() }, (_, i) => i + 1).map((step) => (
            <div
              key={step}
              className={cx(
                "flex-1 h-1.5 rounded-full transition-colors",
                step <= currentStep ? "bg-primary" : "bg-gray-700"
              )}
            />
          ))}
        </div>
      </div>

      {/* Step Content */}
      {renderStep()}
    </BaseModal>
  );
}

// Helper function for cx
function cx(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
