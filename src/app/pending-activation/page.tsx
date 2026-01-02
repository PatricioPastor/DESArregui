"use client"

import { Button } from "@/components/base/buttons/button";
import { signOut } from "@/lib/auth-client";
import { AlertCircle } from "@untitledui/icons";
import { useRouter } from "next/navigation";



export default function PendingActivationPage() {

  const router = useRouter();


  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-1 px-4">
      <div className="max-w-md w-full bg-surface-3 caret-bg-brand-solid rounded-lg shadow-lg p-8">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="rounded-full bg-yellow-900/30 p-3">
            <AlertCircle className="h-12 w-12 text-yellow-600 dark:text-yellow-500" />
          </div>

          <h1 className="text-2xl font-bold text-white">
            Cuenta Pendiente de Activación
          </h1>

          <p className="text-gray-300">
            Tu cuenta ha sido creada exitosamente, pero aún no ha sido activada por un administrador.
          </p>

          <div className="sbg-blue-900/20 border border-blue-800 rounded-md p-4 mt-4">
            <p className="text-sm text-blue-300">
              Por favor, contactá a un administrador para solicitar la activación de tu cuenta.
              Una vez activada, podrás acceder al sistema sin problemas.
            </p>
          </div>

          <div className="pt-4">
            <Button
              onClick={() => signOut({
                fetchOptions:{
                  onSuccess:() => {
                    router.push('/login')
                  }
                }
              })}
              
            >
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
