"use client";

import { useState, useMemo } from "react";
import { SearchLg, FilterLines } from "@untitledui/icons";
import type { SortDescriptor } from "react-aria-components";
import { PaginationCardMinimal } from "@/components/application/pagination/pagination";
import { Table, TableCard } from "@/components/application/table/table";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
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

export function TicketsTable({
  tickets = [],
  loading = false,
  title = "Tickets del Período",
  description
}: TicketsTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: "created",
    direction: "descending",
  });
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);

  // Filter tickets by search query
  const filteredTickets = useMemo(() => {
    if (!searchQuery.trim()) return tickets;

    const query = searchQuery.toLowerCase();
    return tickets.filter(ticket =>
      ticket.key?.toLowerCase().includes(query) ||
      ticket.enterprise?.toLowerCase().includes(query) ||
      ticket.creator?.toLowerCase().includes(query) ||
      ticket.title?.toLowerCase().includes(query)
    );
  }, [tickets, searchQuery]);

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
        color={isAssignment ? 'brand' : 'warning'}
      >
        {isAssignment ? 'Asignación' : 'Recambio'}
      </Badge>
    );
  };

  return (
    <TableCard.Root>
      <TableCard.Header
        title={title}
        badge={`${sortedTickets.length} ${sortedTickets.length === 1 ? 'ticket' : 'tickets'}`}
        description={description}
      />

      {/* Search Bar */}
      <div className="flex flex-col gap-4 border-b border-secondary px-4 py-4 md:px-6 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-3 w-full md:w-auto">
          <Input
            icon={SearchLg}
            aria-label="Buscar tickets"
            placeholder="Buscar por ticket, distribuidora, creador..."
            value={searchQuery}
            onChange={(value) => setSearchQuery(value)}
            className="w-full md:w-96"
          />
          <Button size="md" color="secondary" iconLeading={FilterLines}>
            Filtros
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3">Cargando tickets...</span>
        </div>
      ) : sortedTickets.length === 0 ? (
        <div className="flex items-center justify-center p-12">
          <p className="text-muted-foreground">
            {searchQuery ? 'No se encontraron tickets con esos criterios' : 'No hay tickets para mostrar'}
          </p>
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
              <Table.Head id="key" label="Ticket" isRowHeader allowsSorting className="w-32" />
              <Table.Head id="title" label="Título" allowsSorting />
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
                    <span className="font-mono text-xs font-medium text-brand">
                      {ticket.key}
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium line-clamp-1">
                        {ticket.title || "-"}
                      </span>
                      {ticket.label && (
                        <span className="text-xs text-tertiary line-clamp-1">
                          {ticket.label}
                        </span>
                      )}
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    <span className="text-sm">{ticket.enterprise || "-"}</span>
                  </Table.Cell>
                  <Table.Cell className="hidden lg:table-cell">
                    <span className="text-sm text-secondary">{ticket.creator || "-"}</span>
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
            align="right"
            page={page}
            total={totalPages}
            onPageChange={setPage}
            className="px-4 py-3 md:px-5 md:pt-3 md:pb-4"
          />
        </>
      )}
    </TableCard.Root>
  );
}
