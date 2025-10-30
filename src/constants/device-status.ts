export const DEVICE_STATUS_LABELS = {
  NEW: "Nuevo",
  ASSIGNED: "Asignado",
  USED: "Usado",
  REPAIRED: "Reparado",
  NOT_REPAIRED: "Sin reparacion",
  LOST: "Perdido",
} as const;

export const DEVICE_STATUS_OPTIONS = (Object.entries(DEVICE_STATUS_LABELS) as Array<
  [keyof typeof DEVICE_STATUS_LABELS, string]
>).map(([id, label]) => ({
  id,
  label,
}));

export type DeviceStatusOptionId = keyof typeof DEVICE_STATUS_LABELS;
