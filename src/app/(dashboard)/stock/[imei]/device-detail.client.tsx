"use client";

import Link from "next/link";
import { Tabs } from "@/components/application/tabs/tabs";
import { Badge, BadgeWithDot } from "@/components/base/badges/badges";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icons";
import { Send01, UploadCloud02, User01, Building02, File01, Clock, Package } from "@untitledui/icons";
import { cx } from "@/utils/cx";
import type { DeviceDetail } from "@/lib/stock-detail";
import { formatInventoryDate } from "@/lib/inventory-utils";

interface DeviceDetailClientProps {
  detail: DeviceDetail;
  statusLabel: string;
  statusColor: "success" | "brand" | "warning" | "gray" | "error";
}

export function DeviceDetailClient({ detail, statusLabel, statusColor }: DeviceDetailClientProps) {
  const { inventory, assignments, tickets, soti_device: sotiDevice, purchase } = detail;
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
      id: "soti",
      label: "Ultima sincronizacion SOTI",
      value: formatInventoryDate(sotiDevice?.last_sync),
      icon: UploadCloud02,
      color: sotiDevice?.is_active ? "brand" : "gray",
      description: sotiDevice?.assigned_user ? `Usuario SOTI: ${sotiDevice.assigned_user}` : undefined,
    },
    {
      id: "actualizado",
      label: "Ultima actualizacion interna",
      value: formatInventoryDate(inventory.updated_at),
      icon: Clock,
      color: "gray",
    },
  ];

  return (
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

            <div className="rounded-lg border border-secondary bg-surface-1 p-4 shadow-xs">
              <h2 className="text-sm font-semibold text-secondary">Informacion SOTI</h2>
              {sotiDevice ? (
                <dl className="mt-4 space-y-3 text-sm text-tertiary">
                  <div className="flex gap-2">
                    <dt className="w-32 text-secondary">Nombre</dt>
                    <dd className="text-primary">{sotiDevice.device_name}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-32 text-secondary">Usuario</dt>
                    <dd>{sotiDevice.assigned_user || "Sin usuario"}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-32 text-secondary">Estado</dt>
                    <dd>{sotiDevice.status}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-32 text-secondary">Ruta</dt>
                    <dd>{sotiDevice.route || "-"}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-32 text-secondary">Ultima sync</dt>
                    <dd>{formatInventoryDate(sotiDevice.last_sync)}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-32 text-secondary">Ubicacion</dt>
                    <dd>{sotiDevice.location || "Sin datos"}</dd>
                  </div>
                </dl>
              ) : (
                <p className="mt-4 text-sm text-tertiary">
                  Este IMEI aun no se encuentra registrado en SOTI.
                </p>
              )}
            </div>
          </div>
        </Tabs.Panel>

        <Tabs.Panel id="assignments" className="outline-none">
          <div className="rounded-lg border border-secondary bg-surface-1">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-secondary text-sm">
                <thead className="bg-surface-2">
                  <tr className="text-left text-xs uppercase tracking-wide text-tertiary">
                    <th className="px-4 py-3 font-medium">Fecha</th>
                    <th className="px-4 py-3 font-medium">Tipo</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 font-medium">Asignatario</th>
                    <th className="px-4 py-3 font-medium">Distribuidora</th>
                    <th className="px-4 py-3 font-medium">Vale</th>
                    <th className="px-4 py-3 font-medium">Ticket</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary text-tertiary">
                  {assignments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-sm text-secondary">
                        No hay asignaciones registradas para este dispositivo.
                      </td>
                    </tr>
                  ) : (
                    assignments.map((assignment) => (
                      <tr key={assignment.id}>
                        <td className="px-4 py-3 text-primary">{formatInventoryDate(assignment.at)}</td>
                        <td className="px-4 py-3">{assignment.type}</td>
                        <td className="px-4 py-3 capitalize">{assignment.status || "Sin estado"}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <span className="text-primary font-medium">
                              {assignment.assignee_name || "Sin asignar"}
                            </span>
                            {assignment.assignee_phone && (
                              <span className="text-xs text-tertiary">{assignment.assignee_phone}</span>
                            )}
                            {assignment.delivery_location && (
                              <span className="text-xs text-tertiary">{assignment.delivery_location}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">{assignment.distributor?.name || "-"}</td>
                        <td className="px-4 py-3">{assignment.shipping_voucher_id || "-"}</td>
                        <td className="px-4 py-3">{assignment.ticket_id || "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
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
  );
}
