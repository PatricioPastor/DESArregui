"use client";

import { useState } from "react";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Truck01, CheckCircle, Edit01 } from "@untitledui/icons";
import { toast } from "sonner";

interface Assignment {
  id: string;
  shipping_voucher_id?: string | null;
  shipping_status?: string | null;
  expects_return?: boolean;
  return_status?: string | null;
}

interface ShippingActionsProps {
  assignment: Assignment | null | undefined;
  onEdit?: () => void;
  onSuccess?: () => void;
  size?: "xs" | "sm" | "md";
  variant?: "button" | "utility";
}

export function ShippingActions({
  assignment,
  onEdit,
  onSuccess,
  size = "xs",
  variant = "utility",
}: ShippingActionsProps) {
  const [isLoading, setIsLoading] = useState(false);

  if (!assignment?.shipping_voucher_id) {
    return null;
  }

  const shippingStatus = assignment.shipping_status;
  const isPending = !shippingStatus || shippingStatus === "pending";
  const isShipped = shippingStatus === "shipped";
  const isDelivered = shippingStatus === "delivered";

  const handleStartShipping = async () => {
    if (!assignment.id) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/assignments/${assignment.id}/shipping/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Error al iniciar el envío");
      }

      toast.success("Envío iniciado exitosamente");
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error desconocido");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeliverShipping = async () => {
    if (!assignment.id) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/assignments/${assignment.id}/shipping/deliver`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Error al finalizar el envío");
      }

      toast.success("Envío marcado como entregado");
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error desconocido");
    } finally {
      setIsLoading(false);
    }
  };

  // Caso 1: Pendiente de iniciar
  if (isPending) {
    if (variant === "button") {
      return (
        <Button
          size={size}
          color="primary"
          iconLeading={Truck01}
          onClick={handleStartShipping}
          disabled={isLoading}
          isLoading={isLoading}
        >
          Iniciar envío
        </Button>
      );
    }
    return (
      <ButtonUtility
        size={size}
        color="primary"
        tooltip="Iniciar envío"
        icon={Truck01}
        onClick={handleStartShipping}
        disabled={isLoading}
      />
    );
  }

  // Caso 2: Enviado - mostrar Finalizar y Editar
  if (isShipped) {
    return (
      <>
        {variant === "button" ? (
          <>
            <Button
              size={size}
              color="success"
              iconLeading={CheckCircle}
              onClick={handleDeliverShipping}
              disabled={isLoading}
              isLoading={isLoading}
            >
              Finalizar envío
            </Button>
            <Button
              size={size}
              color="secondary"
              iconLeading={Edit01}
              onClick={onEdit}
            >
              Editar envío
            </Button>
          </>
        ) : (
          <>
            <ButtonUtility
              size={size}
              color="success"
              tooltip="Finalizar envío"
              icon={CheckCircle}
              onClick={handleDeliverShipping}
              disabled={isLoading}
            />
            <ButtonUtility
              size={size}
              color="secondary"
              tooltip="Editar envío"
              icon={Edit01}
              onClick={onEdit}
            />
          </>
        )}
      </>
    );
  }

  // Caso 3: Entregado - solo Editar
  if (isDelivered) {
    if (variant === "button") {
      return (
        <Button
          size={size}
          color="secondary"
          iconLeading={Edit01}
          onClick={onEdit}
        >
          Editar envío
        </Button>
      );
    }
    return (
      <ButtonUtility
        size={size}
        color="secondary"
        tooltip="Editar envío"
        icon={Edit01}
        onClick={onEdit}
      />
    );
  }

  return null;
}

