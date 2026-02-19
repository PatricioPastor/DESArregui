"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { Bell01, CheckCircle, Copy01, Eye, Package, SearchLg } from "@untitledui/icons";
import Link from "next/link";
import { PaginationCardMinimal } from "@/components/application/pagination/pagination";
import { Tabs } from "@/components/application/tabs/tabs";
import { Avatar } from "@/components/base/avatar/avatar";
import { Badge, BadgeWithDot } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Input } from "@/components/base/input/input";
import { Select, type SelectItemType } from "@/components/base/select/select";
import { BaseModal } from "@/components/modals/base-modal";
import { CreateStockModal } from "@/features/stock/components/create/create-stock-modal";
import { useDebounce } from "@/hooks/use-debounce";
import { clearFilteredStockCache, useFilteredStockData } from "@/hooks/use-stock-data";
import type { InventoryRecord } from "@/lib/types";
import { formatDate, getDeviceState, getDistribuidoraName, getTicketInfo, isRecordAssigned, isRecordAvailable } from "@/utils/stock-utils";
import { ModelsAndAccessoriesTab } from "./models-and-accessories-tab";

const PAGE_SIZE = 16;
const SOTI_LICENSES_TOTAL = 1944;
const SOTI_LICENSES_IN_USE = 1901;

type MainContextTab = "mine" | "inventory" | "catalog";
type SidebarCategory = "available" | "used" | "assigned" | "shipping";

const MAIN_CONTEXT_TABS = [
    { id: "mine" as const, label: "Asignados a mí" },
    { id: "inventory" as const, label: "Inventario de Dispositivos" },
    { id: "catalog" as const, label: "Modelos y accesorios" },
];

const SIDEBAR_CATEGORIES = [
    { id: "available" as const, label: "Disponibles" },
    { id: "used" as const, label: "Usados" },
    { id: "assigned" as const, label: "Asignados" },
    { id: "shipping" as const, label: "En envío" },
];

const getLatestAssignment = (record: InventoryRecord) => {
    const assignments = (record.raw?.assignments as any[]) || [];
    return assignments[0] ?? null;
};

const hasShippingInProgress = (record: InventoryRecord) => {
    const assignment = getLatestAssignment(record);
    if (!assignment || assignment.status !== "active") return false;

    const shippingStatus = typeof assignment.shipping_status === "string" ? assignment.shipping_status.toLowerCase() : "";
    return Boolean(assignment.shipping_voucher_id) || shippingStatus === "pending" || shippingStatus === "shipped";
};

const sortByNewestUpdate = (records: InventoryRecord[]) => {
    return [...records].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
};

type StockUserOption = {
    id: string;
    label: string;
    supportingText?: string;
    email?: string;
};

function SotiLogo({ className }: { className?: string }) {
    const gradient0Id = useId();
    const gradient1Id = useId();
    const gradient2Id = useId();

    return (
        <svg viewBox="0 0 39 29" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="SOTI logo" role="img">
            <path
                d="M32.9295 8.77843C30.8057 3.06518 26.8274 9.40659 26.8274 9.40659L21.4431 16.6155C20.8748 17.3633 20.0074 17.812 19.0502 17.812H19.0202C18.0631 17.812 17.1956 17.3633 16.6273 16.5855L7.98261 4.77018C6.9955 3.42413 7.29462 1.56957 8.64068 0.582461C9.98673 -0.404646 11.8413 -0.105522 12.8284 1.24053L19.0801 9.79545L25.5112 1.21062C26.1693 0.31325 27.276 -0.135435 28.3828 0.0440392C29.4896 0.223513 30.3869 1.00123 30.7459 2.07808L32.9295 8.77843Z"
                fill={`url(#${gradient0Id})`}
            />
            <path
                d="M32.7201 17.7819C32.421 17.8717 32.092 17.9315 31.7928 17.9315C30.5365 17.9315 29.3699 17.1239 28.9512 15.8676L26.8573 9.4065C26.8573 9.4065 30.8057 3.06509 32.9594 8.77834C32.9594 8.77834 32.9594 8.77834 32.9594 8.80826L33.0791 9.1672L34.6644 14.013C35.143 15.5684 34.2756 17.2734 32.7201 17.7819Z"
                fill={`url(#${gradient1Id})`}
            />
            <path
                d="M2.98729 28.7298C2.68816 28.7298 2.35913 28.67 2.06001 28.5802C0.504566 28.0717 -0.362891 26.3667 0.145618 24.8113L4.69229 10.8422C5.2008 9.28679 6.9058 8.41934 8.46124 8.92784C10.0167 9.43635 10.8841 11.1414 10.3756 12.6968L5.82896 26.6658C5.4401 27.9222 4.2436 28.7298 2.98729 28.7298Z"
                fill={`url(#${gradient2Id})`}
            />
            <path
                d="M35.2925 28.7299C34.0362 28.7299 32.8696 27.9222 32.4509 26.6659L31.2544 22.9568C30.7459 21.3715 31.6133 19.6964 33.1688 19.1879C34.7541 18.6793 36.4292 19.5468 36.9377 21.1022L38.1342 24.8114C38.6427 26.3967 37.7753 28.0718 36.2198 28.5803C35.9207 28.6701 35.6216 28.7299 35.2925 28.7299Z"
                fill="#0099DB"
            />
            <defs>
                <linearGradient id={gradient0Id} x1="7.40961" y1="8.91328" x2="32.9317" y2="8.91328" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#5F6586" />
                    <stop offset="1" stopColor="#9096AE" />
                </linearGradient>
                <linearGradient id={gradient1Id} x1="29.3142" y1="7.35616" x2="32.5392" y2="17.2127" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#2C2C46" />
                    <stop offset="0.0744938" stopColor="#31324B" />
                    <stop offset="0.6915" stopColor="#5D6071" />
                    <stop offset="1" stopColor="#6F7381" />
                </linearGradient>
                <linearGradient id={gradient2Id} x1="2.40672" y1="27.3382" x2="8.29675" y2="9.71903" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#5F6586" />
                    <stop offset="0.5558" stopColor="#7C829E" />
                    <stop offset="1" stopColor="#9096AE" />
                </linearGradient>
            </defs>
        </svg>
    );
}

function DeviceRow({ record, selected, onSelect }: { record: InventoryRecord; selected: boolean; onSelect: () => void }) {
    const memoryLabel = record.model_details.storage_gb ? `${record.model_details.storage_gb} GB` : "-";
    const isAssigned = isRecordAssigned(record);
    const ticket = getTicketInfo(record.ticket);
    const assigneeName = record.asignado_a?.trim() || null;
    const ownerName = record.owner_name?.trim() || null;

    return (
        <tr
            role="button"
            tabIndex={0}
            onClick={onSelect}
            onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect();
                }
            }}
            className={
                selected
                    ? "cursor-pointer bg-utility-success-50 ring-1 ring-utility-success-200"
                    : "cursor-pointer transition-colors duration-150 hover:bg-secondary focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none"
            }
        >
            <td className="px-3 py-3">
                <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-primary">{record.modelo || "Sin modelo"}</p>
                    <p className="mt-0.5 truncate font-mono text-xs text-secondary">{record.imei}</p>
                </div>
            </td>
            <td className="px-3 py-3">
                {isAssigned && assigneeName ? (
                    <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-primary">Asignado · {assigneeName}</span>
                        <span className="text-xs text-secondary">{ticket?.display || "Sin ticket"}</span>
                    </div>
                ) : ownerName ? (
                    <div className="flex items-center gap-2">
                        <Avatar src={record.owner_image || undefined} alt={ownerName} size="xs" />
                        <p className="min-w-0 truncate text-sm font-medium text-primary">{ownerName}</p>
                    </div>
                ) : (
                    <span className="text-sm text-secondary">-</span>
                )}
            </td>
            <td className="px-3 py-3 text-sm text-secondary">{memoryLabel}</td>
            <td className="px-3 py-3 text-sm text-secondary">{formatDate(record.updated_at)}</td>
        </tr>
    );
}

export function StockN1Dashboard() {
    const [mainContext, setMainContext] = useState<MainContextTab>("mine");
    const [globalSearch, setGlobalSearch] = useState("");
    const [page, setPage] = useState(1);
    const [sidebarCategory, setSidebarCategory] = useState<SidebarCategory>("available");
    const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
    const [copyImeiState, setCopyImeiState] = useState<"idle" | "copied" | "error">("idle");
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [ownerFilterId, setOwnerFilterId] = useState<string>("all");
    const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
    const [stockUsers, setStockUsers] = useState<StockUserOption[]>([]);
    const [isLoadingStockUsers, setIsLoadingStockUsers] = useState(false);
    const [stockUsersError, setStockUsersError] = useState<string | null>(null);
    const [selectedBackupOwnerId, setSelectedBackupOwnerId] = useState<string | null>(null);
    const [backupUserSearch, setBackupUserSearch] = useState("");
    const [isSavingBackupOwner, setIsSavingBackupOwner] = useState(false);
    const [backupActionMessage, setBackupActionMessage] = useState<string | null>(null);

    const debouncedSearch = useDebounce(globalSearch, 300);

    const isMineContext = mainContext === "mine";
    const listFilters = useMemo(() => (isMineContext ? { mine: true } : undefined), [isMineContext]);
    const { data, isLoading, error, refresh } = useFilteredStockData(debouncedSearch, listFilters, "/api/stock-n1");

    const availableRecords = data.filter((record) => isRecordAvailable(record) && (record.status === "NEW" || record.status === "REPAIRED"));
    const usedRecords = data.filter((record) => record.status === "USED");
    const assignedRecords = data.filter((record) => isRecordAssigned(record));
    const shippingRecords = data.filter((record) => hasShippingInProgress(record));

    const ownerOptions = useMemo<SelectItemType[]>(() => {
        const byOwner = new Map<string, string>();

        data.forEach((record) => {
            if (record.owner_user_id) {
                byOwner.set(record.owner_user_id, record.owner_name || "Usuario sin nombre");
            }
        });

        const dynamicOwners = Array.from(byOwner.entries())
            .map(([id, label]) => ({ id, label }))
            .sort((a, b) => a.label.localeCompare(b.label, "es", { sensitivity: "base" }));

        return [{ id: "all", label: "Todos" }, ...dynamicOwners];
    }, [data]);

    let records = data;
    if (sidebarCategory === "available") records = availableRecords;
    if (sidebarCategory === "used") records = usedRecords;
    if (sidebarCategory === "assigned") records = assignedRecords;
    if (sidebarCategory === "shipping") records = shippingRecords;

    if (!isMineContext && ownerFilterId !== "all") {
        records = records.filter((record) => record.owner_user_id === ownerFilterId);
    }

    records = sortByNewestUpdate(records);

    const categoryCounts = {
        available: availableRecords.length,
        used: usedRecords.length,
        assigned: assignedRecords.length,
        shipping: shippingRecords.length,
    };
    const activeSidebarLabel = SIDEBAR_CATEGORIES.find((item) => item.id === sidebarCategory)?.label || "Inventario";
    const sotiLicensesFree = Math.max(0, SOTI_LICENSES_TOTAL - SOTI_LICENSES_IN_USE);
    const sotiUsagePercent = Math.min(100, Math.round((SOTI_LICENSES_IN_USE / SOTI_LICENSES_TOTAL) * 100));

    const start = (page - 1) * PAGE_SIZE;
    const paginatedRecords = records.slice(start, start + PAGE_SIZE);
    const totalPages = Math.max(1, Math.ceil(records.length / PAGE_SIZE));

    const selectedRecord = records.find((record) => record.id === selectedRecordId) || paginatedRecords[0] || null;

    const selectedDeviceState = selectedRecord ? getDeviceState(selectedRecord) : null;
    const selectedTicket = selectedRecord ? getTicketInfo(selectedRecord.ticket) : null;
    const selectedBackupUser = stockUsers.find((user) => user.id === selectedBackupOwnerId) || null;
    const filteredBackupUsers = useMemo(() => {
        const needle = backupUserSearch.trim().toLowerCase();
        if (!needle) {
            return stockUsers;
        }

        return stockUsers.filter((user) => `${user.label} ${user.supportingText || ""}`.toLowerCase().includes(needle));
    }, [stockUsers, backupUserSearch]);

    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, sidebarCategory, mainContext, ownerFilterId]);

    useEffect(() => {
        if (isMineContext && ownerFilterId !== "all") {
            setOwnerFilterId("all");
        }
    }, [isMineContext, ownerFilterId]);

    useEffect(() => {
        if (ownerFilterId === "all") {
            return;
        }

        const ownerStillExists = ownerOptions.some((option) => option.id === ownerFilterId);
        if (!ownerStillExists) {
            setOwnerFilterId("all");
        }
    }, [ownerFilterId, ownerOptions]);

    useEffect(() => {
        if (!selectedRecordId && records.length > 0) {
            setSelectedRecordId(records[0].id);
            return;
        }

        if (selectedRecordId && !records.some((record) => record.id === selectedRecordId)) {
            setSelectedRecordId(records[0]?.id || null);
        }
    }, [records, selectedRecordId]);

    useEffect(() => {
        setCopyImeiState("idle");
        setBackupActionMessage(null);
    }, [selectedRecordId]);

    const copySelectedImei = async () => {
        if (!selectedRecord) return;

        try {
            await navigator.clipboard.writeText(selectedRecord.imei);
            setCopyImeiState("copied");
            window.setTimeout(() => setCopyImeiState("idle"), 1600);
        } catch {
            setCopyImeiState("error");
        }
    };

    const loadStockUsers = async () => {
        try {
            setIsLoadingStockUsers(true);
            setStockUsersError(null);

            const response = await fetch("/api/stock/users");
            const result = (await response.json()) as {
                success?: boolean;
                error?: string;
                data?: Array<{ id: string; name: string; email: string }>;
            };

            if (!response.ok || !result.success) {
                throw new Error(result.error || "No se pudieron cargar los usuarios de stock.");
            }

            const options: StockUserOption[] = (result.data || []).map((user) => ({
                id: user.id,
                label: user.name,
                supportingText: user.email,
                email: user.email,
            }));

            setStockUsers(options);
        } catch (loadError) {
            const message = loadError instanceof Error ? loadError.message : "Error inesperado al cargar usuarios.";
            setStockUsersError(message);
            setStockUsers([]);
        } finally {
            setIsLoadingStockUsers(false);
        }
    };

    const openBackupModal = async () => {
        setBackupActionMessage(null);
        setStockUsersError(null);
        setSelectedBackupOwnerId(selectedRecord?.owner_user_id || null);
        setBackupUserSearch("");
        setIsBackupModalOpen(true);

        if (stockUsers.length === 0) {
            await loadStockUsers();
        }
    };

    const assignBackupOwner = async () => {
        if (!selectedRecord || !selectedBackupOwnerId) {
            return;
        }

        try {
            setIsSavingBackupOwner(true);
            setBackupActionMessage(null);
            setStockUsersError(null);

            const response = await fetch(`/api/stock-n1/${selectedRecord.id}/owner`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    owner_user_id: selectedBackupOwnerId,
                    set_backup: true,
                }),
            });

            const result = (await response.json()) as { success?: boolean; error?: string; message?: string };

            if (!response.ok || !result.success) {
                throw new Error(result.error || "No se pudo asignar el responsable de backup.");
            }

            setBackupActionMessage(result.message || "Responsable de backup asignado.");
            clearFilteredStockCache("/api/stock-n1");
            await refresh();
            setIsBackupModalOpen(false);
        } catch (saveError) {
            const message = saveError instanceof Error ? saveError.message : "Error inesperado al guardar.";
            setStockUsersError(message);
        } finally {
            setIsSavingBackupOwner(false);
        }
    };

    return (
        <div className="space-y-3 pb-2">
            <section className="rounded-2xl border border-secondary bg-primary p-3 shadow-sm md:p-4">
                <p className="text-xs text-secondary">
                    <Link href="/" className="transition-colors hover:text-primary">
                        Inicio
                    </Link>
                    <span className="mx-2 text-tertiary">/</span>
                    <Link href="/stock" className="transition-colors hover:text-primary">
                        Inventario
                    </Link>
                    <span className="mx-2 text-tertiary">/</span>
                    <span className="font-medium text-primary">Inventario</span>
                </p>

                <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight text-primary">Inventario</h1>
                        <p className="mt-1 text-sm text-secondary">Gestión operativa de activos con vista rápida por estado.</p>
                    </div>

                    <Button color="primary" size="sm" onClick={() => setIsCreateModalOpen(true)}>
                        Nuevo Activo
                    </Button>
                </div>
            </section>

            <header className="rounded-2xl border border-secondary bg-primary p-3 shadow-sm md:p-4">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                    <Tabs selectedKey={mainContext} onSelectionChange={(key) => setMainContext(key as MainContextTab)} className="w-full xl:w-auto">
                        <Tabs.List type="button-minimal" items={MAIN_CONTEXT_TABS} className="w-max overflow-x-auto">
                            {(item) => <Tabs.Item key={item.id} {...item} />}
                        </Tabs.List>
                    </Tabs>

                    <div className="flex w-full items-center gap-2 xl:w-auto">
                        <Input
                            aria-label="Búsqueda global"
                            icon={SearchLg}
                            placeholder="Buscar por IMEI, modelo, ticket o asignatario…"
                            value={globalSearch}
                            onChange={setGlobalSearch}
                            className="w-full xl:w-96"
                        />
                        <ButtonUtility icon={Bell01} tooltip="Notificaciones" size="sm" color="secondary" />
                    </div>
                </div>
            </header>

            {error && (
                <section className="border-error-subtle rounded-xl border bg-utility-error-50 px-4 py-3 text-sm text-utility-error-700">
                    Error cargando inventario N1: {error}
                    <button onClick={() => refresh()} className="ml-2 font-medium underline">
                        Reintentar
                    </button>
                </section>
            )}

            {mainContext === "catalog" && <ModelsAndAccessoriesTab />}

            {(mainContext === "inventory" || mainContext === "mine") && (
                <div className="grid gap-3 xl:h-[calc(100dvh-22rem)] xl:grid-cols-[260px_minmax(0,1fr)_340px]">
                    <aside className="flex h-full min-h-0 flex-col rounded-2xl border border-secondary bg-primary p-3 shadow-sm">
                        <h2 className="text-sm font-semibold text-primary">Filtros Dinámicos</h2>

                        <nav className="mt-3 space-y-2">
                            {SIDEBAR_CATEGORIES.map((item) => {
                                const isActive = sidebarCategory === item.id;
                                const count = categoryCounts[item.id];

                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => setSidebarCategory(item.id)}
                                        className={
                                            isActive
                                                ? "flex w-full items-center justify-between rounded-lg border border-utility-success-300 bg-utility-success-50 px-3 py-2 text-left text-sm font-semibold text-utility-success-700 shadow-xs transition-all duration-200"
                                                : "flex w-full items-center justify-between rounded-lg border border-secondary bg-primary px-3 py-2 text-left text-sm text-primary transition-all duration-200 hover:border-tertiary"
                                        }
                                    >
                                        <span className="flex items-center gap-2">
                                            <span
                                                aria-hidden="true"
                                                className={
                                                    isActive
                                                        ? "h-2 w-2 rounded-full bg-utility-success-500 ring-2 ring-utility-success-100"
                                                        : "h-2 w-2 rounded-full bg-tertiary"
                                                }
                                            />
                                            {item.label}
                                        </span>
                                        <Badge size="sm" color="gray">
                                            {count}
                                        </Badge>
                                    </button>
                                );
                            })}
                        </nav>

                        {!isMineContext && (
                            <div className="mt-3 rounded-xl border border-secondary bg-primary p-2">
                                <Select
                                    label="Responsable a cargo"
                                    size="sm"
                                    placeholder="Todos"
                                    selectedKey={ownerFilterId}
                                    onSelectionChange={(key) => setOwnerFilterId(key ? String(key) : "all")}
                                    items={ownerOptions}
                                >
                                    {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
                                </Select>
                            </div>
                        )}

                        <div className="mt-auto rounded-xl border border-secondary bg-primary px-3 py-3 shadow-xs">
                            <div className="flex items-center gap-2">
                                <SotiLogo className="h-5 w-auto shrink-0" />
                                <p className="text-xs font-bold text-primary">Licencias Disponibles</p>
                            </div>
                            <p className="mt-1 text-xs text-secondary">
                                {SOTI_LICENSES_IN_USE} en uso de {SOTI_LICENSES_TOTAL} disponibles
                            </p>
                            <div className="mt-2 h-2 rounded-full bg-secondary">
                                <div className="h-2 rounded-full" style={{ width: `${sotiUsagePercent}%`, backgroundColor: "#0074aa" }} />
                            </div>
                            <p className="mt-1 text-[11px] text-secondary">
                                {sotiLicensesFree} libres ({sotiUsagePercent}% en uso)
                            </p>
                        </div>
                    </aside>

                    <main className="min-h-0 space-y-0">
                        <section className="flex h-full min-h-0 flex-col rounded-2xl border border-secondary bg-primary p-3 shadow-sm">
                            <div className="mb-2">
                                <div>
                                    <p className="text-xs text-secondary">
                                        {isMineContext ? "Asignados a mí" : "Inventario general"} · Categoría activa: {activeSidebarLabel}
                                    </p>
                                    <h2 className="text-base font-semibold text-primary">Inventario operativo</h2>
                                </div>
                            </div>

                            <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-secondary">
                                <table className="min-w-full divide-y divide-secondary text-sm">
                                    <thead className="sticky top-0 z-10 bg-secondary/40">
                                        <tr className="text-left text-xs font-semibold tracking-wide text-secondary uppercase">
                                            <th className="px-3 py-2">Nombre del Dispositivo</th>
                                            <th className="px-3 py-2">En Posesión de</th>
                                            <th className="px-3 py-2">Tamaño / Memoria</th>
                                            <th className="px-3 py-2">Última Modificación</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-secondary bg-primary">
                                        {isLoading && (
                                            <tr>
                                                <td colSpan={4} className="px-3 py-10 text-center text-sm text-secondary">
                                                    Cargando inventario...
                                                </td>
                                            </tr>
                                        )}

                                        {!isLoading && paginatedRecords.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="px-3 py-10 text-center text-sm text-secondary">
                                                    No hay resultados para los filtros seleccionados.
                                                </td>
                                            </tr>
                                        )}

                                        {!isLoading &&
                                            paginatedRecords.map((record) => (
                                                <DeviceRow
                                                    key={record.id}
                                                    record={record}
                                                    selected={selectedRecord?.id === record.id}
                                                    onSelect={() => setSelectedRecordId(record.id)}
                                                />
                                            ))}
                                    </tbody>
                                </table>
                            </div>

                            {totalPages > 1 && (
                                <PaginationCardMinimal align="right" page={page} total={totalPages} onPageChange={setPage} className="mt-2 px-0 py-0" />
                            )}
                        </section>
                    </main>

                    <aside className="h-full min-h-0 overflow-auto rounded-2xl border border-secondary bg-primary p-3 shadow-sm">
                        {!selectedRecord ? (
                            <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-secondary text-sm text-secondary">
                                Seleccioná un dispositivo para abrir el panel contextual.
                            </div>
                        ) : (
                            <>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <div className="rounded-lg bg-brand-primary/12 p-2 text-brand-primary">
                                            <Package className="h-5 w-5" />
                                        </div>
                                        <p className="truncate text-base font-semibold text-primary">{selectedRecord.modelo || "Sin modelo"}</p>
                                    </div>

                                    <ButtonUtility icon={Eye} tooltip="Ver detalles" size="sm" color="secondary" href={`/stock/${selectedRecord.imei}`} />
                                </div>

                                <div className="mt-4 flex items-center gap-2">
                                    {selectedDeviceState && (
                                        <BadgeWithDot type="pill-color" size="sm" color={selectedDeviceState.color}>
                                            {selectedDeviceState.label}
                                        </BadgeWithDot>
                                    )}
                                    <Badge size="sm" color="gray">
                                        {getDistribuidoraName(selectedRecord.distribuidora) || "Sin distribuidora"}
                                    </Badge>
                                </div>

                                <div className="mt-4 rounded-xl border border-primary bg-secondary/20 px-3 py-3">
                                    <p className="text-xs font-medium text-secondary">IMEI</p>
                                    <div className="mt-1 flex items-center justify-between gap-2">
                                        <p className="min-w-0 font-mono text-sm font-semibold break-all text-primary">{selectedRecord.imei}</p>
                                        <ButtonUtility
                                            icon={
                                                copyImeiState === "copied" ? (
                                                    <CheckCircle data-icon className="scale-110 text-utility-success-500 transition-all duration-200" />
                                                ) : (
                                                    Copy01
                                                )
                                            }
                                            tooltip={copyImeiState === "copied" ? "Copiado" : copyImeiState === "error" ? "Error al copiar" : "Copiar IMEI"}
                                            size="xs"
                                            color="secondary"
                                            onClick={copySelectedImei}
                                        />
                                    </div>
                                </div>

                                <dl className="mt-4 space-y-2 rounded-xl border border-secondary bg-primary px-3 py-3 text-sm">
                                    <div className="grid grid-cols-[110px_1fr] gap-2">
                                        <dt className="font-medium text-secondary">Ticket</dt>
                                        <dd className="text-primary">
                                            {selectedTicket ? (
                                                selectedTicket.url ? (
                                                    <a href={selectedTicket.url} target="_blank" rel="noreferrer" className="inline-flex">
                                                        <BadgeWithDot type="modern" color="warning" size="md">
                                                            {selectedTicket.display}
                                                        </BadgeWithDot>
                                                    </a>
                                                ) : (
                                                    <BadgeWithDot type="modern" color="warning" size="md">
                                                        {selectedTicket.display}
                                                    </BadgeWithDot>
                                                )
                                            ) : (
                                                "Sin ticket"
                                            )}
                                        </dd>
                                    </div>
                                    <div className="grid grid-cols-[110px_1fr] gap-2">
                                        <dt className="font-medium text-secondary">A cargo</dt>
                                        <dd className="text-primary">{selectedRecord.owner_name || "Sin responsable"}</dd>
                                    </div>
                                    <div className="grid grid-cols-[110px_1fr] gap-2">
                                        <dt className="font-medium text-secondary">Capacidad</dt>
                                        <dd className="text-primary">
                                            {selectedRecord.model_details.storage_gb ? `${selectedRecord.model_details.storage_gb} GB` : "-"}
                                        </dd>
                                    </div>
                                    <div className="grid grid-cols-[110px_1fr] gap-2">
                                        <dt className="font-medium text-secondary">Última edición</dt>
                                        <dd className="text-primary">{formatDate(selectedRecord.updated_at)}</dd>
                                    </div>
                                </dl>

                                <section className="mt-4 rounded-xl border border-secondary bg-primary px-3 py-3">
                                    <div className="mb-3 flex items-center justify-between gap-2">
                                        <p className="text-sm font-semibold text-primary">Asignación</p>
                                        {isRecordAssigned(selectedRecord) && (
                                            <Button color="secondary" size="sm" href={`/stock/${selectedRecord.imei}`}>
                                                Gestionar
                                            </Button>
                                        )}
                                    </div>

                                    {isRecordAssigned(selectedRecord) ? (
                                        <div className="flex items-center gap-2 rounded-lg border border-secondary bg-primary px-3 py-2">
                                            <Avatar alt={selectedRecord.asignado_a || "Asignatario"} size="xs" />
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-semibold text-primary">{selectedRecord.asignado_a || "Sin asignatario"}</p>
                                                <p className="text-xs text-secondary">Asignación activa</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <p className="text-sm text-secondary">Este equipo no tiene asignación activa. Elegí cómo proceder.</p>
                                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                                <Button color="secondary" size="sm" onClick={() => void openBackupModal()}>
                                                    Destinar Backup
                                                </Button>
                                                <Button color="primary" size="sm" href={`/stock/assign?imei=${selectedRecord.imei}`}>
                                                    Asignar activo
                                                </Button>
                                            </div>
                                            {backupActionMessage ? <p className="text-xs text-success-primary">{backupActionMessage}</p> : null}
                                        </div>
                                    )}
                                </section>
                            </>
                        )}
                    </aside>
                </div>
            )}

            <BaseModal
                open={isBackupModalOpen}
                onOpenChange={setIsBackupModalOpen}
                title="Destinar Backup"
                subtitle="Elegí claramente quién queda a cargo de este activo backup."
                size="md"
                footer={
                    <>
                        <Button color="secondary" size="sm" onClick={() => setIsBackupModalOpen(false)} isDisabled={isSavingBackupOwner}>
                            Cancelar
                        </Button>
                        <Button
                            color="primary"
                            size="sm"
                            onClick={() => void assignBackupOwner()}
                            isLoading={isSavingBackupOwner}
                            isDisabled={!selectedRecord || !selectedBackupOwnerId || isLoadingStockUsers || stockUsers.length === 0}
                        >
                            {selectedBackupUser ? `Asignar a ${selectedBackupUser.label}` : "Confirmar"}
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <div className="rounded-xl border border-primary bg-secondary/20 px-3 py-3">
                        <p className="text-xs font-medium text-secondary">Dispositivo seleccionado</p>
                        <p className="mt-1 text-sm font-semibold text-primary">{selectedRecord?.modelo || "Sin modelo"}</p>
                        <p className="font-mono text-xs text-secondary">{selectedRecord?.imei || "-"}</p>
                    </div>

                    <Input
                        label="Buscar compañero de stock"
                        icon={SearchLg}
                        placeholder="Nombre o correo"
                        value={backupUserSearch}
                        onChange={setBackupUserSearch}
                        isDisabled={isLoadingStockUsers || stockUsers.length === 0}
                    />

                    <div className="rounded-xl border border-primary bg-primary p-2">
                        {isLoadingStockUsers ? (
                            <p className="px-2 py-8 text-center text-sm text-secondary">Cargando usuarios de stock...</p>
                        ) : filteredBackupUsers.length === 0 ? (
                            <p className="px-2 py-8 text-center text-sm text-secondary">
                                {stockUsers.length === 0 ? "No hay usuarios elegibles." : "No hay resultados para esa búsqueda."}
                            </p>
                        ) : (
                            <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                                {filteredBackupUsers.map((user) => {
                                    const isSelected = selectedBackupOwnerId === user.id;

                                    return (
                                        <button
                                            key={user.id}
                                            type="button"
                                            onClick={() => setSelectedBackupOwnerId(user.id)}
                                            className={
                                                isSelected
                                                    ? "flex w-full items-center gap-3 rounded-lg border border-utility-success-300 bg-utility-success-50 px-3 py-2 text-left"
                                                    : "flex w-full items-center gap-3 rounded-lg border border-secondary bg-primary px-3 py-2 text-left transition-colors hover:border-tertiary hover:bg-secondary/20"
                                            }
                                        >
                                            <Avatar alt={user.label} size="xs" />
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-semibold text-primary">{user.label}</p>
                                                <p className="truncate text-xs text-secondary">{user.supportingText}</p>
                                            </div>
                                            {isSelected ? (
                                                <Badge size="sm" color="success">
                                                    Seleccionado
                                                </Badge>
                                            ) : null}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {selectedBackupUser ? (
                        <div className="border-brand-primary/30 rounded-xl border bg-brand-primary/10 px-3 py-3">
                            <p className="text-xs text-secondary">Responsable seleccionado</p>
                            <p className="mt-1 text-sm font-semibold text-primary">{selectedBackupUser.label}</p>
                            <p className="text-xs text-secondary">{selectedBackupUser.supportingText}</p>
                        </div>
                    ) : null}

                    {!isLoadingStockUsers && stockUsers.length === 0 && (
                        <p className="rounded-lg border border-warning-400/40 bg-warning-500/10 px-3 py-2 text-xs text-warning-300">
                            No hay usuarios activos con rol stock-viewer disponibles. Cuando asignes ese rol, van a aparecer acá automáticamente.
                        </p>
                    )}

                    {stockUsersError ? <p className="text-xs text-error-primary">{stockUsersError}</p> : null}
                </div>
            </BaseModal>

            <CreateStockModal
                open={isCreateModalOpen}
                onOpenChange={setIsCreateModalOpen}
                onSuccess={() => {
                    void refresh();
                }}
                hidePurchaseTicketField
            />
        </div>
    );
}
