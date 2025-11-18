import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, BadgeWithDot } from "@/components/base/badges/badges";
import { getDeviceDetailByImei } from "@/lib/stock-detail";
import { DeviceDetailClient } from "./device-detail.client";
import { HeaderActions } from "./header-actions.client";
import { INVENTORY_STATUS_COLOR } from "@/lib/inventory-utils";

type DeviceDetailPageParams = {
  imei: string;
};

export default async function DeviceDetailPage({
  params,
}: {
  params: Promise<DeviceDetailPageParams>;
}) {
  const { imei: rawImei } = await params;
  const imei = rawImei?.trim();

  if (!imei) {
    notFound();
  }

  const detail = await getDeviceDetailByImei(imei);

  if (!detail) {
    notFound();
  }

  const statusLabel = detail.inventory.status_label;
  const statusColor = INVENTORY_STATUS_COLOR[statusLabel] ?? "brand";

  // Determinar si se puede asignar manualmente
  const currentAssignment = detail.assignments.find(
    (assignment) => (assignment.status || "").toLowerCase() === "active"
  ) || null;

  const isDeleted = (detail.inventory.raw as any)?.is_deleted ?? false;

  const canManuallyAssign =
    !isDeleted &&
    detail.inventory.status !== "ASSIGNED" &&
    !currentAssignment &&
    !detail.soti_device?.is_active;

  const canDelete =
    !isDeleted &&
    !currentAssignment;

  return (
    <section className="flex flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 border-b border-secondary pb-4">
        <div className="text-sm text-tertiary">
          <Link href="/stock" className="transition hover:text-primary">
            Inventario
          </Link>
          <span className="mx-2">/</span>
          <span className="text-secondary font-medium">IMEI {detail.inventory.imei}</span>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-primary tracking-tight">{detail.inventory.modelo}</h1>
            </div>
            <p className="text-sm text-tertiary">
              IMEI <span className="font-mono text-secondary">{detail.inventory.imei}</span>
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <BadgeWithDot type="modern" color={statusColor} size="lg">
                {statusLabel}
              </BadgeWithDot>
              {detail.inventory.model_details?.brand && (
                <Badge size="sm" color="gray">
                  {detail.inventory.model_details.brand} - {detail.inventory.model_details.model}
                </Badge>
              )}
              {detail.inventory.model_details?.storage_gb ? (
                <Badge size="sm" color="gray">
                  {detail.inventory.model_details.storage_gb}GB
                </Badge>
              ) : null}
              {detail.inventory.model_details?.color ? (
                <Badge size="sm" color="gray">
                  {detail.inventory.model_details.color}
                </Badge>
              ) : null}
            </div>
          </div>
          <HeaderActions
            canManuallyAssign={canManuallyAssign}
            canDelete={canDelete}
            hasActiveAssignment={!!currentAssignment}
            assignmentId={currentAssignment?.id}
            assignmentAssigneeName={currentAssignment?.assignee_name || undefined}
            assignmentAt={currentAssignment?.at}
            deviceImei={detail.inventory.imei}
            deviceInfo={{
              id: detail.inventory.raw?.id || "",
              imei: detail.inventory.imei,
              modelo: detail.inventory.modelo || "",
              status: detail.inventory.status,
            }}
          />
        </div>
      </header>

      <DeviceDetailClient
        detail={detail}
        statusLabel={statusLabel}
        statusColor={statusColor}
        canManuallyAssign={canManuallyAssign}
        canDelete={canDelete}
      />
    </section>
  );
}
