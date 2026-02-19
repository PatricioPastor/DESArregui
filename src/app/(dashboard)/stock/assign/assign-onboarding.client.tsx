"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, RefreshCw01, UserPlus01 } from "@untitledui/icons";
import { useRouter } from "next/navigation";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { RadioButton, RadioGroup } from "@/components/base/radio-buttons/radio-buttons";
import { Select, type SelectItemType } from "@/components/base/select/select";
import { clearFilteredStockCache } from "@/hooks/use-stock-data";
import { cx } from "@/utils/cx";

export type AssignmentFlow = "recambio" | "nueva-asignacion";
type AssignmentType = "personal" | "tercerizado" | "rotativo" | "cuadrilla" | "pruebas";
type AssignmentStep = 1 | 2 | 3;
type AssignmentFieldKey = "firstName" | "lastName" | "operationalLabel" | "corpEmail" | "role" | "companyId" | "city" | "requestTicket";
type ReplacementReason = "ROTURA" | "ROBO" | "OBSOLETO" | "PERDIDA";
type AssignmentKind = "PERSONAL" | "TERCERIZADO" | "ROTATIVO" | "CUADRILLA" | "PRUEBAS";

type AssignOnboardingClientProps = {
    deviceId: string;
    imei: string;
    model: string;
    initialFlow: AssignmentFlow | null;
};

type AssignmentFormData = {
    firstName: string;
    lastName: string;
    operationalLabel: string;
    corpEmail: string;
    role: string;
    companyId: string;
    city: string;
    requestTicket: string;
    replacementReason: ReplacementReason | "";
};

type FieldGuide = {
    description: string;
    tips: string[];
    example: string;
};

type DistributorApiRecord = {
    id: string;
    name?: string;
    label?: string;
    deviceCount?: number;
    supportingText?: string;
};

type DistributorsApiResponse = {
    success?: boolean;
    data?: DistributorApiRecord[];
};

let distributorsOptionsCache: SelectItemType[] | null = null;
let distributorsOptionsInFlight: Promise<SelectItemType[]> | null = null;

const NO_COMPANY_SELECTED = "__none__";
const INITIAL_FORM_DATA: AssignmentFormData = {
    firstName: "",
    lastName: "",
    operationalLabel: "",
    corpEmail: "",
    role: "",
    companyId: "",
    city: "",
    requestTicket: "",
    replacementReason: "",
};

const FLOW_OPTIONS = [
    {
        id: "recambio" as const,
        title: "Recambio",
        description: "Reemplazo de un equipo existente por rotura, obsolescencia, robo o extravio.",
        icon: RefreshCw01,
    },
    {
        id: "nueva-asignacion" as const,
        title: "Nueva Asignación",
        description: "Alta de un activo para una persona que hoy no tiene este dispositivo asignado.",
        icon: UserPlus01,
    },
];

const ASSIGNMENT_TYPE_OPTIONS = [
    {
        id: "personal" as const,
        label: "Personal",
        hint: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    },
    {
        id: "tercerizado" as const,
        label: "Tercerizado",
        hint: "Cuadrillas contratistas sin nómina individual (por ejemplo: Trelert / H8).",
    },
    {
        id: "rotativo" as const,
        label: "Rotativo",
        hint: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut enim ad minim veniam.",
    },
    {
        id: "cuadrilla" as const,
        label: "Cuadrilla",
        hint: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis aute irure dolor in reprehenderit.",
    },
    {
        id: "pruebas" as const,
        label: "Pruebas",
        hint: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Excepteur sint occaecat cupidatat non proident.",
    },
];

const FLOW_LABELS: Record<AssignmentFlow, string> = {
    recambio: "Recambio",
    "nueva-asignacion": "Nueva Asignación",
};

const REPLACEMENT_REASON_OPTIONS: Array<{ id: ReplacementReason; label: string; hint: string }> = [
    { id: "ROTURA", label: "ROTURA", hint: "Falla física o funcional que impide uso operativo." },
    { id: "ROBO", label: "ROBO", hint: "Dispositivo sustraído con denuncia/caso asociado." },
    { id: "OBSOLETO", label: "OBSOLETO", hint: "Equipo fuera de estándar o fin de vida útil." },
    { id: "PERDIDA", label: "PERDIDA", hint: "Extravio del equipo sin recuperación al momento." },
];

const TYPE_LABELS: Record<AssignmentType, string> = {
    personal: "Personal",
    tercerizado: "Tercerizado",
    rotativo: "Rotativo",
    cuadrilla: "Cuadrilla",
    pruebas: "Pruebas",
};

const ASSIGNMENT_KIND_BY_TYPE: Record<AssignmentType, AssignmentKind> = {
    personal: "PERSONAL",
    tercerizado: "TERCERIZADO",
    rotativo: "ROTATIVO",
    cuadrilla: "CUADRILLA",
    pruebas: "PRUEBAS",
};

const FIELD_LABELS_BY_TYPE: Record<AssignmentType, Record<AssignmentFieldKey, string>> = {
    personal: {
        firstName: "Nombre (responsable)",
        lastName: "Apellido (responsable)",
        operationalLabel: "Referencia operativa (opcional)",
        corpEmail: "Correo electrónico Corp",
        role: "Cargo",
        companyId: "EMPRESA",
        city: "Localidad",
        requestTicket: "Ticket de SOLICITUD (DESA-XXXXX)",
    },
    tercerizado: {
        firstName: "Nombre (responsable)",
        lastName: "Apellido (responsable)",
        operationalLabel: "Tercerizado (empresa/cuadrilla)",
        corpEmail: "Correo electrónico Corp",
        role: "Tipo de cuadrilla / motivo del teléfono",
        companyId: "EMPRESA",
        city: "Localidad",
        requestTicket: "Ticket de SOLICITUD (DESA-XXXXX)",
    },
    rotativo: {
        firstName: "Nombre (responsable)",
        lastName: "Apellido (responsable)",
        operationalLabel: "Rotativo (nombre de la acción)",
        corpEmail: "Correo de referencia",
        role: "Motivo del teléfono",
        companyId: "EMPRESA",
        city: "Localidad base",
        requestTicket: "Ticket de SOLICITUD (DESA-XXXXX)",
    },
    cuadrilla: {
        firstName: "Nombre (responsable)",
        lastName: "Apellido (responsable)",
        operationalLabel: "Cuadrilla (nombre cuadrilla)",
        corpEmail: "Correo del responsable",
        role: "Tipo de cuadrilla / motivo del teléfono",
        companyId: "EMPRESA",
        city: "Localidad de trabajo",
        requestTicket: "Ticket de SOLICITUD (DESA-XXXXX)",
    },
    pruebas: {
        firstName: "Nombre (responsable)",
        lastName: "Apellido (responsable)",
        operationalLabel: "Pruebas (título de prueba)",
        corpEmail: "Correo del solicitante",
        role: "Motivo del teléfono",
        companyId: "EMPRESA",
        city: "Localidad",
        requestTicket: "Ticket de SOLICITUD (DESA-XXXXX)",
    },
};

const FIELD_GUIDES: Record<AssignmentFieldKey, FieldGuide> = {
    firstName: {
        description: "Ingresá el nombre del responsable operativo del teléfono.",
        tips: ["Evitar abreviaturas.", "No incluir apodos.", "Usar mayúscula inicial para mejor lectura."],
        example: "Juan",
    },
    lastName: {
        description: "Ingresá el apellido del responsable operativo del teléfono.",
        tips: ["Cargar un solo apellido principal.", "Evitar caracteres especiales innecesarios.", "Mantener consistencia con HR."],
        example: "Pérez",
    },
    operationalLabel: {
        description: "Identifica la unidad operativa asociada: cuadrilla, contratista, acción rotativa o prueba.",
        tips: ["Usar nombres cortos y reconocibles.", "Evitar siglas ambiguas.", "Mantener consistencia entre asignaciones."],
        example: "H8 - Cuadrilla Baja Tensión",
    },
    corpEmail: {
        description: "Usar siempre correo corporativo para trazabilidad de la asignación.",
        tips: ["Debe incluir @dominio corporativo.", "No usar casillas personales.", "Verificar ortografía antes de seguir."],
        example: "juan.perez@empresa.com",
    },
    role: {
        description: "Definí el cargo o función para entender el contexto operativo del equipo.",
        tips: ["Usar un rol claro y corto.", "Evitar descripciones largas.", "Mantener nomenclatura interna."],
        example: "Supervisor de Campo",
    },
    companyId: {
        description: "Seleccioná la distribuidora o empresa responsable del activo.",
        tips: ["Elegir la opción oficial del listado.", "No crear variantes manuales.", "Si no aparece, reportar antes de continuar."],
        example: "Distribuidora Norte",
    },
    city: {
        description: "Indicá la localidad principal donde el activo será utilizado o entregado.",
        tips: ["Usar nombre completo de ciudad.", "Evitar códigos internos.", "Mantener formato consistente."],
        example: "Mar del Plata",
    },
    requestTicket: {
        description: "El ticket vincula la solicitud con soporte y auditoría.",
        tips: ["Formato obligatorio DESA-XXXXX.", "Usar solo números luego del guión.", "Ejemplo: DESA-10234."],
        example: "DESA-12345",
    },
};

const STEP_TITLES: Record<AssignmentStep, string> = {
    1: "Flujo y ticket",
    2: "Tipo de asignación",
    3: "Datos del responsable",
};

const normalizeRequestTicket = (value: string) => {
    const clean = value.toUpperCase().replace(/\s+/g, "").replace(/_/g, "-");

    if (!clean) {
        return "";
    }

    if (clean.startsWith("DESA-")) {
        return clean;
    }

    if (clean.startsWith("DESA")) {
        return `DESA-${clean.slice(4).replace(/^-+/, "")}`;
    }

    return clean;
};

const getDistributorOptions = async (): Promise<SelectItemType[]> => {
    if (distributorsOptionsCache) {
        return distributorsOptionsCache;
    }

    if (distributorsOptionsInFlight) {
        return distributorsOptionsInFlight;
    }

    distributorsOptionsInFlight = (async () => {
        const response = await fetch("/api/distributors");
        const payload = (await response.json()) as DistributorsApiResponse;

        if (!response.ok || !payload.data) {
            throw new Error("No se pudieron cargar las distribuidoras");
        }

        const options = payload.data.map((item) => {
            const baseLabel = item.name || item.label || "Distribuidora";
            const countText = typeof item.deviceCount === "number" ? `${item.deviceCount} dispositivos` : item.supportingText;

            return {
                id: item.id,
                label: baseLabel,
                supportingText: countText,
            } satisfies SelectItemType;
        });

        distributorsOptionsCache = options;
        return options;
    })();

    try {
        return await distributorsOptionsInFlight;
    } finally {
        distributorsOptionsInFlight = null;
    }
};

export function AssignOnboardingClient({ deviceId, imei, model, initialFlow }: AssignOnboardingClientProps) {
    const router = useRouter();
    const [step, setStep] = useState<AssignmentStep>(1);
    const [selectedFlow, setSelectedFlow] = useState<AssignmentFlow | null>(initialFlow);
    const [selectedType, setSelectedType] = useState<AssignmentType | "">("");
    const [activeField, setActiveField] = useState<AssignmentFieldKey>("firstName");
    const [formData, setFormData] = useState<AssignmentFormData>(INITIAL_FORM_DATA);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

    const [distributorOptions, setDistributorOptions] = useState<SelectItemType[]>([]);
    const [isLoadingDistributors, setIsLoadingDistributors] = useState(false);
    const [distributorError, setDistributorError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        const fetchDistributors = async () => {
            setIsLoadingDistributors(true);
            setDistributorError(null);

            try {
                const options = await getDistributorOptions();

                if (!cancelled) {
                    setDistributorOptions(options);
                }
            } catch {
                if (!cancelled) {
                    setDistributorError("No pudimos cargar las distribuidoras. Probá recargando.");
                    setDistributorOptions([]);
                }
            } finally {
                if (!cancelled) {
                    setIsLoadingDistributors(false);
                }
            }
        };

        fetchDistributors();

        return () => {
            cancelled = true;
        };
    }, []);

    const labels = selectedType ? FIELD_LABELS_BY_TYPE[selectedType] : FIELD_LABELS_BY_TYPE.personal;
    const fieldGuide = FIELD_GUIDES[activeField];
    const selectedCompanyKey = formData.companyId || NO_COMPANY_SELECTED;
    const normalizedTicket = normalizeRequestTicket(formData.requestTicket);
    const ticketIsValid = /^DESA-\d{5}$/.test(normalizedTicket);
    const requiresReplacementReason = selectedFlow === "recambio";
    const requiresOperationalLabel =
        selectedType === "tercerizado" || selectedType === "rotativo" || selectedType === "cuadrilla" || selectedType === "pruebas";
    const initialContextReady = Boolean(selectedFlow) && ticketIsValid && (!requiresReplacementReason || Boolean(formData.replacementReason));
    const hasRequiredFormFields =
        formData.firstName.trim() !== "" &&
        formData.lastName.trim() !== "" &&
        formData.corpEmail.trim() !== "" &&
        formData.role.trim() !== "" &&
        formData.companyId !== "" &&
        formData.city.trim() !== "" &&
        (!requiresOperationalLabel || formData.operationalLabel.trim() !== "");
    const canSubmit = Boolean(selectedFlow && selectedType) && initialContextReady && hasRequiredFormFields;
    const handleSelectFlow = (flow: AssignmentFlow) => {
        setSelectedFlow(flow);
        setSelectedType("");
        setStep(1);
        setSubmitError(null);
        setSubmitSuccess(null);

        if (flow !== "recambio") {
            setFormData((previous) => ({ ...previous, replacementReason: "" }));
        }
    };

    const handleBack = () => {
        if (step === 3) {
            setStep(2);
            return;
        }

        if (step === 2) {
            setStep(1);
        }
    };

    const handleContinueFromType = () => {
        if (!selectedType) {
            return;
        }

        setStep(3);
        setActiveField("firstName");
        setSubmitError(null);
        setSubmitSuccess(null);
    };

    const handleContinueFromInitialContext = () => {
        if (!initialContextReady) {
            return;
        }

        setStep(2);
    };

    const handleSubmitAssignment = async () => {
        if (!canSubmit || !selectedType || !selectedFlow) {
            return;
        }

        setIsSubmitting(true);
        setSubmitError(null);
        setSubmitSuccess(null);

        try {
            const payload = {
                device_id: deviceId,
                assignment_type: selectedFlow === "recambio" ? "replacement" : "new",
                replacement_reason: selectedFlow === "recambio" ? formData.replacementReason : null,
                assignment_kind: ASSIGNMENT_KIND_BY_TYPE[selectedType],
                operational_label: formData.operationalLabel.trim() || null,
                assignee_name: `${formData.firstName.trim()} ${formData.lastName.trim()}`.trim(),
                assignee_phone: null,
                assignee_email: formData.corpEmail.trim(),
                distributor_id: formData.companyId,
                delivery_location: formData.city.trim(),
                city: formData.city.trim(),
                role_or_reason: formData.role.trim(),
                ticket_id: normalizedTicket,
                generate_voucher: false,
                expects_return: false,
                return_device_imei: null,
            };

            const response = await fetch("/api/assignments/manual", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const result = (await response.json()) as { success?: boolean; message?: string; error?: string };

            if (!response.ok) {
                throw new Error(result.error || "No se pudo guardar la asignación.");
            }

            setSubmitSuccess(result.message || "Asignación guardada correctamente.");
            clearFilteredStockCache();
            router.push(`/stock?imei=${imei}`);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Error inesperado al guardar.";
            setSubmitError(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const updateFormField = <T extends keyof AssignmentFormData>(field: T, value: AssignmentFormData[T]) => {
        setSubmitError(null);
        setSubmitSuccess(null);
        setFormData((previous) => ({ ...previous, [field]: value }));
    };

    return (
        <div className="space-y-5">
            <section className="rounded-xl border border-primary bg-secondary/20 px-4 py-3 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <p className="text-xs text-secondary">Dispositivo seleccionado</p>
                        <p className="mt-1 text-sm font-semibold text-primary">{model}</p>
                        <p className="font-mono text-xs text-secondary">{imei}</p>
                    </div>

                    <span className="rounded-full border border-primary bg-primary px-2.5 py-1 text-xs font-medium text-secondary">
                        Paso {step} de 3 · {STEP_TITLES[step]}
                    </span>
                </div>
            </section>

            {step === 1 && (
                <section className="space-y-3 rounded-2xl border border-primary bg-secondary/20 p-4 shadow-xs">
                    <p className="text-xs font-medium text-secondary">Paso 1 · Elegí el flujo y completá el ticket de solicitud</p>

                    <div className="grid gap-4 md:grid-cols-2">
                        {FLOW_OPTIONS.map((option) => {
                            const Icon = option.icon;
                            const isSelected = selectedFlow === option.id;

                            return (
                                <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => handleSelectFlow(option.id)}
                                    className={cx(
                                        "group rounded-2xl border bg-primary p-6 text-left shadow-sm transition hover:bg-brand-primary/5 hover:shadow-md",
                                        isSelected ? "border-brand-primary bg-brand-primary/5" : "hover:border-brand-primary/50 border-primary",
                                    )}
                                >
                                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-secondary bg-secondary/40 text-secondary">
                                        <Icon className="h-5 w-5" />
                                    </div>

                                    <h2 className="mt-5 text-xl font-semibold text-primary">{option.title}</h2>
                                    <p className="mt-2 text-sm text-secondary">{option.description}</p>
                                </button>
                            );
                        })}
                    </div>

                    {selectedFlow && (
                        <div className="mt-2 space-y-3 rounded-xl border border-primary bg-primary p-4">
                            <Input
                                label="Ticket de SOLICITUD (DESA-XXXXX)"
                                value={formData.requestTicket}
                                onChange={(value) => updateFormField("requestTicket", value.toUpperCase())}
                                onBlur={() => updateFormField("requestTicket", normalizeRequestTicket(formData.requestTicket))}
                                placeholder="DESA-12345"
                                hint={!ticketIsValid && formData.requestTicket ? "El formato debe ser DESA-XXXXX (5 dígitos)." : undefined}
                                isRequired
                            />

                            {selectedFlow === "recambio" && (
                                <div className="rounded-xl border border-primary bg-secondary/20 p-3">
                                    <p className="text-sm font-medium text-primary">Motivo de recambio</p>

                                    <RadioGroup
                                        aria-label="Motivo de recambio"
                                        value={formData.replacementReason}
                                        onChange={(value) => updateFormField("replacementReason", value as ReplacementReason)}
                                        className="mt-3 gap-2"
                                    >
                                        {REPLACEMENT_REASON_OPTIONS.map((option) => (
                                            <RadioButton
                                                key={option.id}
                                                value={option.id}
                                                label={option.label}
                                                hint={option.hint}
                                                focusRingClassName="outline-2 outline-offset-2 outline-warning-300"
                                                className={({ isSelected, isFocusVisible }) =>
                                                    cx(
                                                        "rounded-xl border px-3 py-2 transition-all",
                                                        isSelected
                                                            ? "border-warning-300 bg-warning-500/10 shadow-xs"
                                                            : "border-primary bg-primary hover:border-warning-400/60 hover:bg-warning-500/5",
                                                        isFocusVisible && "border-warning-300 ring-2 ring-warning-300/60",
                                                    )
                                                }
                                            />
                                        ))}
                                    </RadioGroup>
                                </div>
                            )}

                            <div className="flex justify-end">
                                <Button color="primary" size="sm" onClick={handleContinueFromInitialContext} isDisabled={!initialContextReady}>
                                    Continuar al paso 2
                                </Button>
                            </div>
                        </div>
                    )}
                </section>
            )}

            {step === 2 && selectedFlow && (
                <section className="rounded-2xl border border-primary bg-secondary/20 p-6 shadow-xs">
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="text-xs font-medium text-secondary">Paso 2 · Tipo de asignación</p>
                            <h2 className="mt-1 text-xl font-semibold text-primary">¿Cómo querés registrar esta asignación?</h2>
                            <p className="mt-1 text-sm text-secondary">Flujo elegido: {FLOW_LABELS[selectedFlow]}.</p>
                        </div>

                        <Button color="secondary" size="sm" iconLeading={ChevronLeft} onClick={handleBack}>
                            Volver
                        </Button>
                    </div>

                    <RadioGroup
                        aria-label="Tipo de asignación"
                        value={selectedType}
                        onChange={(value) => setSelectedType(value as AssignmentType)}
                        className="gap-3"
                    >
                        {ASSIGNMENT_TYPE_OPTIONS.map((option) => (
                            <RadioButton
                                key={option.id}
                                value={option.id}
                                label={option.label}
                                hint={option.hint}
                                focusRingClassName="outline-2 outline-offset-2 outline-warning-300"
                                className={({ isSelected, isFocusVisible }) =>
                                    cx(
                                        "rounded-xl border px-4 py-3 transition-all",
                                        isSelected
                                            ? "border-warning-300 bg-warning-500/10 shadow-xs"
                                            : "border-primary bg-primary hover:border-warning-400/60 hover:bg-warning-500/5",
                                        isFocusVisible && "border-warning-300 ring-2 ring-warning-300/60",
                                    )
                                }
                            />
                        ))}
                    </RadioGroup>

                    <div className="mt-5 flex justify-end">
                        <Button color="primary" size="sm" onClick={handleContinueFromType} isDisabled={!selectedType}>
                            Continuar
                        </Button>
                    </div>
                </section>
            )}

            {step === 3 && selectedFlow && selectedType && (
                <section className="rounded-2xl border border-primary bg-secondary/20 p-4 shadow-xs">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="text-xs font-medium text-secondary">Paso 3 · Datos de asignación</p>
                            <h2 className="mt-1 text-xl font-semibold text-primary">Completá los datos del asignatario</h2>
                            <p className="mt-1 text-sm text-secondary">
                                Flujo: {FLOW_LABELS[selectedFlow]} · Tipo: {TYPE_LABELS[selectedType]}.
                            </p>
                        </div>

                        <Button color="secondary" size="sm" iconLeading={ChevronLeft} onClick={handleBack}>
                            Volver
                        </Button>
                    </div>

                    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                        <div className="grid gap-3 md:grid-cols-2">
                            <div className="rounded-xl border border-primary bg-primary p-3 md:col-span-2">
                                <div className="flex flex-wrap items-center gap-2 text-xs text-secondary">
                                    <span className="rounded-full border border-primary bg-secondary/20 px-2 py-1">Ticket: {normalizedTicket || "-"}</span>
                                    {selectedFlow === "recambio" && formData.replacementReason ? (
                                        <span className="rounded-full border border-primary bg-secondary/20 px-2 py-1">
                                            Motivo: {formData.replacementReason}
                                        </span>
                                    ) : null}
                                </div>
                            </div>

                            <div onFocusCapture={() => setActiveField("firstName")} className="rounded-xl border border-primary bg-primary p-3">
                                <Input
                                    label={labels.firstName}
                                    value={formData.firstName}
                                    onChange={(value) => updateFormField("firstName", value)}
                                    placeholder="Ingresá el nombre del responsable"
                                    isRequired
                                />
                            </div>

                            <div onFocusCapture={() => setActiveField("lastName")} className="rounded-xl border border-primary bg-primary p-3">
                                <Input
                                    label={labels.lastName}
                                    value={formData.lastName}
                                    onChange={(value) => updateFormField("lastName", value)}
                                    placeholder="Ingresá el apellido del responsable"
                                    isRequired
                                />
                            </div>

                            <div
                                onFocusCapture={() => setActiveField("operationalLabel")}
                                className="rounded-xl border border-primary bg-primary p-3 md:col-span-2"
                            >
                                <Input
                                    label={labels.operationalLabel}
                                    value={formData.operationalLabel}
                                    onChange={(value) => updateFormField("operationalLabel", value)}
                                    placeholder="Ej: H8 - Cuadrilla BT / Prueba de campo / Trelert"
                                    isRequired={requiresOperationalLabel}
                                />
                            </div>

                            <div onFocusCapture={() => setActiveField("corpEmail")} className="rounded-xl border border-primary bg-primary p-3 md:col-span-2">
                                <Input
                                    label={labels.corpEmail}
                                    type="email"
                                    value={formData.corpEmail}
                                    onChange={(value) => updateFormField("corpEmail", value)}
                                    placeholder="nombre.apellido@empresa.com"
                                    isRequired
                                />
                            </div>

                            <div onFocusCapture={() => setActiveField("role")} className="rounded-xl border border-primary bg-primary p-3">
                                <Input
                                    label={labels.role}
                                    value={formData.role}
                                    onChange={(value) => updateFormField("role", value)}
                                    placeholder="Ej: Cuadrilla de Baja Tensión / Guardia / Soporte"
                                    isRequired
                                />
                            </div>

                            <div onFocusCapture={() => setActiveField("companyId")} className="rounded-xl border border-primary bg-primary p-3">
                                <Select
                                    label={labels.companyId}
                                    selectedKey={selectedCompanyKey}
                                    onSelectionChange={(key) => {
                                        const normalizedKey = key === NO_COMPANY_SELECTED ? "" : String(key);
                                        updateFormField("companyId", normalizedKey);
                                    }}
                                    isDisabled={isLoadingDistributors}
                                    placeholder={isLoadingDistributors ? "Cargando empresas..." : "Seleccioná una empresa"}
                                    hint={distributorError || undefined}
                                    items={[{ id: NO_COMPANY_SELECTED, label: "Seleccionar..." }, ...distributorOptions]}
                                >
                                    {(item) => (
                                        <Select.Item id={item.id}>
                                            <div className="flex flex-col">
                                                <span className="text-sm text-primary">{item.label}</span>
                                                {item.supportingText ? <span className="text-xs text-secondary">{item.supportingText}</span> : null}
                                            </div>
                                        </Select.Item>
                                    )}
                                </Select>
                            </div>

                            <div onFocusCapture={() => setActiveField("city")} className="rounded-xl border border-primary bg-primary p-3">
                                <Input
                                    label={labels.city}
                                    value={formData.city}
                                    onChange={(value) => updateFormField("city", value)}
                                    placeholder="Ej: CABA"
                                    isRequired
                                />
                            </div>

                            <div className="rounded-xl border border-primary bg-primary p-3 md:col-span-2">
                                <div className="flex flex-wrap items-center justify-end gap-3">
                                    <Button
                                        color="primary"
                                        size="sm"
                                        onClick={handleSubmitAssignment}
                                        isDisabled={!canSubmit || isSubmitting}
                                        isLoading={isSubmitting}
                                    >
                                        Guardar asignación
                                    </Button>
                                </div>

                                {submitError ? <p className="mt-3 text-sm text-error-primary">{submitError}</p> : null}
                                {submitSuccess ? <p className="mt-3 text-sm text-success-primary">{submitSuccess}</p> : null}
                            </div>
                        </div>

                        <aside className="rounded-xl border border-primary bg-primary p-4 shadow-xs">
                            <p className="text-xs font-semibold tracking-wide text-secondary uppercase">Guía del campo activo</p>
                            <h3 className="mt-2 text-base font-semibold text-primary">{labels[activeField]}</h3>
                            <p className="mt-2 text-sm text-secondary">{fieldGuide.description}</p>

                            <div className="mt-4 space-y-2">
                                {fieldGuide.tips.map((tip) => (
                                    <p key={tip} className="text-xs text-secondary">
                                        - {tip}
                                    </p>
                                ))}
                            </div>

                            <div className="mt-4 rounded-lg border border-primary bg-secondary/20 px-3 py-2">
                                <p className="text-[11px] font-semibold tracking-wide text-secondary uppercase">Ejemplo</p>
                                <p className="mt-1 text-sm font-medium text-primary">{fieldGuide.example}</p>
                            </div>
                        </aside>
                    </div>
                </section>
            )}
        </div>
    );
}
