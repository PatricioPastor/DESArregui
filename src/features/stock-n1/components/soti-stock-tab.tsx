"use client";

import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { Download01, RefreshCw01, SearchLg, UploadCloud02 } from "@untitledui/icons";
import { toast } from "sonner";
import { PaginationCardMinimal } from "@/components/application/pagination/pagination";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { useDebounce } from "@/hooks/use-debounce";
import { type SotiActiveFilter, useSotiStockData } from "@/hooks/use-soti-stock-data";
import type { SotiSyncResponse } from "@/lib/types";
import { SotiLogo } from "./soti-logo";

const PAGE_SIZE = 25;
const SOTI_LICENSES_TOTAL = 1944;

const SOTI_FILTER_OPTIONS = {
    ACTIVE: "active",
    ALL: "all",
    INACTIVE: "inactive",
} as const;

const formatIsoDate = (value: string): string => {
    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
        return "-";
    }

    return new Intl.DateTimeFormat("es-AR", {
        dateStyle: "short",
        timeStyle: "short",
    }).format(parsedDate);
};

const buildExportFileName = (): string => {
    const stamp = new Date().toISOString().replace(/[.:]/g, "-");
    return `jira-assets-stock-nuevo-${stamp}.csv`;
};

export function SotiStockTab() {
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [activeFilter, setActiveFilter] = useState<SotiActiveFilter>(SOTI_FILTER_OPTIONS.ACTIVE);
    const [isImporting, setIsImporting] = useState(false);
    const debouncedSearch = useDebounce(search, 300);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { data, isLoading, error, refresh, pagination, summary } = useSotiStockData({
        search: debouncedSearch,
        page,
        limit: PAGE_SIZE,
        active: activeFilter,
    });

    const activeCount = summary?.activeRecords ?? 0;
    const availableLicenses = Math.max(0, SOTI_LICENSES_TOTAL - activeCount);

    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, activeFilter]);

    const triggerFilePicker = () => {
        fileInputRef.current?.click();
    };

    const downloadCsv = async () => {
        try {
            const url = new URL("/api/stock-soti/export-jira-assets", window.location.origin);
            if (debouncedSearch.trim()) {
                url.searchParams.set("search", debouncedSearch.trim());
            }
            url.searchParams.set("active", "all");

            const response = await fetch(url.toString(), {
                headers: {
                    "Cache-Control": "no-cache",
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const csvContent = await response.text();
            if (!csvContent.trim()) {
                toast.warning("No hay filas para exportar");
                return;
            }

            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
            const blobUrl = URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.href = blobUrl;
            link.download = buildExportFileName();
            document.body.append(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(blobUrl);

            toast.success("Exportacion de Jira Assets completada");
        } catch (exportError) {
            const message = exportError instanceof Error ? exportError.message : "Error inesperado durante la exportacion";
            toast.error("Error exportando Jira Assets", {
                description: message,
            });
        }
    };

    const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = "";

        if (!file) {
            return;
        }

        setIsImporting(true);
        const toastId = toast.loading("Importando archivo SOTI...");

        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("finalize", "true");
            formData.append("syncToken", new Date().toISOString());
            formData.append("sourceFileName", file.name);

            const response = await fetch("/api/sync/soti", {
                method: "POST",
                body: formData,
            });

            const payload = (await response.json()) as SotiSyncResponse;
            if (!response.ok) {
                throw new Error(payload.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            if (payload.success) {
                toast.success("Importacion SOTI completada", {
                    id: toastId,
                    description: `${payload.processed.toLocaleString("es-AR")} procesados • ${payload.created.toLocaleString("es-AR")} creados • ${payload.updated.toLocaleString("es-AR")} actualizados • ${payload.deactivated.toLocaleString("es-AR")} desactivados`,
                    duration: 8000,
                });
            } else {
                toast.warning("Importacion SOTI completada con errores", {
                    id: toastId,
                    description: `Invalidas: ${payload.invalid.toLocaleString("es-AR")} • Errores: ${payload.errors.toLocaleString("es-AR")}`,
                    duration: 10000,
                });
            }

            await refresh();
        } catch (importError) {
            const message = importError instanceof Error ? importError.message : "Error inesperado durante la importacion";
            toast.error("Error importando SOTI", {
                id: toastId,
                description: message,
            });
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <section className="grid gap-3 xl:h-[calc(100dvh-22rem)] xl:grid-cols-[minmax(0,1fr)_280px]">
            <article className="flex min-h-0 flex-col rounded-2xl border border-secondary bg-primary p-3 shadow-sm">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <h2 className="text-base font-semibold text-primary">Inventario SOTI</h2>
                        <p className="text-xs text-secondary">Activos por defecto, con busqueda y paginacion server-side.</p>
                    </div>

                    <Button color="secondary" size="sm" iconLeading={RefreshCw01} onClick={() => void refresh()} isDisabled={isLoading || isImporting}>
                        Actualizar
                    </Button>
                </div>

                <div className="mb-2 flex flex-col gap-2 lg:flex-row lg:items-center">
                    <Input
                        aria-label="Buscar en SOTI"
                        icon={SearchLg}
                        placeholder="Buscar por IMEI, dispositivo, modelo, usuario o Jira"
                        value={search}
                        onChange={setSearch}
                        className="w-full"
                    />

                    <div className="grid grid-cols-3 gap-2">
                        <Button
                            color={activeFilter === SOTI_FILTER_OPTIONS.ACTIVE ? "primary" : "secondary"}
                            size="sm"
                            onClick={() => setActiveFilter(SOTI_FILTER_OPTIONS.ACTIVE)}
                        >
                            Activos
                        </Button>
                        <Button
                            color={activeFilter === SOTI_FILTER_OPTIONS.ALL ? "primary" : "secondary"}
                            size="sm"
                            onClick={() => setActiveFilter(SOTI_FILTER_OPTIONS.ALL)}
                        >
                            Todos
                        </Button>
                        <Button
                            color={activeFilter === SOTI_FILTER_OPTIONS.INACTIVE ? "primary" : "secondary"}
                            size="sm"
                            onClick={() => setActiveFilter(SOTI_FILTER_OPTIONS.INACTIVE)}
                        >
                            Inactivos
                        </Button>
                    </div>
                </div>

                {error ? (
                    <p className="border-error-subtle mb-2 rounded-lg border bg-utility-error-50 px-3 py-2 text-sm text-utility-error-700">{error}</p>
                ) : null}

                <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-secondary">
                    <table className="min-w-full border-collapse text-sm">
                        <thead className="sticky top-0 z-10 bg-primary">
                            <tr className="border-b border-secondary text-left text-xs font-semibold tracking-wide text-secondary uppercase">
                                <th className="px-3 py-2">Dispositivo</th>
                                <th className="px-3 py-2">IMEI / MEID / ESN</th>
                                <th className="px-3 py-2">Usuario</th>
                                <th className="px-3 py-2">Modelo</th>
                                <th className="px-3 py-2">Solicitud</th>
                                <th className="px-3 py-2">Telefono</th>
                                <th className="px-3 py-2">Estado</th>
                                <th className="px-3 py-2">Ultima sincronizacion</th>
                            </tr>
                        </thead>
                        <tbody className="bg-primary">
                            {isLoading && (
                                <tr>
                                    <td colSpan={8} className="px-3 py-10 text-center text-sm text-secondary">
                                        Cargando inventario SOTI...
                                    </td>
                                </tr>
                            )}

                            {!isLoading && data.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="px-3 py-10 text-center text-sm text-secondary">
                                        No hay filas SOTI para el filtro actual.
                                    </td>
                                </tr>
                            )}

                            {!isLoading &&
                                data.map((row) => (
                                    <tr key={row.id} className="border-b border-secondary/70 transition-colors hover:bg-secondary/20">
                                        <td className="px-3 py-3 font-medium text-primary">{row.device_name}</td>
                                        <td className="px-3 py-3 font-mono text-xs text-secondary">{row.identity_imei}</td>
                                        <td className="px-3 py-3 text-secondary">{row.assigned_user || "-"}</td>
                                        <td className="px-3 py-3 text-secondary">{row.model || "-"}</td>
                                        <td className="px-3 py-3 text-secondary">{row.jira_ticket_id_normalized || "-"}</td>
                                        <td className="px-3 py-3 text-secondary">{row.phone || "-"}</td>
                                        <td className="px-3 py-3">
                                            <Badge size="sm" color={row.is_active ? "success" : "gray"}>
                                                {row.is_active ? "Activo" : "Inactivo"}
                                            </Badge>
                                        </td>
                                        <td className="px-3 py-3 text-secondary">{formatIsoDate(row.last_seen_at)}</td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>

                {(pagination?.totalPages ?? 1) > 1 ? (
                    <PaginationCardMinimal align="right" page={page} total={pagination?.totalPages ?? 1} onPageChange={setPage} className="mt-2 px-0 py-0" />
                ) : null}
            </article>

            <aside className="flex h-full min-h-0 flex-col gap-3 rounded-2xl border border-secondary bg-primary p-3 shadow-sm">
                <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileChange} className="hidden" aria-hidden="true" />

                <div className="space-y-2">
                    <Button
                        color="primary"
                        size="sm"
                        iconLeading={UploadCloud02}
                        onClick={triggerFilePicker}
                        isLoading={isImporting}
                        className="w-full"
                        showTextWhileLoading
                    >
                        {isImporting ? "Importando..." : "Importar SOTI"}
                    </Button>

                    <Button
                        color="secondary"
                        size="sm"
                        iconLeading={Download01}
                        onClick={() => void downloadCsv()}
                        className="w-full"
                        isDisabled={isImporting || isLoading}
                    >
                        <span className="inline-flex items-center gap-2">
                            <span>Exportar a</span>
                            <img src="/jira-assets.svg" alt="Jira Assets" className="h-4 w-auto" />
                        </span>
                    </Button>
                </div>

                <div className="rounded-xl border border-secondary bg-primary px-3 py-3 shadow-xs">
                    <div className="flex items-center gap-2">
                        <SotiLogo className="h-5 w-auto shrink-0" />
                        <p className="text-xs font-bold text-primary">Licencias SOTI</p>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-primary">
                        {activeCount.toLocaleString("es-AR")} / {SOTI_LICENSES_TOTAL.toLocaleString("es-AR")}
                    </p>
                    <p className="text-xs text-secondary">Disponibles: {availableLicenses.toLocaleString("es-AR")}</p>
                </div>
            </aside>
        </section>
    );
}
