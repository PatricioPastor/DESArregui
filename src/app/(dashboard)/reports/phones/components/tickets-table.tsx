"use client";

import { useState, useMemo, useEffect } from "react";
import { SearchLg, FilterLines, X } from "@untitledui/icons";
import type { SortDescriptor } from "react-aria-components";
import { PaginationCardMinimal } from "@/components/application/pagination/pagination";
import { Table, TableCard } from "@/components/application/table/table";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";

import { Select } from "@/components/base/select/select";
import { Badge } from "@/components/base/badges/badges";

interface Ticket {
  id: string;
  key: string;
  title: string;
  issue_type: string;
  label: string;
  enterprise: string;
  created: string;
  updated: string;
  creator: string;
  status: string;
  category_status: string;
  replacement_count: number;
  replacement_type?: string | null;
  is_replacement: boolean;
  is_assignment: boolean;
  is_active: boolean;
}

interface TicketsTableProps {
  tickets: Ticket[];
  loading?: boolean;
  title?: string;
  description?: string;
}

const TICKET_TYPE_OPTIONS = [
  { id: "all", label: "Todos los tipos", value: "all" },
  { id: "assignment", label: "Asignaciones", value: "assignment" },
  { id: "replacement", label: "Recambios", value: "replacement" },
];

const REPLACEMENT_TYPE_OPTIONS = [
  { id: "all", label: "Todos los recambios", value: "all" },
  { id: "ROBO", label: "Robo", value: "ROBO" },
  { id: "ROTURA", label: "Rotura", value: "ROTURA" },
  { id: "OBSOLETO", label: "Obsoleto", value: "OBSOLETO" },
  { id: "PERDIDA", label: "Pérdida", value: "PERDIDA" },
  { id: "SIN_ESPECIFICAR", label: "Sin especificar", value: "SIN_ESPECIFICAR" },
];

export function TicketsTable({
  tickets = [],
  loading = false,
  title = "Tickets del Período",
  description
}: TicketsTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [ticketTypeFilter, setTicketTypeFilter] = useState("all");
  const [replacementTypeFilter, setReplacementTypeFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: "created",
    direction: "descending",
  });
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);

  // Reset page when search or filters change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, ticketTypeFilter, replacementTypeFilter]);

  // Filter tickets by search query and filters
  const filteredTickets = useMemo(() => {
    let result = tickets;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(ticket =>
        ticket.key?.toLowerCase().includes(query) ||
        ticket.enterprise?.toLowerCase().includes(query) ||
        ticket.creator?.toLowerCase().includes(query) ||
        ticket.title?.toLowerCase().includes(query)
      );
    }

    // Apply ticket type filter
    if (ticketTypeFilter !== "all") {
      result = result.filter(ticket =>
        ticketTypeFilter === "assignment" ? ticket.is_assignment : ticket.is_replacement
      );
    }

    // Apply replacement type filter (only when viewing replacements)
    if (ticketTypeFilter === "replacement" && replacementTypeFilter !== "all") {
      result = result.filter(ticket => ticket.replacement_type === replacementTypeFilter);
    }

    return result;
  }, [tickets, searchQuery, ticketTypeFilter, replacementTypeFilter]);

  // Sort tickets
  const sortedTickets = useMemo(() => {
    return [...filteredTickets].sort((a, b) => {
      const column = sortDescriptor.column as keyof Ticket;
      const first = a[column];
      const second = b[column];

      if (first === null || first === undefined) return 1;
      if (second === null || second === undefined) return -1;

      // Handle date sorting
      if (column === "created" || column === "updated") {
        const firstDate = new Date(first as string).getTime();
        const secondDate = new Date(second as string).getTime();
        return sortDescriptor.direction === "descending"
          ? secondDate - firstDate
          : firstDate - secondDate;
      }

      // Handle number sorting
      if (typeof first === "number" && typeof second === "number") {
        return sortDescriptor.direction === "descending"
          ? second - first
          : first - second;
      }

      // Handle string sorting
      const firstStr = String(first);
      const secondStr = String(second);
      const cmp = firstStr.localeCompare(secondStr, 'es', { numeric: true });
      return sortDescriptor.direction === "descending" ? -cmp : cmp;
    });
  }, [filteredTickets, sortDescriptor]);

  // Paginate tickets
  const paginatedTickets = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return sortedTickets.slice(startIndex, startIndex + pageSize);
  }, [sortedTickets, page, pageSize]);

  const totalPages = Math.ceil(sortedTickets.length / pageSize);

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    try {
      return new Date(dateString).toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { color: any; label: string }> = {
      'Done': { color: 'success', label: 'Completado' },
      'In Progress': { color: 'brand', label: 'En Progreso' },
      'To Do': { color: 'gray', label: 'Pendiente' },
      'Cancelled': { color: 'error', label: 'Cancelado' },
    };

    const config = statusMap[status] || { color: 'gray', label: status };
    return <Badge size="sm" color={config.color}>{config.label}</Badge>;
  };

  const getTypeBadge = (isAssignment: boolean) => {
    return (
      <Badge
        size="sm"
        color={isAssignment ? 'blue-light' : 'warning'}
      >
        {isAssignment ? 'Asignación' : 'Recambio'}
      </Badge>
    );
  };

  const hasActiveFilters = ticketTypeFilter !== "all" || replacementTypeFilter !== "all";

  const clearFilters = () => {
    setTicketTypeFilter("all");
    setReplacementTypeFilter("all");
  };

  return (
    <TableCard.Root>
      <TableCard.Header
        title={title}
        badge={`${sortedTickets.length} ${sortedTickets.length === 1 ? 'ticket' : 'tickets'}`}
        description={description}
      />

      {/* Search Bar and Filters */}
      <div className="flex flex-col gap-3 border-b border-secondary px-4 py-4 sm:px-6">
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
          <Input
            icon={SearchLg}
            aria-label="Buscar tickets"
            placeholder="Buscar por ticket, distribuidora, creador..."
            value={searchQuery}
            onChange={(value) => setSearchQuery(value)}
            className="w-[calc(100%-36px)] sm:flex-1"
          />
          <Button
            size="md"
            color="secondary"
            iconLeading={FilterLines}
            className="w-full flex flex-row gap-0.5 items-center justify-center whitespace-nowrap sm:w-auto"
            onClick={() => setShowFilters(!showFilters)}
          >
            Filtros
            {hasActiveFilters && (
              <Badge size="sm" color="brand" className="ml-2">
                {(ticketTypeFilter !== "all" ? 1 : 0) + (replacementTypeFilter !== "all" ? 1 : 0)}
              </Badge>
            )}
          </Button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="flex flex-col gap-3 rounded-lg border border-surface bg-surface-1 p-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Filtros</h4>
              {hasActiveFilters && (
                <Button
                  size="sm"
                  color="secondary"
                  iconLeading={X}
                  onClick={clearFilters}
                >
                  Limpiar
                </Button>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {/* Ticket Type Filter */}
              <Select
                label="Tipo de ticket"
                selectedKey={ticketTypeFilter}
                onSelectionChange={(key) => {
                  setTicketTypeFilter(key as string);
                  // Reset replacement type filter when changing ticket type
                  if (key !== "replacement") {
                    setReplacementTypeFilter("all");
                  }
                }}
                items={TICKET_TYPE_OPTIONS}
              >
                {(item) => (
                  <Select.Item id={item.id}>
                    {item.label}
                  </Select.Item>
                )}
              </Select>

              {/* Replacement Type Filter (conditional) */}
              {ticketTypeFilter === "replacement" && (
                <Select
                  label="Tipo de recambio"
                  selectedKey={replacementTypeFilter}
                  onSelectionChange={(key) => setReplacementTypeFilter(key as string)}
                  items={REPLACEMENT_TYPE_OPTIONS}
                >
                  {(item) => (
                    <Select.Item id={item.id}>
                      {item.label}
                    </Select.Item>
                  )}
                </Select>
              )}
            </div>
          </div>
        )}
      </div>

      {(loading && tickets.length === 0) ? (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3">Cargando tickets...</span>
        </div>
      ) : sortedTickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 gap-2">
          <p className="text-muted-foreground">
            {searchQuery || hasActiveFilters
              ? 'No se encontraron tickets con esos criterios'
              : 'No hay tickets para mostrar'}
          </p>
          {(searchQuery || hasActiveFilters) && (
            <Button
              size="sm"
              color="secondary"
              onClick={() => {
                setSearchQuery("");
                clearFilters();
              }}
            >
              Limpiar búsqueda y filtros
            </Button>
          )}
        </div>
      ) : (
        <>
          <Table
            aria-label="Tickets"
            selectionMode="multiple"
            sortDescriptor={sortDescriptor}
            onSortChange={setSortDescriptor}
          >
            <Table.Header>
              <Table.Head id="title" label="Título" isRowHeader allowsSorting className="w-60"  />
              <Table.Head id="enterprise" label="Distribuidora" allowsSorting className="w-40" />
              <Table.Head id="creator" label="Creador" allowsSorting className="w-36 hidden lg:table-cell" />
              <Table.Head id="status" label="Estado" allowsSorting className="w-32" />
              <Table.Head id="is_assignment" label="Tipo" allowsSorting className="w-28" />
              <Table.Head id="replacement_count" label="Cant." allowsSorting className="w-20 text-center" />
              <Table.Head id="created" label="Fecha" allowsSorting className="w-28" />
            </Table.Header>

            <Table.Body items={paginatedTickets}>
              {(ticket) => (
                <Table.Row id={`ticket-${ticket.id}`}>
                  <Table.Cell>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium line-clamp-1">
                        {ticket.title || "-"}
                      </span>
                      {ticket.key && (
                        <a
                          href={`https://desasa.atlassian.net/browse/${ticket.key}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-primary text-xs font-medium underline"
                        >
                          {ticket.key}
                        </a>
                      )}
                    </div>
                  </Table.Cell>

                  <Table.Cell>
                    <span className="text-sm">{ticket.enterprise || "-"}</span>
                  </Table.Cell>
                  <Table.Cell className="hidden lg:table-cell">
                    <span className="font-medium text-secondary">{ticket.creator || "-"}</span>
                  </Table.Cell>
                  <Table.Cell>
                    {getStatusBadge(ticket.status)}
                  </Table.Cell>
                  <Table.Cell>
                    {getTypeBadge(ticket.is_assignment)}
                  </Table.Cell>
                  <Table.Cell className="text-center">
                    <span className="font-semibold text-sm">
                      {ticket.replacement_count || 1}
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <span className="text-sm text-secondary">
                      {formatDate(ticket.created)}
                    </span>
                  </Table.Cell>
                </Table.Row>
              )}
            </Table.Body>
          </Table>

          <PaginationCardMinimal
            align="center"
            page={page}
            total={totalPages}
            onPageChange={setPage}
            className="px-4 py-3 sm:px-5 sm:pt-3 sm:pb-4"
          />
        </>
      )}
    </TableCard.Root>
  );
}
