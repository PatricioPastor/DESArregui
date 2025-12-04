"use client";

import { SidebarNavigationSimple } from "@/components/application/app-navigation/sidebar-navigation/sidebar-simple";
import { useSession, signOut } from "@/lib/auth-client";
import { BarChart03, Home01, Package, Phone01, Signal01 } from "@untitledui/icons";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { toast, Toaster } from "sonner";
import {
  canAccessRoute,
  filterNavigationByRole,
  getUnauthorizedMessage,
  getUserRole,
  type NavigationItem,
} from "@/utils/user-roles";
import { validateEmailDomain, getDomainValidationError } from "@/lib/auth";

// ============================================
// Configuration (Single Responsibility)
// ============================================

const ALL_NAVIGATION_ITEMS: NavigationItem[] = [
  { label: "Mesa de entrada", href: "/", icon: Home01, current: false },
  { label: "SOTI", href: "/soti", icon: Phone01, current: false },
  { label: "Inventario", href: "/stock", icon: Package, current: false },
  { label: "SIMS", href: "/sims", icon: Signal01, current: false },
  { label: "Reportes", href: "/reports/phones", icon: BarChart03, current: false },
];

// ============================================
// Authentication Utilities (Single Responsibility)
// ============================================

/**
 * Handles unauthorized domain access
 */
const handleUnauthorizedDomain = (
  email: string,
  router: ReturnType<typeof useRouter>
): void => {
  const errorMessage = getDomainValidationError(email);

  toast.error('Dominio no permitido', {
    description: errorMessage,
  });

  signOut();
  router.replace('/login');
};

/**
 * Handles unauthorized route access
 */
const handleUnauthorizedRoute = (
  email: string,
  pathname: string,
  router: ReturnType<typeof useRouter>
): void => {
  const errorMessage = getUnauthorizedMessage(email, pathname);

  toast.error('Acceso denegado', {
    description: errorMessage,
  });

  // Redirect based on user role
  const role = getUserRole(email);

  if (role === 'sims-viewer') {
    router.replace('/sims');
  } else {
    router.replace('/reports/phones');
  }
};

// ============================================
// Loading Component (Single Responsibility)
// ============================================

const AuthLoadingScreen = () => (
  <div className="w-full min-h-dvh flex items-center justify-center bg-[#0a0a0a]">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand mb-3" />
      <p className="text-gray-400">Verificando autenticación...</p>
    </div>
  </div>
);

// ============================================
// Main Layout Component
// ============================================

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: Readonly<DashboardLayoutProps>) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending } = useSession();

  // Filter navigation items based on user role (memoized for performance)
  const filteredNavigation = useMemo(() => {
    const userEmail = session?.user?.email;
    return filterNavigationByRole(ALL_NAVIGATION_ITEMS, userEmail);
  }, [session?.user?.email]);

  // Handle authentication and authorization
  useEffect(() => {
    // Early return: Wait until session check is complete
    if (isPending) return;

    // Early return: No session, redirect to login
    if (!session?.user) {
      router.replace('/login');
      return;
    }

    const userEmail = session.user.email;

    // Early return: Invalid email
    if (!userEmail) {
      router.replace('/login');
      return;
    }

    // Validate domain (optional, can be enabled if needed)
    // if (!validateEmailDomain(userEmail)) {
    //   handleUnauthorizedDomain(userEmail, router);
    //   return;
    // }

    // Check route access
    if (!canAccessRoute(userEmail, pathname)) {
      handleUnauthorizedRoute(userEmail, pathname, router);
      return;
    }
  }, [session, isPending, pathname, router]);

  // Show loading screen while checking authentication
  if (isPending) {
    return <AuthLoadingScreen />;
  }

  // Early return: No session (will be handled by useEffect)
  if (!session?.user) {
    return null;
  }

  return (
    <div className="relative min-h-dvh w-full">
      <SidebarNavigationSimple items={filteredNavigation} activeUrl={pathname} />

      <main className="w-full max-h-screen px-4 py-6 sm:px-6 max-w-[1366px] lg:max-w-9xl mx-auto lg:pl-[312px]">
        {children}
      </main>

      <Toaster />
    </div>
  );
}
