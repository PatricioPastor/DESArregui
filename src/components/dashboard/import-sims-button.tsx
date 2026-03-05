"use client";

import { useRef, useState } from "react";
import { UploadCloud02 } from "@untitledui/icons";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Button } from "@/components/base/buttons/button";
import { Select } from "@/components/base/select/select";
import { buildSimSyncPayload, resolveSimImportAdapter, validateImportRows } from "@/lib/sim-import";
import { SUPPORTED_SIM_PROVIDER, type SimImportRowError, type SimRecordInput, type SimSyncResponse, type SupportedSimProvider } from "@/lib/types";

const SUPPORTED_PROVIDER_OPTIONS = [
    { id: SUPPORTED_SIM_PROVIDER.MOVISTAR, label: "MOVISTAR" },
    { id: SUPPORTED_SIM_PROVIDER.CLARO, label: "CLARO" },
];

const CHUNK_SIZE = 1000;

interface SimSyncResponseCompatibilityFields {
    createdDistributors?: number;
    distributorsCreated?: number;
}

type SyncResponse = SimSyncResponse & SimSyncResponseCompatibilityFields;

interface ImportSimsButtonProps {
    onImportComplete?: () => void;
    size?: "sm" | "md";
    color?: "primary" | "secondary";
    className?: string;
}

export function ImportSimsButton({ onImportComplete, size = "sm", color = "secondary", className }: ImportSimsButtonProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [selectedProvider, setSelectedProvider] = useState<SupportedSimProvider | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleButtonClick = () => {
        fileInputRef.current?.click();
    };

    const parseSpreadsheetRows = async (file: File): Promise<Record<string, unknown>[]> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const data = e.target?.result;
                    if (!(data instanceof ArrayBuffer)) {
                        throw new Error("No se pudo leer el archivo");
                    }

                    const workbook = XLSX.read(data, { type: "array", raw: false });

                    // Use first sheet
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];

                    // Convert to JSON
                    const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: "" });
                    resolve(jsonData);
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = () => reject(new Error("Error reading file"));
            reader.readAsArrayBuffer(file);
        });
    };

    const getImportErrorPreview = (errors: SimImportRowError[], limit = 3): string => {
        if (errors.length === 0) {
            return "";
        }

        const preview = errors
            .slice(0, limit)
            .map((error) => `Fila ${error.rowIndex}: ${error.reason}`)
            .join(" | ");

        if (errors.length > limit) {
            return `${preview} | +${errors.length - limit} filas con detalle adicional`;
        }

        return preview;
    };

    const countInvalidRows = (errors: SimImportRowError[]): number => {
        return new Set(errors.map((error) => `${error.provider}-${error.rowIndex}`)).size;
    };

    const getDistributorsCreated = (response: SyncResponse): number => {
        return response.createdDistributors ?? response.distributorsCreated ?? 0;
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Reset input so same file can be selected again
        event.target.value = "";

        if (!selectedProvider) {
            toast.error("Seleccioná un proveedor", {
                description: "Solo se admiten MOVISTAR o CLARO",
            });
            return;
        }

        setIsLoading(true);

        const toastId = toast.loading("Procesando archivo de SIMs...", {
            description: `Proveedor: ${selectedProvider}`,
        });

        try {
            toast.loading("Parseando archivo...", {
                id: toastId,
                description: `Archivo: ${file.name}`,
            });

            const parsedRows = await parseSpreadsheetRows(file);

            if (parsedRows.length === 0) {
                toast.error("Archivo vacío", {
                    id: toastId,
                    description: "No se encontraron filas para procesar",
                });
                setIsLoading(false);
                return;
            }

            const adapter = resolveSimImportAdapter(selectedProvider);
            const adapterResult = adapter.extractRows(parsedRows);
            const validationResult = validateImportRows(adapterResult.rows);
            const validationErrors = [...adapterResult.errors, ...validationResult.errors];
            const invalidRowsCount = countInvalidRows(validationErrors);
            const sims: SimRecordInput[] = buildSimSyncPayload(validationResult.validRows);

            if (sims.length === 0) {
                toast.error("No hay SIMs válidas para importar", {
                    id: toastId,
                    description: `Proveedor: ${selectedProvider} • Filas: ${adapterResult.summary.totalRows.toLocaleString("es-AR")} • Inválidas: ${invalidRowsCount.toLocaleString("es-AR")}. ${getImportErrorPreview(validationErrors)}`,
                    duration: 10000,
                });
                setIsLoading(false);
                return;
            }

            toast.loading("Preparando sincronizacion...", {
                id: toastId,
                description: `Proveedor: ${selectedProvider} • Válidas: ${sims.length.toLocaleString("es-AR")} • Inválidas: ${invalidRowsCount.toLocaleString("es-AR")}`,
            });

            const totalChunks = Math.ceil(sims.length / CHUNK_SIZE);
            const syncToken = new Date().toISOString();
            const totals = {
                processed: 0,
                created: 0,
                updated: 0,
                deactivated: 0,
                distributorsCreated: 0,
                errors: 0,
            };

            for (let index = 0; index < totalChunks; index += 1) {
                const start = index * CHUNK_SIZE;
                const chunk = sims.slice(start, start + CHUNK_SIZE);
                const isLastChunk = index === totalChunks - 1;

                toast.loading("Sincronizando con la base de datos...", {
                    id: toastId,
                    description: `Lote ${index + 1}/${totalChunks} • ${chunk.length.toLocaleString("es-AR")} SIMs`,
                });

                const response = await fetch("/api/sync/sims", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        sims: chunk,
                        syncToken,
                        chunkIndex: index + 1,
                        totalChunks,
                        finalize: isLastChunk,
                    }),
                });

                if (!response.ok) {
                    const errorData = (await response.json().catch(() => ({}))) as { error?: string };
                    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
                }

                const data: SyncResponse = await response.json();
                totals.processed += data.processed;
                totals.created += data.created;
                totals.updated += data.updated;
                totals.deactivated += data.deactivated;
                totals.distributorsCreated += getDistributorsCreated(data);
                totals.errors += data.errors;
            }

            if (totals.errors === 0 && validationErrors.length === 0) {
                toast.success("Importación completada", {
                    id: toastId,
                    description: `✅ Proveedor ${selectedProvider} • ${totals.processed.toLocaleString("es-AR")} procesados • ${totals.created.toLocaleString("es-AR")} creados • ${totals.updated.toLocaleString("es-AR")} actualizados • ${totals.deactivated.toLocaleString("es-AR")} desactivados`,
                    duration: 8000,
                });
            } else {
                toast.warning("Importación con errores", {
                    id: toastId,
                    description: `⚠️ Proveedor ${selectedProvider} • Válidas: ${sims.length.toLocaleString("es-AR")} • Inválidas: ${invalidRowsCount.toLocaleString("es-AR")} • Errores API: ${totals.errors.toLocaleString("es-AR")}. ${getImportErrorPreview(validationErrors)}`,
                    duration: 10000,
                });
            }

            onImportComplete?.();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Error desconocido";

            toast.error("Error en importación", {
                id: toastId,
                description: `❌ ${errorMessage}`,
                duration: 8000,
            });

            console.error("Import error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} className="hidden" aria-hidden="true" />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="min-w-40">
                    <Select
                        placeholder="Proveedor"
                        size="sm"
                        selectedKey={selectedProvider ?? undefined}
                        onSelectionChange={(key) => setSelectedProvider(key as SupportedSimProvider)}
                        items={SUPPORTED_PROVIDER_OPTIONS}
                    >
                        {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
                    </Select>
                </div>
                <Button
                    color={color}
                    size="md"
                    iconLeading={UploadCloud02}
                    onClick={handleButtonClick}
                    isLoading={isLoading}
                    isDisabled={isLoading || !selectedProvider}
                    showTextWhileLoading
                    className={className}
                >
                    {isLoading ? "Importando..." : "Importar archivo"}
                </Button>
            </div>
        </>
    );
}
