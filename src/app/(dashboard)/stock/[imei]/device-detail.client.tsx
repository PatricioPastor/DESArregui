"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Tabs } from "@/components/application/tabs/tabs";
import { Badge, BadgeWithDot } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icons";
import { Send01, User01, Building02, File01, Clock, Package, UserPlus01, Trash01, CheckCircle, Eye, PackageCheck, RefreshCw01 } from "@untitledui/icons";
import { cx } from "@/utils/cx";
import type { DeviceDetail } from "@/lib/stock-detail";
import { formatInventoryDate } from "@/lib/inventory-utils";
import { DeleteDeviceModal } from "@/features/stock/components/delete";
import { CloseAssignmentModal } from "@/features/stock/components/close-assignment";
import { EditShippingModal } from "@/features/stock/components/edit-shipping";
import { ViewAssignmentModal } from "@/features/stock/components/view-assignment";
import { ShippingActions } from "@/components/shipping/shipping-actions";

interface DeviceDetailClientProps {
  detail: DeviceDetail;
  statusLabel: string;
  statusColor: "success" | "brand" | "warning" | "gray" | "error";
  canManuallyAssign: boolean;
  canDelete: boolean;
}

export function DeviceDetailClient({ detail, statusLabel, statusColor, canManuallyAssign, canDelete }: DeviceDetailClientProps) {
  const router = useRouter();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isCloseAssignmentModalOpen, setIsCloseAssignmentModalOpen] = useState(false);
  const [isUpdateShippingModalOpen, setIsUpdateShippingModalOpen] = useState(false);
  const [isViewAssignmentModalOpen, setIsViewAssignmentModalOpen] = useState(false);
  const [selectedAssignmentForView, setSelectedAssignmentForView] = useState<{
    id: string;
    assignment_id: string;
  } | null>(null);
  const [selectedAssignmentForClose, setSelectedAssignmentForClose] = useState<{
    id: string;
    assignee_name: string;
    at: string;
  } | null>(null);
  const [selectedAssignmentForShipping, setSelectedAssignmentForShipping] = useState<{
    id: string;
    assignee_name: string;
    shipping_voucher_id: string | null;
    shipping_status: string | null;
    shipped_at?: string | null;
    delivered_at?: string | null;
    expects_return?: boolean;
    return_status?: string | null;
    return_device_imei?: string | null;
  } | null>(null);
  const { inventory, assignments, tickets, purchase } = detail;
  const currentAssignment =
    assignments.find((assignment) => (assignment.status || "").toLowerCase() === "active") ||
    assignments[0] ||
    null;

  const metrics = [
    {
      id: "estado",
      label: "Estado actual",
      value: statusLabel,
      icon: Package,
      color: statusColor,
    },
    {
      id: "asignacion",
      label: "Asignado a",
      value: currentAssignment?.assignee_name || "Sin asignar",
      icon: User01,
      color: currentAssignment ? "brand" : "gray",
      description: currentAssignment ? `Desde ${formatInventoryDate(currentAssignment.at)}` : undefined,
    },
    {
      id: "distribuidora",
      label: "Distribuidora",
      value: inventory.distribuidora || "Sin distribuidora",
      icon: Building02,
      color: inventory.distribuidora ? "brand" : "gray",
    },
    {
      id: "vale",
      label: "Vale de envio",
      value: currentAssignment?.shipping_voucher_id || "Sin generar",
      icon: Send01,
      color: currentAssignment?.shipping_voucher_id ? "brand" : "gray",
    },
    {
      id: "actualizado",
      label: "Ultima actualizacion interna",
      value: formatInventoryDate(inventory.updated_at),
      icon: Clock,
      color: "gray",
    },
  ];

  const handleDeleteSuccess = () => {
    router.push('/stock');
  };

  const handleCloseAssignmentSuccess = () => {
    setSelectedAssignmentForClose(null);
    router.refresh();
  };

  const handleOpenCloseAssignmentModal = (assignment: { id: string; assignee_name: string; at: string }) => {
    setSelectedAssignmentForClose(assignment);
    setIsCloseAssignmentModalOpen(true);
  };

  const handleUpdateShippingSuccess = () => {
    setSelectedAssignmentForShipping(null);
    router.refresh();
  };

  const handleOpenUpdateShippingModal = (assignment: {
    id: string;
    assignee_name: string;
    shipping_voucher_id: string | null;
    shipping_status: string | null;
    shipped_at?: string | null;
    delivered_at?: string | null;
    expects_return?: boolean;
    return_status?: string | null;
    return_device_imei?: string | null;
  }) => {
    // Buscar la asignación completa en la lista
    const fullAssignmentData = assignments.find(a => a.id === assignment.id);
    
    const fullAssignment = {
      id: assignment.id,
      assignee_name: assignment.assignee_name,
      shipping_voucher_id: assignment.shipping_voucher_id,
      shipping_status: assignment.shipping_status || fullAssignmentData?.shipping_status || null,
      shipped_at: assignment.shipped_at || fullAssignmentData?.shipped_at || null,
      delivered_at: assignment.delivered_at || fullAssignmentData?.delivered_at || null,
      expects_return: assignment.expects_return ?? fullAssignmentData?.expects_return ?? false,
      return_status: assignment.return_status || fullAssignmentData?.return_status || null,
      return_device_imei: assignment.return_device_imei || fullAssignmentData?.return_device_imei || null,
    };
    
    setSelectedAssignmentForShipping(fullAssignment);
    setIsUpdateShippingModalOpen(true);
  };

  const assignmentInfo = currentAssignment ? {
    id: currentAssignment.id,
    assignee_name: currentAssignment.assignee_name || "Sin nombre",
    at: currentAssignment.at,
  } : null;

  const deviceInfo = {
    id: inventory.raw?.id || "",
    imei: inventory.imei,
    modelo: inventory.modelo || "",
    status: inventory.status,
  };

  // Helper function to get shipping status label
  const getShippingStatusLabel = (shippingStatus: string | null | undefined) => {
    if (!shippingStatus) return { label: "Sin iniciar", color: "gray" as const };
    switch (shippingStatus.toLowerCase()) {
      case "pending":
        return { label: "Sin iniciar", color: "gray" as const };
      case "shipped":
        return { label: "En curso", color: "blue-light" as const };
      case "delivered":
        return { label: "Finalizado", color: "success" as const };
      default:
        return { label: "Sin iniciar", color: "gray" as const };
    }
  };

  // Helper function to get assignment type label
  const getAssignmentTypeLabel = (type: string | null | undefined) => {
    if (!type) return "Asignación";
    switch (type.toLowerCase()) {
      case "replacement":
        return "Reemplazo";
      case "new":
      default:
        return "Asignación";
    }
  };

  return (
    <>
      <div className="flex flex-col gap-6">
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <div
            key={metric.id}
            className="flex flex-col gap-3 rounded-lg border border-surface bg-surface-1 p-4 shadow-xs"
          >
            <div className="flex items-start gap-3">
              <FeaturedIcon size="md" color="brand" theme="modern-neue" icon={metric.icon} />
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-wide text-tertiary">
                  {metric.label}
                </span>
                <span
                  className={cx(
                    "text-lg font-semibold text-primary",
                    metric.color === "gray" && "text-secondary",
                  )}
                >
                  {metric.value}
                </span>
                {metric.description ? (
                  <span className="text-xs text-tertiary">{metric.description}</span>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </section>

      <Tabs defaultSelectedKey="overview" className="flex flex-col gap-4">
        <Tabs.List
          type="button-minimal"
          items={[
            { id: "overview", label: "Resumen" },
            { id: "assignments", label: "Asignaciones", badge: assignments.length },
            { id: "tickets", label: "Tickets", badge: tickets.length },
          ]}
        >
          {(tab) => <Tabs.Item key={tab.id} {...tab} />}
        </Tabs.List>

        <Tabs.Panel id="overview" className="outline-none">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-secondary bg-surface-1 p-4 shadow-xs">
              <h2 className="text-sm font-semibold text-secondary">Informacion del dispositivo</h2>
              <dl className="mt-4 space-y-3 text-sm text-tertiary">
                <div className="flex gap-2">
                  <dt className="w-32 text-secondary">IMEI</dt>
                  <dd className="font-mono text-primary">{inventory.imei}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-32 text-secondary">Distribuidora</dt>
                  <dd>{inventory.distribuidora || "Sin distribuidora"}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-32 text-secondary">Creado</dt>
                  <dd>{formatInventoryDate(inventory.created_at)}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-32 text-secondary">Ultima asignacion</dt>
                  <dd>{formatInventoryDate(inventory.last_assignment_at)}</dd>
                </div>
                {purchase ? (
                  <div className="flex gap-2">
                    <dt className="w-32 text-secondary">Compra</dt>
                    <dd>
                      <div className="flex flex-col">
                        <span>Factura: {purchase.invoice_number || "N/A"}</span>
                        <span>Fecha: {formatInventoryDate(purchase.purchased_at, false)}</span>
                        <span>Proveedor: {purchase.distributor?.name || "Sin datos"}</span>
                      </div>
                    </dd>
                  </div>
                ) : null}
              </dl>
            </div>

          </div>
        </Tabs.Panel>

        <Tabs.Panel id="assignments" className="outline-none">
          {assignments.length === 0 ? (
            <div className="rounded-lg border border-secondary bg-surface-1 p-8 text-center">
              <p className="text-sm text-secondary">
                No hay asignaciones registradas para este dispositivo.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {assignments.map((assignment) => {
                const shippingStatus = getShippingStatusLabel(assignment.shipping_status);
                const assignmentType = getAssignmentTypeLabel(assignment.type);
                const isActive = (assignment.status || "").toLowerCase() === "active";
                
                return (
                  <div
                    key={assignment.id}
                    className="rounded-lg border border-surface bg-surface-1 p-4 hover:border-secondary transition-colors"
                  >
                    <div className="flex flex-col gap-4">
                      {/* Header: Fecha y Estado */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-primary">
                              {formatInventoryDate(assignment.at)}
                            </span>
                            {isActive && (
                              <Badge size="sm" color="brand" className="mt-1 w-fit">
                                Activa
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          color="secondary"
                          size="sm"
                          iconLeading={Eye}
                          onClick={() => {
                            setSelectedAssignmentForView({
                              id: assignment.id,
                              assignment_id: assignment.id,
                            });
                            setIsViewAssignmentModalOpen(true);
                          }}
                        >
                          Ver detalles
                        </Button>
                      </div>

                      {/* Información principal en grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Tipo y Devolución */}
                        <div className="space-y-2">
                          <div className="text-xs font-medium text-secondary uppercase tracking-wide">
                            Tipo
                          </div>
                          <div className="flex flex-col gap-2">
                            <Badge 
                              size="sm" 
                              color={assignmentType === "Reemplazo" ? "warning" : "brand"}
                            >
                              {assignmentType === "Reemplazo" && (
                                <RefreshCw01 className="h-3 w-3 mr-1" />
                              )}
                              {assignmentType === "Asignación" && (
                                <PackageCheck className="h-3 w-3 mr-1" />
                              )}
                              {assignmentType}
                            </Badge>
                            {assignment.expects_return && (
                              <Badge size="sm" color="warning">
                                Espera devolución
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Estado de envío */}
                        <div className="space-y-2">
                          <div className="text-xs font-medium text-secondary uppercase tracking-wide">
                            Estado de envío
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <BadgeWithDot type="modern" color={shippingStatus.color} size="sm">
                              {shippingStatus.label}
                            </BadgeWithDot>
                            {assignment.shipping_voucher_id && (
                              <span className="text-xs font-mono text-secondary">
                                {assignment.shipping_voucher_id}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Asignatario */}
                        <div className="space-y-2">
                          <div className="text-xs font-medium text-secondary uppercase tracking-wide">
                            Asignatario
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium text-primary">
                              {assignment.assignee_name || "Sin asignar"}
                            </span>
                            {assignment.assignee_phone && (
                              <span className="text-xs text-tertiary">{assignment.assignee_phone}</span>
                            )}
                            {assignment.delivery_location && (
                              <span className="text-xs text-tertiary line-clamp-2">
                                {assignment.delivery_location}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Vale */}
                        <div className="space-y-2">
                          <div className="text-xs font-medium text-secondary uppercase tracking-wide">
                            Vale de envío
                          </div>
                          <div>
                            {assignment.shipping_voucher_id ? (
                              <span className="text-xs font-mono text-primary font-medium">
                                {assignment.shipping_voucher_id}
                              </span>
                            ) : (
                              <span className="text-xs text-tertiary">Sin vale</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Tabs.Panel>

        <Tabs.Panel id="tickets" className="outline-none">
          <div className="rounded-lg border border-secondary bg-surface-1">
            {tickets.length === 0 ? (
              <p className="px-4 py-6 text-sm text-secondary text-center">
                Este dispositivo aun no tiene tickets asociados.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-secondary text-sm">
                  <thead className="bg-surface-2">
                    <tr className="text-left text-xs uppercase tracking-wide text-tertiary">
                      <th className="px-4 py-3 font-medium">Ticket</th>
                      <th className="px-4 py-3 font-medium">Estado</th>
                      <th className="px-4 py-3 font-medium">Etiqueta</th>
                      <th className="px-4 py-3 font-medium">Empresa</th>
                      <th className="px-4 py-3 font-medium">Creado</th>
                      <th className="px-4 py-3 font-medium">Actualizado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-secondary text-tertiary">
                    {tickets.map((ticket) => (
                      <tr key={ticket.id}>
                        <td className="px-4 py-3 text-primary font-medium">
                          <Link
                            href={`https://desasa.atlassian.net/browse/${ticket.key}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-brand-primary transition hover:underline"
                          >
                            <File01 className="h-4 w-4" />
                            {ticket.key}
                          </Link>
                        </td>
                        <td className="px-4 py-3">{ticket.status}</td>
                        <td className="px-4 py-3">{ticket.label}</td>
                        <td className="px-4 py-3">{ticket.enterprise}</td>
                        <td className="px-4 py-3">{formatInventoryDate(ticket.created)}</td>
                        <td className="px-4 py-3">{formatInventoryDate(ticket.updated)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Tabs.Panel>
      </Tabs>
    </div>

      {/* Modal de visualización de asignación */}
      {selectedAssignmentForView && (
        <ViewAssignmentModal
          open={isViewAssignmentModalOpen}
          onOpenChange={(open: boolean) => {
            setIsViewAssignmentModalOpen(open);
            if (!open) {
              setSelectedAssignmentForView(null);
            }
          }}
          deviceId={null}
          imei={inventory.imei}
          deviceInfo={{
            device_name: inventory.modelo,
            imei: inventory.imei,
            model: inventory.modelo,
          }}
          assignmentId={selectedAssignmentForView.assignment_id}
          onEditShipping={() => {
            const assignment = assignments.find(a => a.id === selectedAssignmentForView.assignment_id);
            if (assignment) {
              handleOpenUpdateShippingModal({
                id: assignment.id,
                assignee_name: assignment.assignee_name || "Sin nombre",
                shipping_voucher_id: assignment.shipping_voucher_id || null,
                shipping_status: assignment.shipping_status || null,
                shipped_at: assignment.shipped_at || null,
                delivered_at: assignment.delivered_at || null,
                expects_return: assignment.expects_return,
                return_status: assignment.return_status || null,
                return_device_imei: assignment.return_device_imei || null,
              });
            }
          }}
        />
      )}

      {/* Modal de cierre de asignación */}
      {(selectedAssignmentForClose || assignmentInfo) && (
        <CloseAssignmentModal
          open={isCloseAssignmentModalOpen}
          onOpenChange={setIsCloseAssignmentModalOpen}
          assignmentInfo={selectedAssignmentForClose || assignmentInfo!}
          onSuccess={handleCloseAssignmentSuccess}
        />
      )}

      {/* Modal de actualización de envío */}
      {selectedAssignmentForShipping && (
        <EditShippingModal
          open={isUpdateShippingModalOpen}
          onOpenChange={setIsUpdateShippingModalOpen}
          assignmentInfo={selectedAssignmentForShipping}
          onSuccess={handleUpdateShippingSuccess}
        />
      )}

      {/* Modal de eliminación */}
      <DeleteDeviceModal
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        deviceInfo={deviceInfo}
        onSuccess={handleDeleteSuccess}
      />
    </>
  );
}
