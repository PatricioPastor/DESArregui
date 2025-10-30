export const INVENTORY_STATUS_COLOR: Record<string, "success" | "brand" | "warning" | "gray" | "error"> = {
  Nuevo: "success",
  Asignado: "brand",
  Usado: "gray",
  Reparado: "success",
  "Sin Reparación": "warning",
  Perdido: "error",
};

export const formatInventoryDate = (value?: string | null, withTime: boolean = true) => {
  if (!value) return "-";
  try {
    const date = new Date(value);
    return date.toLocaleString("es-AR", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: withTime ? "2-digit" : undefined,
      minute: withTime ? "2-digit" : undefined,
    });
  } catch {
    return value;
  }
};
