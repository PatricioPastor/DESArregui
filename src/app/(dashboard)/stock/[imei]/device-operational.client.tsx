"use client";

import { useMemo, useState } from "react";
import { AlertCircle, ArrowRight, LinkExternal01, Send01, UserPlus01 } from "@untitledui/icons";
import { useRouter } from "next/navigation";
import { Badge, BadgeWithDot } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Select } from "@/components/base/select/select";
import { TextArea } from "@/components/base/textarea/textarea";
import { BaseModal } from "@/components/modals/base-modal";
import { DEVICE_STATUS_LABELS } from "@/constants/device-status";
import { clearFilteredStockCache } from "@/hooks/use-stock-data";
import { formatInventoryDate } from "@/lib/inventory-utils";

type StatusColor = "success" | "brand" | "warning" | "gray" | "error";
type ReleasableStatus = "USED" | "REPAIRED" | "NOT_REPAIRED" | "LOST";
type SoftDeleteStatus = "USED" | "REPAIRED" | "NOT_REPAIRED" | "LOST";

export type DeviceOperationalSummary = {
    id: string;
    imei: string;
    modelDisplay: string;
    distributorName: string | null;
    assignedTo: string | null;
    ticketId: string | null;
    status: string;
    statusLabel: string;
    statusColor: StatusColor;
    updatedAt: string;
};

export type AssignmentOperationalItem = {
    id: string;
    type: string;
    status: string;
    assigneeName: string;
    assigneeEmail: string | null;
    distributorName: string | null;
    ticketId: string | null;
    assignedAt: string;
    closedAt: string | null;
    outboundShipmentStatus: string | null;
    outboundVoucherId: string | null;
    assignmentKind: string | null;
    operationalLabel: string | null;
    roleOrReason: string | null;
    replacementReason: string | null;
};

export type DeviceOperationalData = {
    device: DeviceOperationalSummary;
    activeAssignment: AssignmentOperationalItem | null;
    history: AssignmentOperationalItem[];
};

interface DeviceOperationalClientProps {
    initialData: DeviceOperationalData;
}

const RELEASE_STATUS_OPTIONS: Array<{ id: ReleasableStatus; label: string }> = [
    { id: "USED", label: DEVICE_STATUS_LABELS.USED },
    { id: "REPAIRED", label: DEVICE_STATUS_LABELS.REPAIRED },
    { id: "NOT_REPAIRED", label: DEVICE_STATUS_LABELS.NOT_REPAIRED },
    { id: "LOST", label: DEVICE_STATUS_LABELS.LOST },
];

const SOFT_DELETE_STATUS_OPTIONS: Array<{ id: SoftDeleteStatus; label: string }> = [
    { id: "USED", label: DEVICE_STATUS_LABELS.USED },
    { id: "REPAIRED", label: DEVICE_STATUS_LABELS.REPAIRED },
    { id: "NOT_REPAIRED", label: DEVICE_STATUS_LABELS.NOT_REPAIRED },
    { id: "LOST", label: DEVICE_STATUS_LABELS.LOST },
];

const STATUS_COLOR_BY_ID: Record<ReleasableStatus, StatusColor> = {
    USED: "gray",
    REPAIRED: "success",
    NOT_REPAIRED: "warning",
    LOST: "error",
};

const ASSIGNMENT_TYPE_LABELS: Record<string, string> = {
    ASSIGN: "Asignación",
    REPLACE: "Recambio",
};

const SHIPPING_STATUS_LABELS: Record<string, string> = {
    pending: "Pendiente",
    shipped: "En curso",
    delivered: "Entregado",
};

export function DeviceOperationalClient({ initialData }: DeviceOperationalClientProps) {
    const router = useRouter();
    const [device, setDevice] = useState(initialData.device);
    const [history, setHistory] = useState(initialData.history);
    const [activeAssignment, setActiveAssignment] = useState(initialData.activeAssignment);
    const [justUnlinked, setJustUnlinked] = useState(false);

    const [isUnlinkModalOpen, setIsUnlinkModalOpen] = useState(false);
    const [unlinkReason, setUnlinkReason] = useState("");
    const [resultingStatus, setResultingStatus] = useState<ReleasableStatus>("USED");
    const [isClosingAssignment, setIsClosingAssignment] = useState(false);
    const [closeError, setCloseError] = useState<string | null>(null);

    const [isSoftDeleteModalOpen, setIsSoftDeleteModalOpen] = useState(false);
    const [softDeleteReason, setSoftDeleteReason] = useState("");
    const [softDeleteFinalStatus, setSoftDeleteFinalStatus] = useState<SoftDeleteStatus>("NOT_REPAIRED");
    const [isDeletingDevice, setIsDeletingDevice] = useState(false);
    const [softDeleteError, setSoftDeleteError] = useState<string | null>(null);

    const hasShippingInProgress = Boolean(activeAssignment?.outboundShipmentStatus);

    const latestHistory = useMemo(() => history.slice(0, 8), [history]);

    const openUnlinkModal = () => {
        setCloseError(null);
        setUnlinkReason("");
        setResultingStatus("USED");
        setIsUnlinkModalOpen(true);
    };

    const closeUnlinkModal = () => {
        setIsUnlinkModalOpen(false);
    };

    const openSoftDeleteModal = () => {
        setSoftDeleteError(null);
        setSoftDeleteReason("");
        setSoftDeleteFinalStatus("NOT_REPAIRED");
        setIsSoftDeleteModalOpen(true);
    };

    const closeSoftDeleteModal = () => {
        setIsSoftDeleteModalOpen(false);
    };

    const handleConfirmUnlink = async () => {
        if (!activeAssignment) {
            return;
        }

        setIsClosingAssignment(true);
        setCloseError(null);

        try {
            const response = await fetch(`/api/assignments-n1/${activeAssignment.id}/close`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    reason: unlinkReason.trim() || null,
                    resulting_device_status: resultingStatus,
                }),
            });

            const result = (await response.json()) as {
                success?: boolean;
                error?: string;
                data?: { closed_at?: string; resulting_device_status?: ReleasableStatus };
            };

            if (!response.ok || !result.success) {
                throw new Error(result.error || "No se pudo desvincular el activo.");
            }

            const closedAt = result.data?.closed_at || new Date().toISOString();
            const nextStatus = (result.data?.resulting_device_status || resultingStatus) as ReleasableStatus;

            setHistory((previous) =>
                previous.map((item) =>
                    item.id === activeAssignment.id
                        ? {
                              ...item,
                              status: "completed",
                              closedAt,
                          }
                        : item,
                ),
            );

            setDevice((previous) => ({
                ...previous,
                assignedTo: null,
                ticketId: null,
                status: nextStatus,
                statusLabel: DEVICE_STATUS_LABELS[nextStatus],
                statusColor: STATUS_COLOR_BY_ID[nextStatus],
                updatedAt: closedAt,
            }));

            setActiveAssignment(null);
            setJustUnlinked(true);
            clearFilteredStockCache("/api/stock-n1");
            closeUnlinkModal();
        } catch (error) {
            const message = error instanceof Error ? error.message : "Error inesperado al desvincular.";
            setCloseError(message);
        } finally {
            setIsClosingAssignment(false);
        }
    };

    const handleConfirmSoftDelete = async () => {
        if (activeAssignment) {
            setSoftDeleteError("Primero desvinculá la asignación activa antes de eliminar el activo.");
            return;
        }

        setIsDeletingDevice(true);
        setSoftDeleteError(null);

        try {
            const response = await fetch(`/api/stock-n1/${device.id}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    reason: softDeleteReason.trim() || null,
                    final_status: softDeleteFinalStatus,
                }),
            });

            const result = (await response.json()) as { success?: boolean; error?: string };

            if (!response.ok || !result.success) {
                throw new Error(result.error || "No se pudo eliminar el activo.");
            }

            clearFilteredStockCache("/api/stock-n1");
            closeSoftDeleteModal();
            router.push("/stock");
        } catch (error) {
            const message = error instanceof Error ? error.message : "Error inesperado al eliminar.";
            setSoftDeleteError(message);
        } finally {
            setIsDeletingDevice(false);
        }
    };

    return (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <main className="space-y-4">
                <section className="grid gap-3 sm:grid-cols-2">
                    <article className="rounded-xl border border-secondary bg-primary p-4 shadow-xs">
                        <p className="text-xs text-secondary">Estado</p>
                        <div className="mt-2">
                            <BadgeWithDot type="modern" color={device.statusColor} size="lg">
                                {device.statusLabel}
                            </BadgeWithDot>
                        </div>
                    </article>

                    <article className="rounded-xl border border-secondary bg-primary p-4 shadow-xs">
                        <p className="text-xs text-secondary">Responsable actual</p>
                        <p className="mt-2 text-sm font-semibold text-primary">{activeAssignment?.assigneeName || "Sin asignación activa"}</p>
                    </article>

                    <article className="rounded-xl border border-secondary bg-primary p-4 shadow-xs">
                        <p className="text-xs text-secondary">Distribuidora</p>
                        <p className="mt-2 text-sm font-semibold text-primary">{device.distributorName || "Sin distribuidora"}</p>
                    </article>

                    <article className="rounded-xl border border-secondary bg-primary p-4 shadow-xs">
                        <p className="text-xs text-secondary">Ticket activo</p>
                        <p className="mt-2 text-sm font-semibold text-primary">{activeAssignment?.ticketId || device.ticketId || "Sin ticket"}</p>
                    </article>
                </section>

                <section className="rounded-xl border border-secondary bg-primary p-4 shadow-xs">
                    <div className="mb-3 flex items-center justify-between">
                        <h2 className="text-base font-semibold text-primary">Historial reciente</h2>
                        <Badge size="sm" color="gray">
                            {latestHistory.length} movimientos
                        </Badge>
                    </div>

                    {latestHistory.length === 0 ? (
                        <p className="text-sm text-secondary">No hay historial para este activo todavía.</p>
                    ) : (
                        <div className="space-y-2">
                            {latestHistory.map((item) => {
                                const assignmentTypeLabel = ASSIGNMENT_TYPE_LABELS[item.type] || item.type;
                                const normalizedShippingStatus = item.outboundShipmentStatus ? item.outboundShipmentStatus.toLowerCase() : null;
                                const shippingLabel = normalizedShippingStatus
                                    ? SHIPPING_STATUS_LABELS[normalizedShippingStatus] || normalizedShippingStatus
                                    : "Sin envío";

                                return (
                                    <article key={item.id} className="rounded-lg border border-secondary bg-primary px-3 py-3">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <p className="text-sm font-semibold text-primary">{item.assigneeName}</p>
                                            <Badge size="sm" color={item.status === "active" ? "brand" : "gray"}>
                                                {item.status === "active" ? "Activa" : "Cerrada"}
                                            </Badge>
                                        </div>

                                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-secondary">
                                            <span>{assignmentTypeLabel}</span>
                                            <span>-</span>
                                            <span>{shippingLabel}</span>
                                            <span>-</span>
                                            <span>{formatInventoryDate(item.assignedAt)}</span>
                                        </div>

                                        {item.operationalLabel ? <p className="mt-2 text-xs text-secondary">Contexto: {item.operationalLabel}</p> : null}
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </section>
            </main>

            <aside className="space-y-3">
                {justUnlinked && (
                    <section className="border-success-secondary rounded-xl border bg-success-secondary/10 p-4 shadow-xs">
                        <p className="text-sm font-semibold text-primary">Activo desvinculado</p>
                        <p className="mt-1 text-sm text-secondary">Ahora podés asignar este equipo nuevamente.</p>
                        <div className="mt-3">
                            <Button color="primary" size="sm" iconTrailing={ArrowRight} href={`/stock/assign?imei=${device.imei}`}>
                                Asignar ahora
                            </Button>
                        </div>
                    </section>
                )}

                <section className="rounded-xl border border-secondary bg-primary p-4 shadow-xs">
                    <h2 className="text-base font-semibold text-primary">Acciones</h2>

                    {activeAssignment ? (
                        <>
                            <p className="mt-2 text-sm text-secondary">Este activo tiene una asignación activa. Podés desvincularlo para dejarlo disponible.</p>

                            <div className="mt-4 space-y-2">
                                <Button color="primary-destructive" size="sm" onClick={openUnlinkModal}>
                                    Desvincular activo
                                </Button>

                                {!hasShippingInProgress && (
                                    <Button color="secondary" size="sm" iconLeading={Send01} isDisabled>
                                        Iniciar envío (próximamente)
                                    </Button>
                                )}
                            </div>

                            <div className="mt-3 border-t border-secondary pt-3">
                                <Button color="secondary-destructive" size="sm" onClick={openSoftDeleteModal} isDisabled>
                                    Eliminar activo (soft delete)
                                </Button>
                                <p className="mt-1 text-xs text-secondary">Desvinculá primero la asignación activa para poder eliminar el activo.</p>
                            </div>
                        </>
                    ) : (
                        <>
                            <p className="mt-2 text-sm text-secondary">El activo no tiene asignación activa y está listo para un nuevo flujo.</p>

                            <div className="mt-4 space-y-2">
                                <Button color="primary" size="sm" iconLeading={UserPlus01} href={`/stock/assign?imei=${device.imei}`}>
                                    Asignar activo
                                </Button>

                                <Button color="secondary" size="sm" iconLeading={Send01} isDisabled>
                                    Iniciar envío (próximamente)
                                </Button>

                                <Button color="secondary-destructive" size="sm" onClick={openSoftDeleteModal}>
                                    Eliminar activo (soft delete)
                                </Button>
                            </div>
                        </>
                    )}
                </section>

                <section className="rounded-xl border border-secondary bg-primary p-4 shadow-xs">
                    <p className="text-xs text-secondary">Actualizado</p>
                    <p className="mt-1 text-sm font-medium text-primary">{formatInventoryDate(device.updatedAt)}</p>

                    {activeAssignment?.outboundVoucherId ? (
                        <div className="mt-3 rounded-lg border border-secondary bg-secondary/20 px-3 py-2 text-xs text-secondary">
                            Envío activo: <span className="font-mono text-primary">{activeAssignment.outboundVoucherId}</span>
                        </div>
                    ) : null}

                    <a
                        href={`https://desasa.atlassian.net/issues/?jql=text~"${device.imei}"`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex items-center gap-1 text-xs text-brand-primary hover:underline"
                    >
                        Buscar en Jira
                        <LinkExternal01 className="h-3.5 w-3.5" />
                    </a>
                </section>
            </aside>

            <BaseModal
                open={isUnlinkModalOpen}
                onOpenChange={setIsUnlinkModalOpen}
                title="Desvincular activo"
                subtitle="Definí el estado final del equipo antes de liberarlo."
                size="md"
                footer={
                    <>
                        <Button color="secondary" size="sm" onClick={closeUnlinkModal} isDisabled={isClosingAssignment}>
                            Cancelar
                        </Button>
                        <Button color="primary" size="sm" onClick={handleConfirmUnlink} isLoading={isClosingAssignment}>
                            Confirmar desvinculación
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <div className="rounded-lg border border-warning-400/40 bg-warning-500/10 p-3 text-sm text-secondary">
                        <div className="flex items-start gap-2">
                            <AlertCircle className="mt-0.5 h-4 w-4 text-warning-300" />
                            <p>Al confirmar, la asignación activa se cerrará y el equipo volverá a quedar disponible para reasignación.</p>
                        </div>
                    </div>

                    <Select
                        isRequired
                        label="Estado final del dispositivo"
                        selectedKey={resultingStatus}
                        onSelectionChange={(key) => setResultingStatus(key as ReleasableStatus)}
                        items={RELEASE_STATUS_OPTIONS as any}
                    >
                        {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
                    </Select>

                    <TextArea
                        label="Observación de cierre (opcional)"
                        value={unlinkReason}
                        onChange={(event) => setUnlinkReason(event.target.value)}
                        placeholder="Ej: Se recibió equipo con pantalla dañada y batería agotada"
                        rows={4}
                    />

                    {closeError ? <p className="text-sm text-error-primary">{closeError}</p> : null}
                </div>
            </BaseModal>

            <BaseModal
                open={isSoftDeleteModalOpen}
                onOpenChange={setIsSoftDeleteModalOpen}
                title="Eliminar activo (soft delete)"
                subtitle="Este activo dejará de aparecer en inventario activo."
                size="md"
                footer={
                    <>
                        <Button color="secondary" size="sm" onClick={closeSoftDeleteModal} isDisabled={isDeletingDevice}>
                            Cancelar
                        </Button>
                        <Button color="primary-destructive" size="sm" onClick={handleConfirmSoftDelete} isLoading={isDeletingDevice}>
                            Confirmar eliminación
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <div className="rounded-lg border border-warning-400/40 bg-warning-500/10 p-3 text-sm text-secondary">
                        <div className="flex items-start gap-2">
                            <AlertCircle className="mt-0.5 h-4 w-4 text-warning-300" />
                            <p>El activo quedará marcado como eliminado (soft delete). Podés dejar una razón para auditoría.</p>
                        </div>
                    </div>

                    <Select
                        isRequired
                        label="Estado final del dispositivo"
                        selectedKey={softDeleteFinalStatus}
                        onSelectionChange={(key) => setSoftDeleteFinalStatus(key as SoftDeleteStatus)}
                        items={SOFT_DELETE_STATUS_OPTIONS as any}
                    >
                        {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
                    </Select>

                    <TextArea
                        label="Motivo de eliminación (opcional)"
                        value={softDeleteReason}
                        onChange={(event) => setSoftDeleteReason(event.target.value)}
                        placeholder="Ej: Equipo fuera de inventario operativo"
                        rows={3}
                    />

                    {softDeleteError ? <p className="text-sm text-error-primary">{softDeleteError}</p> : null}
                </div>
            </BaseModal>
        </div>
    );
}
