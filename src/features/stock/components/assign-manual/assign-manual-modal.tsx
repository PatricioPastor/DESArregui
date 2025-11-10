"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ModalOverlay, Modal, Dialog } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Input } from "@/components/base/input/input";
import { Select } from "@/components/base/select/select";
import { TextArea } from "@/components/base/textarea/textarea";
import { Badge } from "@/components/base/badges/badges";
import { RadioButton, RadioGroup } from "@/components/base/radio-buttons/radio-buttons";
import { X, User01, MarkerPin01, Phone, RefreshCw01, UserPlus01, Package } from "@untitledui/icons";
import { toast } from "sonner";
import { useAssignManualStore } from "./assign-manual.store";

const STEP_DEFINITIONS = [
  {
    id: 1,
    title: "Datos del asignatario",
    description: "Completá la información de contacto de la persona que recibirá el equipo.",
  },
  {
    id: 2,
    title: "Logística",
    description: "Elegí la distribuidora y dónde se entregará el dispositivo.",
  },
  {
    id: 3,
    title: "Opciones",
    description: "Configurá si necesitás un vale de envío o una devolución.",
  },
] as const;

const NO_DISTRIBUTOR_SELECTED = "__none__";

interface AssignManualModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deviceInfo: {
    id: string;
    imei: string;
    modelo: string;
    status: string;
  };
  onSuccess?: () => void;
}

export function AssignManualModal({ open, onOpenChange, deviceInfo, onSuccess }: AssignManualModalProps) {
  const {
    formData,
    isLoading,
    error,
    distributorOptions,
    isLoadingOptions,
    currentStep,
    setFormData,
    setDeviceInfo,
    setCurrentStep,
    nextStep,
    previousStep,
    fetchDistributorOptions,
    submit,
    resetState,
  } = useAssignManualStore();

  const contentRef = useRef<HTMLDivElement>(null);
  const totalSteps = STEP_DEFINITIONS.length;
  const activeStep = STEP_DEFINITIONS[currentStep - 1] ?? STEP_DEFINITIONS[0];
  const [stepAttempts, setStepAttempts] = useState<Record<number, boolean>>({});

  // Cargar información del dispositivo al abrir y preparar paso inicial
  useEffect(() => {
    if (open) {
      setCurrentStep(1);
    }
  }, [open, setCurrentStep]);

  useEffect(() => {
    if (open) {
      setDeviceInfo(deviceInfo);
    }
  }, [open, deviceInfo, setDeviceInfo]);

  useEffect(() => {
    if (!open || distributorOptions.length) return;
    fetchDistributorOptions();
  }, [open, distributorOptions.length, fetchDistributorOptions]);

  // Volver al inicio del contenido cuando cambia el paso
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentStep]);

  useEffect(() => {
    if (!open) {
      setStepAttempts({});
    }
  }, [open]);

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    const result = await submit();

    if (result.success) {
      toast.success(result.message || "Asignación creada exitosamente");

      setTimeout(() => {
        handleClose();
        onSuccess?.();
      }, 1200);
    } else {
      toast.error(result.message || "Error al crear la asignación");
    }
  };

  const basicFieldsCompleted =
    formData.assignee_name.trim() !== "" &&
    formData.assignee_phone.trim() !== "" &&
    formData.distributor_id !== "" &&
    formData.delivery_location.trim() !== "";

  const returnFieldValid = !formData.expects_return || formData.return_device_imei.trim() !== "";

  const canProceed = (() => {
    switch (currentStep) {
      case 1:
        return formData.assignee_name.trim() !== "" && formData.assignee_phone.trim() !== "";
      case 2:
        return formData.distributor_id !== "" && formData.delivery_location.trim() !== "";
      case 3:
        return basicFieldsCompleted && returnFieldValid;
      default:
        return false;
    }
  })();

  const isLastStep = currentStep === totalSteps;
  const primaryActionLabel = isLastStep ? "Crear Asignación" : "Continuar";

  const handlePrimaryAction = () => {
    if (!canProceed || isLoading) {
      setStepAttempts((prev) => ({ ...prev, [currentStep]: true }));
      return;
    }

    setStepAttempts((prev) => ({ ...prev, [currentStep]: false }));

    if (isLastStep) {
      handleSubmit();
    } else {
      nextStep();
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1 && !isLoading) {
      previousStep();
    }
  };

  const selectedDistributorKey = formData.distributor_id || NO_DISTRIBUTOR_SELECTED;

  const validationStateForField = useMemo(() => {
    const shouldShowErrors = stepAttempts[currentStep];

    if (!shouldShowErrors) {
      return {
        assignee_name: undefined,
        assignee_phone: undefined,
        distributor_id: undefined,
        delivery_location: undefined,
        return_device_imei: undefined,
      } as const;
    }

    return {
      assignee_name: formData.assignee_name.trim() ? undefined : "invalid",
      assignee_phone: formData.assignee_phone.trim() ? undefined : "invalid",
      distributor_id: formData.distributor_id ? undefined : "invalid",
      delivery_location: formData.delivery_location.trim() ? undefined : "invalid",
      return_device_imei:
        formData.expects_return && !formData.return_device_imei.trim() ? "invalid" : undefined,
    } as const;
  }, [
    currentStep,
    formData.assignee_name,
    formData.assignee_phone,
    formData.distributor_id,
    formData.delivery_location,
    formData.expects_return,
    formData.return_device_imei,
    stepAttempts,
  ]);

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <section className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Nombre completo"
                placeholder="Juan Pérez"
                value={formData.assignee_name}
                onChange={(value) => setFormData({ assignee_name: value })}
                icon={User01}
                isRequired
                autoFocus
                
                hint={
                  validationStateForField.assignee_name
                    ? "Ingresa el nombre y apellido de la persona que recibirá el equipo."
                    : undefined
                }
              />

              <Input
                label="Teléfono"
                placeholder="+54 9 11 1234-5678"
                value={formData.assignee_phone}
                onChange={(value) => setFormData({ assignee_phone: value })}
                icon={Phone}
                isRequired
                hint={
                  validationStateForField.assignee_phone
                    ? "Necesitamos un teléfono de contacto para coordinar la entrega."
                    : undefined
                }
              />
            </div>
          </section>
        );

      case 2:
        return (
          <section className="space-y-5">
            <Select
              label="Distribuidora"
              placeholder={isLoadingOptions ? "Cargando distribuidoras..." : "Seleccione una distribuidora"}
              selectedKey={selectedDistributorKey}
              onSelectionChange={(key) => {
                const value = key === NO_DISTRIBUTOR_SELECTED ? "" : (key as string);
                setFormData({ distributor_id: value });
              }}
              isDisabled={isLoadingOptions}
              isRequired
              
              hint={
                validationStateForField.distributor_id
                  ? "Elegí la distribuidora responsable del envío."
                  : undefined
              }
              items={[
                { id: NO_DISTRIBUTOR_SELECTED, label: "Seleccionar..." },
                ...distributorOptions,
              ]}
            >
              {(item) => (
                <Select.Item id={item.id}>
                  <div className="flex flex-col">
                    <span className="text-sm">{item.label}</span>
                    {item.supportingText ? (
                      <span className="text-xs text-tertiary">{item.supportingText}</span>
                    ) : null}
                  </div>
                </Select.Item>
              )}
            </Select>

            <Input
              label="Ubicación de entrega"
              placeholder="Calle Falsa 123, CABA"
              value={formData.delivery_location}
              onChange={(value) => setFormData({ delivery_location: value })}
              icon={MarkerPin01}
              isRequired
              
              hint={
                validationStateForField.delivery_location
                  ? "Indica claramente dónde se enviará el dispositivo."
                  : undefined
              }
            />

            <TextArea
              label="Contacto adicional"
              placeholder="Información adicional de contacto o instrucciones de entrega (opcional)"
              value={formData.contact_details}
              onChange={(e) => setFormData({ contact_details: e.target.value })}
              rows={3}
            />
          </section>
        );

      case 3:
      default:
        return (
          <section className="space-y-5">
            <div className="space-y-3 rounded-lg border border-surface bg-surface-1 p-4">
              <p className="text-sm font-medium text-primary">Vale de envío</p>
              <RadioGroup
                aria-label="Vale de envío"
                value={formData.generate_voucher ? "true" : "false"}
                onChange={(value) => setFormData({ generate_voucher: value === "true" })}
              >
                <RadioButton
                  value="true"
                  label="Generar vale de envío"
                  hint="Se generará un código único para rastrear el envío."
                />
                <RadioButton
                  value="false"
                  label="No generar vale"
                  hint="Podrás crear el vale manualmente más adelante."
                />
              </RadioGroup>
            </div>

            <div className="space-y-3 rounded-lg border border-surface bg-surface-1 p-4">
              <p className="text-sm font-medium text-primary">Devolución esperada</p>
              <RadioGroup
                aria-label="Devolución esperada"
                value={formData.expects_return ? "true" : "false"}
                onChange={(value) => setFormData({ expects_return: value === "true" })}
              >
                <RadioButton
                  value="true"
                  label="Sí, espera devolución"
                  hint="El asignatario deberá devolver otro dispositivo."
                />
                <RadioButton
                  value="false"
                  label="No, sin devolución"
                  hint="No se solicitará un dispositivo de reemplazo."
                />
              </RadioGroup>

              {formData.expects_return && (
                <div className="rounded-lg border border-brand-primary/40 bg-brand-primary/10 p-4">
                  <Input
                    label="IMEI del dispositivo a devolver"
                    placeholder="123456789012345"
                    value={formData.return_device_imei}
                    onChange={(value) => setFormData({ return_device_imei: value })}
                    icon={RefreshCw01}
                    isRequired
                    autoFocus
                    
                    hint={
                      validationStateForField.return_device_imei
                        ? "Necesitamos el IMEI del dispositivo que se espera recibir."
                        : undefined
                    }
                  />
                </div>
              )}
            </div>
          </section>
        );
    }
  };

  return (
    <ModalOverlay isOpen={open} onOpenChange={onOpenChange}>
      <Modal>
        <Dialog className="bg-primary rounded-lg shadow-xl max-w-3xl w-full flex flex-col mx-auto max-h-[90vh]">
          {/* Header */}
          <header className="flex flex-col gap-4 border-b border-secondary px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50">
                  <UserPlus01 className="h-5 w-5 text-brand-primary" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-tertiary">
                    Paso {currentStep} de {totalSteps}
                  </p>
                  <h2 className="text-lg font-semibold text-primary leading-tight">{activeStep.title}</h2>
                  <p className="text-sm text-tertiary leading-snug">{activeStep.description}</p>
                </div>
              </div>
              <ButtonUtility onClick={handleClose} icon={X} size="sm" />
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                {STEP_DEFINITIONS.map((step, index) => {
                  const isCompleted = index + 1 < currentStep;
                  const isActive = index + 1 === currentStep;
                  const colorClass = isActive || isCompleted ? "bg-brand-solid" : "bg-surface-2";

                  return <span key={step.id} className={`h-1 flex-1 rounded-full transition-colors ${colorClass}`} />;
                })}
              </div>

              <div className="flex items-center gap-3 rounded-lg border border-surface bg-surface-1 px-3 py-2.5">
                <Package className="h-5 w-5 text-secondary" />
                <div className="flex-1 leading-tight">
                  <p className="text-sm font-medium text-primary">{deviceInfo.modelo}</p>
                  <p className="text-xs text-tertiary">IMEI: {deviceInfo.imei}</p>
                </div>
                <Badge size="sm" color="gray">
                  {deviceInfo.status}
                </Badge>
              </div>
            </div>
          </header>

          {/* Content */}
          <div ref={contentRef} className="flex-1 overflow-y-auto px-6 pb-6 pt-2">
            <div className="space-y-6 py-4">
              {renderStepContent()}

              {error && (
                <div className="bg-error-50 border border-error-200 text-error-700 rounded-lg p-3 text-sm">
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <footer className="flex items-center gap-3 border-t border-surface bg-surface-1 px-6 py-5">
            <Button color="secondary" onClick={handleClose} isDisabled={isLoading} size="md">
              Cancelar
            </Button>
            <div className="ml-auto flex items-center gap-2">
              {currentStep > 1 && (
                <Button color="secondary" onClick={handlePreviousStep} isDisabled={isLoading} size="md">
                  Volver
                </Button>
              )}
              <Button
                color="primary"
                onClick={handlePrimaryAction}
                isDisabled={!canProceed || isLoading}
                isLoading={isLastStep && isLoading}
                size="md"
              >
                {primaryActionLabel}
              </Button>
            </div>
          </footer>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
