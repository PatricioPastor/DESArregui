"use client";

import { SimsTable } from "@/components/dashboard/sims-table";
import { useSession } from "@/lib/auth-client";
import { canAccessSims, getUnauthorizedMessage } from "@/utils/user-roles";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

// ============================================
// Access Denied Component (Single Responsibility)
// ============================================

const AccessDeniedScreen = ({ email }: { email?: string }) => {
  const message = getUnauthorizedMessage(email, '/sims');

  return (
    <div className="w-full min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-md px-4">
        <div className="mb-4">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold text-gray-200 mb-2">
          Acceso Restringido
        </h2>
        <p className="text-gray-400 mb-6">{message}</p>
        <p className="text-sm text-gray-500">
          Si crees que deberías tener acceso a esta página, contacta al administrador del sistema.
        </p>
      </div>
    </div>
  );
};

// ============================================
// Loading Component (Single Responsibility)
// ============================================

const LoadingScreen = () => (
  <div className="w-full min-h-[60vh] flex items-center justify-center">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand mb-3" />
      <p className="text-gray-400">Cargando...</p>
    </div>
  </div>
);

// ============================================
// Main SIMs Page Component
// ============================================

export default function SimsPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  // Verify access on mount and session change
  useEffect(() => {
    // Early return: Wait for session to load
    if (isPending) return;

    // Early return: No session, redirect to login
    if (!session?.user) {
      router.replace('/login');
      return;
    }

    const userEmail = session.user.email;

    // Early return: No email, redirect to login
    if (!userEmail) {
      router.replace('/login');
      return;
    }

    // Check if user has access to SIMs
    if (!canAccessSims(userEmail)) {
      // User doesn't have access, redirect to login
      router.replace('/login');
      return;
    }
  }, [session, isPending, router]);

  // Show loading while verifying access
  if (isPending) {
    return <LoadingScreen />;
  }

  // Show access denied if no session
  if (!session?.user?.email) {
    return <AccessDeniedScreen />;
  }

  // Verify access one more time before rendering
  if (!canAccessSims(session.user.email)) {
    return <AccessDeniedScreen email={session.user.email} />;
  }

  // User has access, render the SIMs table
  return <SimsTable />;
}
