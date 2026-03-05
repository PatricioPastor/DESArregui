"use client";

import { useEffect } from "react";
import { useAuthShellHeader } from "@/components/application/app-navigation/auth-shell-header/use-auth-shell-header";

interface DeviceDetailShellHeaderBridgeProps {
    model: string;
    imei: string;
}

export function DeviceDetailShellHeaderBridge({ model, imei }: DeviceDetailShellHeaderBridgeProps) {
    const { setHeader, resetHeader } = useAuthShellHeader();

    useEffect(() => {
        setHeader({
            title: model || "Detalle de activo",
            subtitle: `IMEI ${imei}`,
        });

        return () => {
            resetHeader();
        };
    }, [imei, model, resetHeader, setHeader]);

    return null;
}
