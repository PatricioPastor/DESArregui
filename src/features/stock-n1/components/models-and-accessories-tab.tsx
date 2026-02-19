"use client";

import { useEffect, useState } from "react";
import { Plus, RefreshCw01, Trash01 } from "@untitledui/icons";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { cx } from "@/utils/cx";

type ModelRecord = {
    id: string;
    brand: string;
    model: string;
    storage_gb: number | null;
    color: string | null;
    usage_count?: number;
};

type ModelsApiResponse = {
    success: boolean;
    data?: ModelRecord[];
    error?: string;
    message?: string;
};

type ModelFormState = {
    brand: string;
    model: string;
    storageGb: string;
    color: string;
};

const INITIAL_FORM: ModelFormState = {
    brand: "",
    model: "",
    storageGb: "",
    color: "",
};

export function ModelsAndAccessoriesTab() {
    const [models, setModels] = useState<ModelRecord[]>([]);
    const [search, setSearch] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
    const [form, setForm] = useState<ModelFormState>(INITIAL_FORM);

    const selectedModel = models.find((item) => item.id === selectedModelId) || null;
    const isEditMode = Boolean(selectedModel);

    const filteredModels = models.filter((item) => {
        const haystack = [item.brand, item.model, item.storage_gb ? `${item.storage_gb}GB` : "", item.color || ""].join(" ").toLowerCase();
        return haystack.includes(search.trim().toLowerCase());
    });

    const resetFeedback = () => {
        setError(null);
        setSuccess(null);
    };

    const loadModels = async () => {
        try {
            setIsLoading(true);
            setError(null);

            const response = await fetch("/api/models");
            const result = (await response.json()) as ModelsApiResponse;

            if (!response.ok || !result.success) {
                throw new Error(result.error || "No se pudieron cargar los modelos.");
            }

            const rows = result.data || [];
            setModels(rows);

            if (selectedModelId && !rows.some((row) => row.id === selectedModelId)) {
                setSelectedModelId(null);
                setForm(INITIAL_FORM);
            }
        } catch (loadError) {
            const message = loadError instanceof Error ? loadError.message : "Error inesperado al cargar modelos.";
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        void loadModels();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSelectModel = (model: ModelRecord) => {
        resetFeedback();
        setSelectedModelId(model.id);
        setForm({
            brand: model.brand,
            model: model.model,
            storageGb: model.storage_gb ? String(model.storage_gb) : "",
            color: model.color || "",
        });
    };

    const handleCreateMode = () => {
        resetFeedback();
        setSelectedModelId(null);
        setForm(INITIAL_FORM);
    };

    const updateForm = (partial: Partial<ModelFormState>) => {
        resetFeedback();
        setForm((previous) => ({ ...previous, ...partial }));
    };

    const handleSave = async () => {
        const brand = form.brand.trim();
        const model = form.model.trim();

        if (!brand || !model) {
            setError("Marca y modelo son obligatorios.");
            return;
        }

        const storageValue = form.storageGb.trim();
        const parsedStorage = storageValue ? Number(storageValue) : null;
        const isParsedStorageValid = parsedStorage !== null && Number.isInteger(parsedStorage) && parsedStorage > 0;

        if (storageValue && !isParsedStorageValid) {
            setError("El almacenamiento debe ser un número entero mayor a 0.");
            return;
        }

        try {
            setIsSaving(true);
            resetFeedback();

            const payload = {
                brand,
                model,
                storage_gb: parsedStorage,
                color: form.color.trim(),
            };

            const isUpdating = Boolean(selectedModelId);
            const response = await fetch(isUpdating ? `/api/models/${selectedModelId}` : "/api/models", {
                method: isUpdating ? "PATCH" : "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const result = (await response.json()) as { success?: boolean; error?: string; message?: string; data?: ModelRecord };

            if (!response.ok || !result.success) {
                throw new Error(result.error || "No se pudo guardar el modelo.");
            }

            setSuccess(result.message || (isUpdating ? "Modelo actualizado." : "Modelo creado."));
            await loadModels();

            if (!isUpdating) {
                setForm(INITIAL_FORM);
            }
        } catch (saveError) {
            const message = saveError instanceof Error ? saveError.message : "Error inesperado al guardar.";
            setError(message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedModelId || !selectedModel) {
            return;
        }

        const confirmed = window.confirm(`¿Eliminar el modelo ${selectedModel.brand} ${selectedModel.model}?`);
        if (!confirmed) {
            return;
        }

        try {
            setIsDeleting(true);
            resetFeedback();

            const response = await fetch(`/api/models/${selectedModelId}`, { method: "DELETE" });
            const result = (await response.json()) as { success?: boolean; error?: string; message?: string };

            if (!response.ok || !result.success) {
                throw new Error(result.error || "No se pudo eliminar el modelo.");
            }

            setSuccess(result.message || "Modelo eliminado.");
            setSelectedModelId(null);
            setForm(INITIAL_FORM);
            await loadModels();
        } catch (deleteError) {
            const message = deleteError instanceof Error ? deleteError.message : "Error inesperado al eliminar.";
            setError(message);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
            <article className="rounded-2xl border border-secondary bg-primary p-4 shadow-sm">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <h2 className="text-base font-semibold text-primary">Modelos</h2>
                        <p className="text-xs text-secondary">CRUD de tabla de modelos (`phones.phone_model`).</p>
                    </div>

                    <Button color="secondary" size="sm" iconLeading={RefreshCw01} onClick={() => void loadModels()} isDisabled={isLoading}>
                        Actualizar
                    </Button>
                </div>

                <Input label="Buscar modelo" placeholder="Marca, modelo, almacenamiento o color" value={search} onChange={setSearch} />

                <div className="mt-3 overflow-x-auto rounded-xl border border-secondary">
                    <table className="min-w-full divide-y divide-secondary text-sm">
                        <thead className="bg-secondary/40">
                            <tr className="text-left text-xs font-semibold tracking-wide text-secondary uppercase">
                                <th className="px-3 py-2">Marca / Modelo</th>
                                <th className="px-3 py-2">Memoria</th>
                                <th className="px-3 py-2">Color</th>
                                <th className="px-3 py-2">Uso</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-secondary bg-primary">
                            {isLoading && (
                                <tr>
                                    <td colSpan={4} className="px-3 py-8 text-center text-sm text-secondary">
                                        Cargando modelos...
                                    </td>
                                </tr>
                            )}

                            {!isLoading && filteredModels.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-3 py-8 text-center text-sm text-secondary">
                                        No se encontraron modelos.
                                    </td>
                                </tr>
                            )}

                            {!isLoading &&
                                filteredModels.map((item) => {
                                    const selected = selectedModelId === item.id;

                                    return (
                                        <tr
                                            key={item.id}
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => handleSelectModel(item)}
                                            onKeyDown={(event) => {
                                                if (event.key === "Enter" || event.key === " ") {
                                                    event.preventDefault();
                                                    handleSelectModel(item);
                                                }
                                            }}
                                            className={cx(
                                                "cursor-pointer transition-colors hover:bg-secondary/40",
                                                selected && "bg-utility-success-50 ring-1 ring-utility-success-200",
                                            )}
                                        >
                                            <td className="px-3 py-3">
                                                <p className="font-semibold text-primary">{item.brand}</p>
                                                <p className="text-xs text-secondary">{item.model}</p>
                                            </td>
                                            <td className="px-3 py-3 text-secondary">{item.storage_gb ? `${item.storage_gb} GB` : "-"}</td>
                                            <td className="px-3 py-3 text-secondary">{item.color?.trim() || "-"}</td>
                                            <td className="px-3 py-3">
                                                <Badge size="sm" color="gray">
                                                    {item.usage_count ?? 0}
                                                </Badge>
                                            </td>
                                        </tr>
                                    );
                                })}
                        </tbody>
                    </table>
                </div>
            </article>

            <article className="rounded-2xl border border-secondary bg-primary p-4 shadow-sm">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <h3 className="text-base font-semibold text-primary">{isEditMode ? "Editar modelo" : "Nuevo modelo"}</h3>
                        <p className="text-xs text-secondary">
                            {isEditMode ? "Actualizá los datos del modelo seleccionado." : "Creá un modelo para usar en altas."}
                        </p>
                    </div>

                    {isEditMode ? (
                        <Button color="secondary" size="sm" iconLeading={Plus} onClick={handleCreateMode}>
                            Nuevo
                        </Button>
                    ) : null}
                </div>

                <div className="space-y-3">
                    <Input label="Marca" value={form.brand} onChange={(value) => updateForm({ brand: value })} placeholder="Samsung" isRequired />
                    <Input label="Modelo" value={form.model} onChange={(value) => updateForm({ model: value })} placeholder="Galaxy A15" isRequired />
                    <Input
                        label="Almacenamiento (GB)"
                        type="number"
                        value={form.storageGb}
                        onChange={(value) => updateForm({ storageGb: value })}
                        placeholder="128"
                    />
                    <Input label="Color" value={form.color} onChange={(value) => updateForm({ color: value })} placeholder="Negro" />
                </div>

                <div className="mt-4 flex flex-wrap justify-end gap-2">
                    {isEditMode ? (
                        <Button
                            color="secondary"
                            size="sm"
                            iconLeading={Trash01}
                            onClick={handleDelete}
                            isDisabled={isSaving || isDeleting}
                            isLoading={isDeleting}
                        >
                            Eliminar
                        </Button>
                    ) : null}

                    <Button color="primary" size="sm" onClick={handleSave} isLoading={isSaving} isDisabled={isDeleting}>
                        {isEditMode ? "Guardar cambios" : "Crear modelo"}
                    </Button>
                </div>

                {error ? <p className="mt-3 text-sm text-error-primary">{error}</p> : null}
                {success ? <p className="mt-3 text-sm text-success-primary">{success}</p> : null}
            </article>
        </section>
    );
}
