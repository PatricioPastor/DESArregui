"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { Select } from "@/components/base/select/select";
import { TextArea } from "@/components/base/textarea/textarea";
import { RadioButton, RadioGroup } from "@/components/base/radio-buttons/radio-buttons";
import { User01, MarkerPin01, Phone, RefreshCw01, ChevronLeft, ChevronRight, Package } from "@untitledui/icons";
import { toast } from "sonner";
import { useAssignManualStore } from "@/features/stock/components/assign-manual/assign-manual.store";

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

interface AssignPageClientProps {
  deviceInfo: {
    id: string;
    imei: string;
    modelo: string;
    status: string;
  };
}

export function AssignPageClient({ deviceInfo }: AssignPageClientProps) {
  const router = useRouter();
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

  const totalSteps = STEP_DEFINITIONS.length;
  const activeStep = STEP_DEFINITIONS[currentStep - 1] ?? STEP_DEFINITIONS[0];
  const [stepAttempts, setStepAttempts] = useState<Record<number, boolean>>({});

  // Inicializar dispositivo al montar
  useEffect(() => {
    setDeviceInfo(deviceInfo);
    fetchDistributorOptions();
  }, [deviceInfo, setDeviceInfo, fetchDistributorOptions]);

  const handleSubmit = async () => {
    const result = await submit();

    if (result.success) {
      toast.success(result.message || "Asignación creada exitosamente");
      resetState();
      // Redirigir a la página de detalle del dispositivo
      router.push(`/stock/${deviceInfo.imei}`);
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

  const handleCancel = () => {
    resetState();
    router.push(`/stock/${deviceInfo.imei}`);
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
          <div className="rounded-lg bg-gray-900/40 border border-gray-700 p-5">
            <h3 className="text-sm font-semibold text-primary mb-4 flex items-center gap-2">
              <User01 className="w-4 h-4" />
              Información del Asignatario
            </h3>
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
          </div>
        );

      case 2:
        return (
          <div className="rounded-lg bg-gray-900/40 border border-gray-700 p-5">
            <h3 className="text-sm font-semibold text-primary mb-4 flex items-center gap-2">
              <MarkerPin01 className="w-4 h-4" />
              Información de Entrega
            </h3>
            <div className="space-y-4">
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
                label="Contacto adicional (opcional)"
                placeholder="Información adicional de contacto o instrucciones de entrega"
                value={formData.contact_details}
                onChange={(e) => setFormData({ contact_details: e.target.value })}
                rows={2}
              />
            </div>
          </div>
        );

      case 3:
      default:
        return (
          <div className="space-y-6">
            <div className="rounded-lg bg-gray-900/40 border border-gray-700 p-5">
              <h3 className="text-sm font-semibold text-primary mb-4">Vale de envío</h3>
              <RadioGroup
                aria-label="Vale de envío"
                value={formData.generate_voucher ? "true" : "false"}
                onChange={(value) => setFormData({ generate_voucher: value === "true" })}
              >
                <RadioButton
                  value="true"
                  label="Generar vale de envío"
                  hint="Se generará un código único para rastrear el envío"
                />
                <RadioButton
                  value="false"
                  label="No generar vale"
                  hint="Podrás crear el vale manualmente más adelante"
                />
              </RadioGroup>
            </div>

            <div className="rounded-lg bg-gray-900/40 border border-gray-700 p-5">
              <h3 className="text-sm font-semibold text-primary mb-4">Devolución esperada</h3>
              <RadioGroup
                aria-label="Devolución esperada"
                value={formData.expects_return ? "true" : "false"}
                onChange={(value) => setFormData({ expects_return: value === "true" })}
              >
                <RadioButton
                  value="true"
                  label="Sí, espera devolución"
                  hint="El asignatario deberá devolver otro dispositivo"
                />
                <RadioButton
                  value="false"
                  label="No, sin devolución"
                  hint="No se solicitará un dispositivo de reemplazo"
                />
              </RadioGroup>

              {formData.expects_return && (
                <div className="mt-4 pt-4 border-t border-gray-700">
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
                        ? "Necesitamos el IMEI del dispositivo que se espera recibir"
                        : undefined
                    }
                  />
                </div>
              )}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl">
      {/* Progress bar */}
      <div className="mb-6 flex items-center gap-2">
        {STEP_DEFINITIONS.map((step, index) => {
          const isCompleted = index + 1 < currentStep;
          const isActive = index + 1 === currentStep;
          const colorClass = isActive || isCompleted ? "bg-primary" : "bg-surface-2";
          return (
            <span
              key={step.id}
              className={`h-1.5 flex-1 rounded-full transition-colors ${colorClass}`}
            />
          );
        })}
      </div>

      {/* Device info card */}
      <div className="mb-6 rounded-lg bg-gray-900/40 border border-gray-700 p-4">
        <div className="flex items-center gap-3">
          <Package className="h-5 w-5 text-secondary" />
          <div className="flex-1">
            <p className="text-sm font-medium text-primary">{deviceInfo.modelo}</p>
            <p className="text-xs text-secondary font-mono">{deviceInfo.imei}</p>
          </div>
          <span className="text-xs text-secondary">Paso {currentStep} de {totalSteps}</span>
        </div>
      </div>

      {/* Step title and description */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-primary">{activeStep.title}</h2>
        <p className="text-sm text-secondary mt-1">{activeStep.description}</p>
      </div>

      {/* Step content */}
      <div className="mb-6">
        {renderStepContent()}

        {error && (
          <div className="mt-4 bg-error-50 border border-error-200 text-error-700 rounded-lg p-3 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-between gap-3 border-t border-surface pt-6">
        <div>
          {currentStep > 1 && (
            <Button
              color="secondary"
              onClick={handlePreviousStep}
              isDisabled={isLoading}
              iconLeading={ChevronLeft}
            >
              Anterior
            </Button>
          )}
        </div>
        <div className="flex gap-3">
          <Button color="secondary" onClick={handleCancel} isDisabled={isLoading}>
            Cancelar
          </Button>
          <Button
            color="primary"
            onClick={handlePrimaryAction}
            isDisabled={!canProceed || isLoading}
            isLoading={isLastStep && isLoading}
            iconTrailing={!isLastStep ? ChevronRight : undefined}
          >
            {primaryActionLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

