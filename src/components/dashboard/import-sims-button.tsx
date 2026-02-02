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

            toast.loading("Sincronizando con la base de datos...", {
                id: toastId,
                description: `Enviando ${sims.length.toLocaleString("es-AR")} SIMs`,
            });

            // Send to API
            const response = await fetch("/api/sync/sims", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ sims }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({})) as { error?: string };
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            const data: SyncResponse = await response.json();

            if (data.success) {
                toast.success("Importación completada", {
                    id: toastId,
                    description: `✅ ${data.processed.toLocaleString("es-AR")} procesados • ${data.created.toLocaleString("es-AR")} creados • ${data.updated.toLocaleString("es-AR")} actualizados • ${data.deactivated.toLocaleString("es-AR")} desactivados`,
                    duration: 8000,
                });
            } else {
                toast.warning("Importación con errores", {
                    id: toastId,
                    description: `⚠️ ${data.errors} errores • ${data.processed - data.errors} exitosos`,
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
