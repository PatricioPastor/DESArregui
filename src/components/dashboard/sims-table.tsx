"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Copy01, FilterLines, SearchLg, X } from "@untitledui/icons";
import type { SortDescriptor } from "react-aria-components";
import { toast } from "sonner";
import { PaginationCardMinimal } from "@/components/application/pagination/pagination";
import { Table, TableCard } from "@/components/application/table/table";
import { Badge, BadgeWithDot } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Input } from "@/components/base/input/input";
import { Select } from "@/components/base/select/select";
import { useDebounce } from "@/hooks/use-debounce";
import { useSimsData } from "@/hooks/use-sims-data";
import { useSession } from "@/lib/auth-client";
import type { SimRecord } from "@/lib/types";
import { ImportSimsButton } from "./import-sims-button";

function highlightMatches(value: string, query: string) {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) return value;

    const lowerValue = value.toLowerCase();
    const lowerQuery = normalizedQuery.toLowerCase();

    const parts: ReactNode[] = [];

    let startIndex = 0;

    while (true) {
        const matchIndex = lowerValue.indexOf(lowerQuery, startIndex);
        if (matchIndex === -1) {
            parts.push(value.slice(startIndex));
            break;
        }

        if (matchIndex > startIndex) {
            parts.push(value.slice(startIndex, matchIndex));
        }

        const endIndex = matchIndex + normalizedQuery.length;
        parts.push(
            <mark
                key={`${matchIndex}-${endIndex}`}
                className="rounded bg-yellow-400/70 px-0.5 text-gray-950 ring-1 ring-yellow-400/60 dark:bg-yellow-400/35 dark:text-yellow-50"
            >
                {value.slice(matchIndex, endIndex)}
            </mark>,
        );

        startIndex = endIndex;
    }

    return parts;
}

async function copyToClipboard(label: string, value: string) {
    try {
        await navigator.clipboard.writeText(value);
        toast.success(`${label} copiado`);
    } catch (error) {
        console.error("Copy failed:", error);
        toast.error("No se pudo copiar");
    }
}

export function SimsTable() {
    const { data: session } = useSession();
    const isAdmin = session?.user?.role === "admin";
    const [searchQuery, setSearchQuery] = useState("");
    const debouncedSearchQuery = useDebounce(searchQuery, 300);
    const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
        column: "icc",
        direction: "ascending",
    });
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState<number>(50);
    const [showFilters, setShowFilters] = useState(false);
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [providerFilter, setProviderFilter] = useState<string>("all");
    const [distributorFilter, setDistributorFilter] = useState<string>("all");
    const [isActiveFilter, setIsActiveFilter] = useState<string>("all");

    const filters = useMemo(
        () => ({
            status: statusFilter !== "all" ? statusFilter : undefined,
            provider: providerFilter !== "all" ? providerFilter : undefined,
            distributorId: distributorFilter !== "all" ? distributorFilter : undefined,
            isActive: isActiveFilter !== "all" ? isActiveFilter === "true" : undefined,
        }),
        [statusFilter, providerFilter, distributorFilter, isActiveFilter],
    );

    const simsQueryOptions = useMemo(
        () => ({
            page,
            pageSize,
            sort: {
                column: String(sortDescriptor.column),
                direction: sortDescriptor.direction,
            },
        }),
        [page, pageSize, sortDescriptor.column, sortDescriptor.direction],
    );

    const { data, isLoading, error, totalRecords, metadata, refresh } = useSimsData(debouncedSearchQuery, filters, simsQueryOptions);

    // Reset page when filters/sort/pageSize change
    useEffect(() => {
        setPage(1);
    }, [statusFilter, providerFilter, distributorFilter, isActiveFilter, debouncedSearchQuery, pageSize, sortDescriptor.column, sortDescriptor.direction]);

    const clearFilters = () => {
        setStatusFilter("all");
        setProviderFilter("all");
        setDistributorFilter("all");
        setIsActiveFilter("all");
        setSearchQuery("");
    };

    const pageSizeOptions = useMemo(
        () => [
            { id: "10", label: "10" },
            { id: "25", label: "25" },
            { id: "50", label: "50" },
            { id: "100", label: "100" },
        ],
        [],
    );

    const totalFiltered = totalRecords;
    const totalPages = Math.ceil(totalFiltered / pageSize);
    const startItem = totalFiltered === 0 ? 0 : (page - 1) * pageSize + 1;
    const endItem = Math.min(page * pageSize, totalFiltered);

    const getProviderBadge = (provider: string) => {
        const color = provider === "CLARO" ? "brand" : "success";
        return (
            <Badge color={color} size="sm">
                {provider}
            </Badge>
        );
    };

    const getStatusBadge = (status: string) => {
        const colorMap: Record<string, "success" | "warning" | "gray" | "brand"> = {
            Activado: "success",
            Inventario: "warning",
        };
        const color = colorMap[status] || "gray";
        return (
            <Badge color={color} size="sm">
                {status}
            </Badge>
        );
    };

    if (error) {
        return (
            <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
                <p className="text-error">Error al cargar SIMs: {error}</p>
                <Button onClick={refresh}>Reintentar</Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 pb-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-primary">Gestión de SIMs</h1>
                    <p className="mt-1 text-sm text-secondary">
                        Total: {totalRecords.toLocaleString()} SIMs
                        {metadata && (
                            <>
                                {" "}
                                • Activas: {metadata.totalActive.toLocaleString()} • Inactivas: {metadata.totalInactive.toLocaleString()}
                            </>
                        )}
                    </p>
                </div>
                {isAdmin && <ImportSimsButton onImportComplete={refresh} />}
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col gap-4">
                <div className="flex gap-2">
                    <div className="flex-1">
                        <Input
                            type="text"
                            placeholder="Buscar por ICC o IP..."
                            value={searchQuery}
                            onChange={(value) => setSearchQuery(value)}
                            icon={SearchLg}
                        />
                    </div>
                    <ButtonUtility
                        icon={FilterLines}
                        onClick={() => setShowFilters(!showFilters)}
                        tooltip="Mostrar/Ocultar filtros"
                        color={showFilters ? "secondary" : "tertiary"}
                    />
                </div>

                {showFilters && (
                    <div className="flex flex-col gap-3 rounded-lg border border-surface bg-surface-1 p-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium">Filtros</h4>
                            {(providerFilter !== "all" || distributorFilter !== "all" || statusFilter !== "all" || isActiveFilter !== "all") && (
                                <Button size="sm" color="secondary" iconLeading={X} onClick={clearFilters}>
                                    Limpiar
                                </Button>
                            )}
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <Select
                                label="Proveedor"
                                selectedKey={providerFilter}
                                onSelectionChange={(key) => setProviderFilter(key as string)}
                                items={[{ id: "all", label: "Todos" }, ...(metadata?.providers.map((p) => ({ id: p, label: p })) || [])]}
                            >
                                {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
                            </Select>
                            <Select
                                label="Distribuidora"
                                selectedKey={distributorFilter}
                                onSelectionChange={(key) => setDistributorFilter(key as string)}
                                items={[
                                    { id: "all", label: "Todas" },
                                    ...(metadata?.distributors.map((d) => ({
                                        id: d.id,
                                        label: d.name,
                                    })) || []),
                                ]}
                            >
                                {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
                            </Select>
                            <Select
                                label="Estado"
                                selectedKey={statusFilter}
                                onSelectionChange={(key) => setStatusFilter(key as string)}
                                items={[{ id: "all", label: "Todos" }, ...(metadata?.statuses.map((s) => ({ id: s, label: s })) || [])]}
                            >
                                {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
                            </Select>
                            <Select
                                label="Activo"
                                selectedKey={isActiveFilter}
                                onSelectionChange={(key) => setIsActiveFilter(key as string)}
                                items={[
                                    { id: "all", label: "Todos" },
                                    { id: "true", label: "Activas" },
                                    { id: "false", label: "Inactivas" },
                                ]}
                            >
                                {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
                            </Select>
                        </div>
                    </div>
                )}
            </div>

            {/* Table */}
            <TableCard.Root size="sm" className="flex flex-col">
                <TableCard.Header
                    title="SIMS"
                    badge={totalFiltered.toLocaleString("es-AR")}
                    description={`Mostrando ${startItem}–${endItem} de ${totalFiltered.toLocaleString("es-AR")} resultados`}
                    contentTrailing={
                        <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center">
                            <div className="w-28">
                                <Select
                                    aria-label="Cantidad de filas"
                                    selectedKey={String(pageSize)}
                                    onSelectionChange={(key) => {
                                        const next = Number(key);
                                        if (!Number.isNaN(next)) {
                                            setPageSize(next);
                                        }
                                    }}
                                    items={pageSizeOptions}
                                >
                                    {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
                                </Select>
                            </div>

                            {totalPages > 1 && (
                                <PaginationCardMinimal
                                    page={page}
                                    total={totalPages}
                                    onPageChange={setPage}
                                    className="border-t-0 px-0 py-0 md:px-0 md:pt-0 md:pb-0"
                                />
                            )}
                        </div>
                    }
                />

                <Table
                    aria-label="Tabla de SIMs"
                    sortDescriptor={sortDescriptor}
                    onSortChange={(nextSort) => {
                        setSortDescriptor(nextSort);
                    }}
                    selectionMode="none"
                    containerClassName="max-h-[65dvh] overflow-auto"
                >
                    <Table.Header className="sticky top-0 z-10">
                        <Table.Head id="icc" label="ICC" allowsSorting isRowHeader className="w-auto" />
                        <Table.Head id="ip" label="IP" allowsSorting className="w-auto" />
                        <Table.Head id="provider" label="Proveedor" allowsSorting className="w-32" />
                        <Table.Head id="distributor" label="Distribuidora" allowsSorting className="w-auto" />
                        <Table.Head id="status" label="Estado" allowsSorting className="w-32" />
                    </Table.Header>
                    <Table.Body items={data}>
                        {(item: SimRecord) => (
                            <Table.Row id={item.icc} className="group/simrow even:bg-surface-2/60 hover:bg-surface-2">
                                <Table.Cell>
                                    <div className="relative pr-8 font-mono text-sm text-secondary">
                                        <span className="whitespace-nowrap">{highlightMatches(item.icc, debouncedSearchQuery)}</span>
                                        <ButtonUtility
                                            icon={Copy01}
                                            size="xs"
                                            color="tertiary"
                                            tooltip="Copiar ICC"
                                            className="pointer-events-none absolute top-1/2 right-0 -translate-y-1/2 opacity-0 transition-opacity group-hover/simrow:pointer-events-auto group-hover/simrow:opacity-100 focus:pointer-events-auto focus:opacity-100"
                                            onClick={() => copyToClipboard("ICC", item.icc)}
                                        />
                                    </div>
                                </Table.Cell>
                                <Table.Cell>
                                    {item.ip ? (
                                        <div className="relative pr-8 font-mono text-sm text-secondary">
                                            <span className="whitespace-nowrap">{highlightMatches(item.ip, debouncedSearchQuery)}</span>
                                            <ButtonUtility
                                                icon={Copy01}
                                                size="xs"
                                                color="tertiary"
                                                tooltip="Copiar IP"
                                                className="pointer-events-none absolute top-1/2 right-0 -translate-y-1/2 opacity-0 transition-opacity group-hover/simrow:pointer-events-auto group-hover/simrow:opacity-100 focus:pointer-events-auto focus:opacity-100"
                                                onClick={() => copyToClipboard("IP", item.ip!)}
                                            />
                                        </div>
                                    ) : (
                                        <span className="text-quaternary">-</span>
                                    )}
                                </Table.Cell>
                                <Table.Cell>{getProviderBadge(item.provider)}</Table.Cell>
                                <Table.Cell>
                                    {item.distributor ? (
                                        <BadgeWithDot type="modern" color="brand" size="sm">
                                            {item.distributor.name}
                                        </BadgeWithDot>
                                    ) : (
                                        <span className="text-quaternary">-</span>
                                    )}
                                </Table.Cell>
                                <Table.Cell>{getStatusBadge(item.status)}</Table.Cell>
                            </Table.Row>
                        )}
                    </Table.Body>
                </Table>
            </TableCard.Root>
        </div>
    );
}
