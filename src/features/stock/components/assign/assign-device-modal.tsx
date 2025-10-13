"use client";

import { useEffect, useRef } from "react";
import { ModalOverlay, Modal, Dialog } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { useAssignDeviceStore } from "@/store/assign-device.store";
import { useShallow } from "zustand/react/shallow";
import { AssignmentInfoStep } from "./steps/assignment-info-step";
import { VoucherStep } from "./steps/voucher-step";
import { ReturnStep } from "./steps/return-step";
import { X, ChevronLeft, ChevronRight, Check } from "@untitledui/icons";
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

  // Determinar qué paso mostrar
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <AssignmentInfoStep />;
      case 2:
        return <VoucherStep />;
      case 3:
        return <ReturnStep />;
      default:
        return null;
    }
  };

  // Determinar título del paso
  const getStepTitle = () => {
    switch (currentStep) {
      case 1:
        return "Información de la Asignación";
      case 2:
        return "Vale de Envío";
      case 3:
        return "Gestión de Devolución";
      default:
        return "Asignar Dispositivo";
    }
  };

  // Validar si puede avanzar al siguiente paso
  const canProceed = () => {
    if (currentStep === 1) {
      return formData.assignee_name.trim() && 
             formData.assignee_phone.trim() && 
             formData.distributor_id && 
             formData.delivery_location.trim();
    }
    if (currentStep === 3 && formData.expects_return) {
      return formData.return_device_imei.trim() !== '';
    }
    return true;
  };

  // Determinar si es el último paso
  const isLastStep = () => {
    // Si no genera vale, el paso 2 es el último
    if (currentStep === 2 && !formData.generate_voucher) {
      return false; // El botón "No, asignar sin vale" maneja el submit
    }
    // Si genera vale, el paso 3 es el último
    return currentStep === 3 || (currentStep === 2 && !formData.generate_voucher);
  };

  // Determinar si debe mostrar el botón de submit
  const shouldShowSubmit = () => {
    return currentStep === 3 || (currentStep === 2 && formData.generate_voucher === false);
  };

  return (
    <ModalOverlay isOpen={open} onOpenChange={onOpenChange}>
      <Modal>
        <Dialog className="bg-primary rounded-lg shadow-xl max-w-4xl w-full flex flex-col mx-auto max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center w-full justify-between px-6 py-4 border-b border-secondary">
            <div>
              <h2 className="text-lg font-semibold text-primary">{getStepTitle()}</h2>
              <p className="text-sm text-secondary mt-1">Paso {currentStep} de 3</p>
            </div>
            <ButtonUtility
              onClick={handleClose}
              className="p-2 text-secondary hover:text-primary"
              icon={X}
              size="xs"
            />
          </div>

          {/* Progress bar */}
          <div className="px-6 py-3 border-b border-secondary">
            <div className="flex gap-2">
              {[1, 2, 3].map((step) => (
                <div
                  key={step}
                  className={cx(
                    "flex-1 h-2 rounded-full transition-colors",
                    step <= currentStep ? "bg-primary" : "bg-gray-700"
                  )}
                />
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6 flex-1 overflow-y-auto">
            {renderStep()}
          </div>

          {/* Footer */}
          <div className="flex justify-between gap-3 px-6 py-4 border-t border-surface w-full">
            <div>
              {currentStep > 1 && currentStep !== 2 && (
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
              <Button 
                color="secondary" 
                onClick={handleClose} 
                disabled={isLoading}
              >
                Cancelar
              </Button>
              
              {currentStep === 1 && (
                <Button
                  color="primary"
                  onClick={handleNext}
                  disabled={!canProceed() || isLoading}
                  iconTrailing={ChevronRight}
                >
                  Siguiente
                </Button>
              )}
              
              {currentStep === 3 && (
                <Button
                  color="primary"
                  onClick={handleSubmit}
                  disabled={!canProceed() || isLoading}
                  iconLeading={Check}
                >
                  {isLoading ? 'Asignando...' : 'Confirmar Asignación'}
                </Button>
              )}
            </div>
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}

// Helper function for cx
function cx(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
