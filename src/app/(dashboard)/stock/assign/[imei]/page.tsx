import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeWithDot } from "@/components/base/badges/badges";
import { getDeviceDetailByImei } from "@/lib/stock-detail";
import { INVENTORY_STATUS_COLOR } from "@/lib/inventory-utils";
import { AssignPageClient } from "./assign-page.client";

type AssignPageParams = {
  imei: string;
};

export default async function AssignPage({
  params,
}: {
  params: Promise<AssignPageParams>;
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

  if (!canManuallyAssign) {
    // Redirigir a la página de detalle si no se puede asignar
    return notFound();
  }

  return (
    <section className="flex flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 border-b border-secondary pb-4">
        <div className="text-sm text-tertiary">
          <Link href="/stock" className="transition hover:text-primary">
            Inventario
          </Link>
          <span className="mx-2">/</span>
          <Link href={`/stock/${imei}`} className="transition hover:text-primary">
            IMEI {imei}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-secondary font-medium">Asignar</span>
        </div>

        <div className="flex flex-col gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-primary tracking-tight">
              Asignar Dispositivo
            </h1>
            <p className="text-sm text-secondary mt-1">
              {detail.inventory.modelo || "Dispositivo"} - IMEI{" "}
              <span className="font-mono">{detail.inventory.imei}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <BadgeWithDot type="modern" color={statusColor} size="lg">
              {statusLabel}
            </BadgeWithDot>
            {detail.inventory.model_details?.brand && (
              <span className="text-sm text-secondary">
                {detail.inventory.model_details.brand} - {detail.inventory.model_details.model}
              </span>
            )}
            {detail.inventory.model_details?.storage_gb && (
              <span className="text-sm text-secondary">{detail.inventory.model_details.storage_gb}GB</span>
            )}
          </div>
        </div>
      </header>

      <AssignPageClient
        deviceInfo={{
          id: detail.inventory.raw?.id || "",
          imei: detail.inventory.imei,
          modelo: detail.inventory.modelo || "",
          status: detail.inventory.status,
        }}
      />
    </section>
  );
}

