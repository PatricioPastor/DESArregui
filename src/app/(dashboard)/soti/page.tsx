"use client";

import { useState, useMemo } from "react";
import { Edit01, FilterLines, RefreshCw01, SearchLg, Trash01 } from "@untitledui/icons";
import type { Key, SortDescriptor } from "react-aria-components";
import { PaginationCardMinimal } from "@/components/application/pagination/pagination";
import { Table, TableCard, TableRowActionsDropdown } from "@/components/application/table/table";
import { ButtonGroup, ButtonGroupItem } from "@/components/base/button-group/button-group";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Input } from "@/components/base/input/input";
import { Badge, BadgeWithDot } from "@/components/base/badges/badges";
import { useFilteredSOTIData } from "@/hooks/use-soti-data";

import type { SOTIRecord } from "@/lib/types";

type FilterType = "all" | "conectados" | "desconectados";

const isAfter2024 = (phone:SOTIRecord) => {

    if(!phone.nombre_dispositivo.includes('_')){
        return false
    }

    const ae = phone.nombre_dispositivo.split('_')[1] 

    if(Number(ae) > 2934 ){
        return true
    }
}
const isAfterLastEnrollemnt = (phone:SOTIRecord) => {

    if(!phone.nombre_dispositivo.includes('_')){
        return false
    }

    const ae = phone.nombre_dispositivo.split('_')[1] 

    if(Number(ae) > 3280 ){
        return true
    }
}


export default function SOTI() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: "fecha_conexion",
    direction: "descending",
  });
  const [selectedFilter, setSelectedFilter] = useState<Set<Key>>(new Set(["all"]));
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [editingRecord, setEditingRecord] = useState<SOTIRecord | null>(null);

  const { filteredData: data, loading: isLoading, error, lastUpdated, refetch } = useFilteredSOTIData(searchQuery);

  // Filter data based on selected filter
  const filteredData = useMemo(() => {
    let filtered = data;

    switch (selectedFilter.values().next().value) {
      case "incompletos":
        filtered = data.filter(record => 
          record.fecha_conexion && !record.fecha_desconexion
        );
        break;
      case "sin_ticket":
        filtered = data.filter(record => 
        (isAfter2024(record) && !record.id_ticket_jira)
        );
        break;
      default:
        filtered = data;
    }

    return filtered;
  }, [data, selectedFilter]);

  // Sort data
  const sortedItems = useMemo(() => {
    return filteredData.sort((a, b) => {
      const first = a[sortDescriptor.column as keyof SOTIRecord] as string;
      const second = b[sortDescriptor.column as keyof SOTIRecord] as string;

      if (!first && !second) return 0;
      if (!first) return 1;
      if (!second) return -1;

      // Handle date sorting for conexion fields
      if (sortDescriptor.column === "fecha_conexion" || sortDescriptor.column === "fecha_desconexion") {
        const firstDate = new Date(first).getTime();
        const secondDate = new Date(second).getTime();
        return sortDescriptor.direction === "descending" ? secondDate - firstDate : firstDate - secondDate;
      }

      // Handle string sorting
      const cmp = first.localeCompare(second, 'es', { numeric: true });
      return sortDescriptor.direction === "descending" ? -cmp : cmp;
    });
  }, [filteredData, sortDescriptor]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return sortedItems.slice(startIndex, startIndex + pageSize);
  }, [sortedItems, page, pageSize]);

  const totalPages = Math.ceil(sortedItems.length / pageSize);

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    try {
      return new Date(dateString).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const getConnectionStatus = (fechaConexion: string, fechaDesconexion: string) => {
    if (!fechaConexion) return <Badge color="gray" size="sm">Sin conexión</Badge>;
    
    const isConnected = fechaConexion && !fechaDesconexion;
    
    return (
      <BadgeWithDot 
        size="sm" 
        color={isConnected ? "success" : "gray"} 
        type="modern"
      >
        {isConnected ? "Conectado" : "Desconectado"}
      </BadgeWithDot>
    );
  };

  const getRutaName = (ruta: string) => {
    if (!ruta) return "-";
    
    // Extract meaningful part from ruta
    const parts = ruta.split('/');
    return parts[parts.length - 1] || ruta;
  };

  const handleEditRecord = (record: SOTIRecord) => {
    setEditingRecord(record);
  };

  const handleRefresh = async () => {
    await refetch();
  };

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error loading SOTI data: {error}</p>
          <Button onClick={refetch} color="primary">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 -mt-6">
      <TableCard.Root>
        <TableCard.Header
          title="Dispositivos SOTI"
          badge={`${sortedItems.length} ${sortedItems.length === 1 ? 'dispositivo' : 'dispositivos'}`}
          description={lastUpdated ? `Última actualización: ${formatDate(lastUpdated)}` : undefined}
          contentTrailing={
            <div className="absolute top-5 flex items-center gap-4 right-4 md:right-6">
              <Button 
            color="secondary" 
            size="md" 
            iconLeading={RefreshCw01} 
            onClick={handleRefresh}
            disabled={isLoading}
          >
            {isLoading ? "Actualizando..." : "Actualizar"}
          </Button> 
              <TableRowActionsDropdown />
            </div>
          }
        />

        {/* Search and Filter Bar */}
        <div className="flex flex-col gap-4 border-b border-secondary px-4 py-4 md:px-6 md:flex-row md:items-center md:justify-between">
          <ButtonGroup 
            selectedKeys={selectedFilter} 
            onSelectionChange={setSelectedFilter}
          >
            <ButtonGroupItem id="all">Ver todos</ButtonGroupItem>
            <ButtonGroupItem id="incompletos">Incompletos</ButtonGroupItem>
            <ButtonGroupItem id="sin_ticket">Sin Ticket</ButtonGroupItem>
          </ButtonGroup>

          <div className="flex gap-3">
            <Input
              icon={SearchLg}
              aria-label="Buscar dispositivos"
              placeholder="Buscar dispositivo, usuario, IMEI..."
              value={searchQuery}
              onChange={(e:any) => setSearchQuery(e.target.value)}
              className="w-full md:w-80"
            />
            <Button size="md" color="secondary" iconLeading={FilterLines}>
              Filtros
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-3">Cargando datos...</span>
          </div>
        ) : (
          <>
            <Table 
              aria-label="Dispositivos SOTI" 
              selectionMode="multiple" 
              sortDescriptor={sortDescriptor} 
              onSortChange={setSortDescriptor}
            >
              <Table.Header>
                <Table.Head id="nombre_dispositivo" label="Dispositivo" isRowHeader allowsSorting />
                <Table.Head id="usuario_asignado" label="Usuario" allowsSorting />
                <Table.Head id="modelo" label="Modelo" allowsSorting />
                <Table.Head id="id_ticket_jira" label="Ticket" allowsSorting className="hidden lg:table-cell" />
                <Table.Head id="imei" label="IMEI" allowsSorting className="w-40" />
                <Table.Head id="telefono" label="Teléfono" allowsSorting />
                <Table.Head id="fecha_conexion" label="Estado" allowsSorting className="w-32" />
                <Table.Head id="ubicacion" label="Ubicación" allowsSorting className="hidden xl:table-cell" />
                <Table.Head id="actions" className="w-20" />
              </Table.Header>

              <Table.Body items={paginatedData}>
                {(item) => (
                  <Table.Row id={`soti-${item.imei}`}>
                    <Table.Cell>
                      <div className="flex flex-col">
                        <span className="font-medium text-primary">{item.nombre_dispositivo || "-"}</span>
                        <span className="text-xs text-secondary">{getRutaName(item.ruta).replace('\\','/') }</span>
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <span className="font-medium text-gray-200">{item.usuario_asignado || "-"}</span>
                    </Table.Cell>
                    <Table.Cell className="whitespace-nowrap">{item.modelo || "-"}</Table.Cell>
                    <Table.Cell className="whitespace-nowrap hidden lg:table-cell">
                      <BadgeWithDot type="modern" color={
                        item.id_ticket_jira ? "success" : 
                        isAfterLastEnrollemnt(item) ? "error" : 
                        isAfter2024(item) ? "warning" : 
                        "gray"
                      } >
                        {item.id_ticket_jira || "Sin ticket" }
                      </BadgeWithDot>
                    </Table.Cell>
                    <Table.Cell>
                      <span className="font-mono text-xs">{item.imei || "-"}</span>
                    </Table.Cell>
                    <Table.Cell>{item.telefono || "-"}</Table.Cell>
                    <Table.Cell className="whitespace-nowrap text-sm">
                      {getConnectionStatus(item.fecha_conexion, item.fecha_desconexion)}
                    </Table.Cell>
                    <Table.Cell className="whitespace-nowrap hidden xl:table-cell">
                      {item.ubicacion || "-"}
                    </Table.Cell>
                    
                    <Table.Cell className="px-3">
                      <div className="flex justify-end gap-0.5">
                        <ButtonUtility 
                          size="xs" 
                          color="tertiary" 
                          tooltip="Editar" 
                          icon={Edit01}
                          onClick={() => handleEditRecord(item)}
                        />
                        <ButtonUtility size="xs" color="tertiary" tooltip="Eliminar" icon={Trash01} />
                      </div>
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

      {/* <EditRecordModal
        isOpen={!!editingRecord}
        onClose={() => setEditingRecord(null)}
        record={editingRecord}
        onSave={handleSaveRecord}
        isLoading={isUpdating}
      /> */}
    </div>
  );
}