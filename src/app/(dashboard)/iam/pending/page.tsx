"use client";

import { Clock } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { signOut } from "@/lib/auth-client";

export default function IAMPendingPage() {
    return (
        <div className="flex min-h-[70vh] items-center justify-center px-4">
            <div className="w-full max-w-lg rounded-2xl border border-secondary bg-surface-1 p-6 shadow-xs">
                <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2">
                        <Clock className="h-5 w-5 text-secondary" />
                    </div>

                    <div className="flex-1">
                        <h1 className="text-lg font-semibold text-primary">Cuenta pendiente de habilitación</h1>
                        <p className="mt-1 text-sm text-tertiary">
                            Tu usuario todavía no tiene permisos asignados para visualizar módulos. Un administrador debe asignarte al menos un rol.
                        </p>

                        <div className="mt-5 flex justify-end">
                            <Button color="secondary" size="md" onClick={() => signOut()}>
                                Cerrar sesión
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
