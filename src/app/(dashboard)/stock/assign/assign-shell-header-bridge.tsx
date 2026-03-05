"use client";

import { useEffect } from "react";
import { useAuthShellHeader } from "@/components/application/app-navigation/auth-shell-header/use-auth-shell-header";

interface AssignShellHeaderBridgeProps {
    model: string;
    imei: string;
}

export function AssignShellHeaderBridge({ model, imei }: AssignShellHeaderBridgeProps) {
    const { setHeader, resetHeader } = useAuthShellHeader();

    useEffect(() => {
        setHeader({
            title: "Asignacion",
            subtitle: `${model} - ${imei}`,
        });

        return () => {
            resetHeader();
        };
    }, [imei, model, resetHeader, setHeader]);

    return null;
}
