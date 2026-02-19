"use client";

import { useEffect } from "react";
import { useShallow } from "zustand/react/shallow";
import { Input } from "@/components/base/input/input";
import { Select } from "@/components/base/select/select";
import { DEVICE_STATUS_OPTIONS } from "@/constants/device-status";
import { useCreateStockStore } from "@/store/create-stock.store";

export function IndividualTab({ hidePurchaseTicketField = false }: { hidePurchaseTicketField?: boolean }) {
    const [individualData, setIndividualData, modelOptions, distributorOptions, isLoadingOptions, fetchAllOptions] = useCreateStockStore(
        useShallow((s) => [s.individualData, s.setIndividualData, s.modelOptions, s.distributorOptions, s.isLoadingOptions, s.fetchAllOptions]),
    );

    useEffect(() => {
        fetchAllOptions();
    }, [fetchAllOptions]);

    return (
        <div className="space-y-4">
            <section className="rounded-xl border border-primary bg-secondary/20 px-4 py-3">
                <p className="text-xs font-semibold text-primary">Alta rápida de dispositivo</p>
                <p className="mt-1 text-sm text-secondary">Completá IMEI, modelo, distribuidora y estado. El resto se gestiona en asignaciones.</p>
            </section>

            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-primary bg-primary p-3">
                    <Input
                        id="imei"
                        label="IMEI"
                        placeholder="Ingresá el IMEI del dispositivo"
                        value={individualData.imei}
                        onChange={(value) => setIndividualData({ imei: value })}
                        isRequired
                    />
                </div>

                <div className="rounded-xl border border-primary bg-primary p-3">
                    <Select
                        isRequired
                        label="Estado"
                        placeholder="Seleccione el estado del dispositivo"
                        selectedKey={individualData.status}
                        onSelectionChange={(value) => setIndividualData({ status: value as string })}
                        items={DEVICE_STATUS_OPTIONS as any}
                    >
                        {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
                    </Select>
                </div>

                <div className="rounded-xl border border-primary bg-primary p-3">
                    <Select
                        isRequired
                        label="Modelo"
                        placeholder="Seleccione el modelo del dispositivo"
                        selectedKey={individualData.modelo}
                        onSelectionChange={(value) => setIndividualData({ modelo: value as string })}
                        items={modelOptions as any}
                        isDisabled={isLoadingOptions}
                    >
                        {(item) => (
                            <Select.Item
                                id={item.id}
                                supportingText={item.supportingText}
                                isDisabled={item.isDisabled}
                                icon={item.icon}
                                avatarUrl={item.avatarUrl}
                            >
                                {item.label}
                            </Select.Item>
                        )}
                    </Select>
                </div>

                <div className="rounded-xl border border-primary bg-primary p-3">
                    <Select
                        isRequired
                        label="Distribuidora"
                        placeholder="Seleccione la distribuidora"
                        selectedKey={individualData.distribuidora}
                        onSelectionChange={(value) => setIndividualData({ distribuidora: value as string })}
                        items={distributorOptions as any}
                        isDisabled={isLoadingOptions}
                    >
                        {(item) => (
                            <Select.Item
                                id={item.id}
                                supportingText={item.supportingText}
                                isDisabled={item.isDisabled}
                                icon={item.icon}
                                avatarUrl={item.avatarUrl}
                            >
                                {item.label}
                            </Select.Item>
                        )}
                    </Select>
                </div>

                {!hidePurchaseTicketField && (
                    <div className="rounded-xl border border-primary bg-primary p-3 sm:col-span-2">
                        <Input
                            id="purchase_id"
                            label="Ticket de compra (opcional)"
                            placeholder="Identificador de compra"
                            value={individualData.purchase_id}
                            onChange={(value) => setIndividualData({ purchase_id: value })}
                        />
                    </div>
                )}
            </section>
        </div>
    );
}
