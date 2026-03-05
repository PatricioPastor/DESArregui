"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuthShellHeader } from "@/components/application/app-navigation/auth-shell-header/use-auth-shell-header";
import { ImportSimsButton } from "@/components/dashboard/import-sims-button";
import { SimsTable } from "@/components/dashboard/sims-table";
import { useSession } from "@/lib/auth-client";

export default function SimsPage() {
    const { data: session } = useSession();
    const { setHeader, resetHeader } = useAuthShellHeader();
    const [refreshVersion, setRefreshVersion] = useState(0);
    const isAdminUser = session?.user?.role === "admin";

    const headerActions = useMemo(() => {
        if (!isAdminUser) {
            return null;
        }

        return <ImportSimsButton onImportComplete={() => setRefreshVersion((current) => current + 1)} />;
    }, [isAdminUser]);

    useEffect(() => {
        setHeader({
            title: "Gestion de SIMs",
            subtitle: "Administracion de inventario y estado",
            actions: headerActions,
        });

        return () => {
            resetHeader();
        };
    }, [headerActions, resetHeader, setHeader]);

    return <SimsTable refreshVersion={refreshVersion} />;
}
