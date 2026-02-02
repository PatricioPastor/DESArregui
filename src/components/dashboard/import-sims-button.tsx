"use client";

import { useRef, useState } from "react";
import { UploadCloud02 } from "@untitledui/icons";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Button } from "@/components/base/buttons/button";

interface SimSyncRecord {
    ICC: string;
    IP?: string | null;
    Estado: string;
    Empresa: string;
}

interface SyncResponse {
    success: boolean;
    processed: number;
    created: number;
    updated: number;
    deactivated: number;
    distributorsCreated: number;
    errors: number;
    error?: string;
    errorDetails?: Array<{ icc: string; error: string }>;
}

const CHUNK_SIZE = 1000;

interface ImportSimsButtonProps {
    onImportComplete?: () => void;
    size?: "sm" | "md";
    color?: "primary" | "secondary";
    className?: string;
}

export function ImportSimsButton({ onImportComplete, size = "sm", color = "secondary", className }: ImportSimsButtonProps) {
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleButtonClick = () => {
        fileInputRef.current?.click();
    };

    const parseExcelFile = async (file: File): Promise<SimSyncRecord[]> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const data = e.target?.result;
                    const workbook = XLSX.read(data, { type: "binary" });

                    // Use first sheet
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];

                    // Convert to JSON
                    const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);

                    // Map to expected format
                    const sims: SimSyncRecord[] = jsonData
                        .map((row) => ({
                            ICC: String(row["ICC"] || row["icc"] || "").trim(),
                            IP: row["IP"] || row["ip"] ? String(row["IP"] || row["ip"]).trim() : null,
                            Estado: String(row["Estado"] || row["estado"] || "Inventario").trim(),
                            Empresa: String(row["Empresa"] || row["empresa"] || "").trim(),
                        }))
                        .filter((sim) => sim.ICC && sim.Empresa);

                    resolve(sims);
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = () => reject(new Error("Error reading file"));
            reader.readAsBinaryString(file);
        });
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Reset input so same file can be selected again
        event.target.value = "";

        setIsLoading(true);

        const toastId = toast.loading("Procesando archivo Excel...", {
            description: "Leyendo datos del archivo",
        });

        try {
            // Parse Excel file
            toast.loading("Parseando archivo...", {
                id: toastId,
                description: `Archivo: ${file.name}`,
            });

            const sims = await parseExcelFile(file);

            if (sims.length === 0) {
                toast.error("Archivo vacío", {
                    id: toastId,
                    description: "No se encontraron SIMs válidas en el archivo",
                });
                setIsLoading(false);
                return;
            }

            toast.loading("Preparando sincronizacion...", {
                id: toastId,
                description: `Total: ${sims.length.toLocaleString("es-AR")} SIMs`,
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
                totals.distributorsCreated += data.distributorsCreated;
                totals.errors += data.errors;
            }

            if (totals.errors === 0) {
                toast.success("Importación completada", {
                    id: toastId,
                    description: `✅ ${totals.processed.toLocaleString("es-AR")} procesados • ${totals.created.toLocaleString("es-AR")} creados • ${totals.updated.toLocaleString("es-AR")} actualizados • ${totals.deactivated.toLocaleString("es-AR")} desactivados`,
                    duration: 8000,
                });
            } else {
                toast.warning("Importación con errores", {
                    id: toastId,
                    description: `⚠️ ${totals.errors} errores • ${totals.processed - totals.errors} exitosos`,
                    duration: 8000,
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
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="hidden" aria-hidden="true" />
            <Button
                color={color}
                size={size}
                iconLeading={UploadCloud02}
                onClick={handleButtonClick}
                isLoading={isLoading}
                isDisabled={isLoading}
                showTextWhileLoading
                className={className}
            >
                {isLoading ? "Importando..." : "Importar Excel"}
            </Button>
        </>
    );
}
