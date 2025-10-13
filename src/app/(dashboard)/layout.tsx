"use client";


import { SidebarNavigationSimple } from "@/components/application/app-navigation/sidebar-navigation/sidebar-simple";
import { Header } from "@/components/application/navigation/main-nav";
import { useSession, signOut } from "@/lib/auth-client";
import { BarChart03, Home01, Package, Phone01 } from "@untitledui/icons";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { toast, Toaster } from "sonner";
import { useLocale } from 'react-aria-components';
import { isAdmin } from "@/utils/user-roles";


const allNavigation = [
  { label: "Mesa de entrada", href: "/", icon: Home01, current: false },
  { label: "SOTI", href: "/soti", icon: Phone01, current: false },
  { label: "Inventario", href: "/stock", icon: Package, current: false },
  { label: "Reportes", href: "/reports/phones", icon: BarChart03, current: false },
];

const viewerNavigation = [
  { label: "Reportes", href: "/reports/phones", icon: BarChart03, current: false },
];


export default function layout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {

    const pathname = usePathname()
    const router = useRouter();
    const { data: session, isPending } = useSession();

    // Determine navigation items based on user role
    const navigation = useMemo(() => {
      if (!session?.user?.email) return viewerNavigation;
      return isAdmin(session.user.email) ? allNavigation : viewerNavigation;
    }, [session?.user?.email]);

    // Handle authentication and route protection
    useEffect(() => {
      // Wait until session check is complete
      if (isPending) return;

      // If no user session, redirect to login
      if (!session?.user) {
        router.replace('/login');
        return;
      }

      // Check if email domain is allowed
      const userEmail = session.user.email;
      if (userEmail && !userEmail.endsWith('@desasa.com.ar')) {
        toast.error('Dominio no permitido', {
          description: 'Solo se permiten usuarios con dominio @desasa.com.ar'
        });
        signOut();
        router.replace('/login');
        return;
      }

      // If user is not admin, restrict access to admin-only routes
      if (!isAdmin(session.user.email)) {
        const restrictedRoutes = ['/', '/soti', '/stock'];
        const isRestrictedRoute = restrictedRoutes.some(route =>
          pathname === route || pathname.startsWith(route + '/')
        );

        if (isRestrictedRoute) {
          router.replace('/reports/phones');
        }
      }
    }, [session, isPending, pathname, router]);

    // Show loading while checking auth
    if (isPending) {
      return (
        <div className="w-full min-h-dvh flex items-center justify-center bg-[#0a0a0a]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand mb-3"></div>
            <p className="text-gray-400">Verificando autenticación...</p>
          </div>
        </div>
      );
    }

    return (
        <div className="relative min-h-dvh w-full">
            {/* <Header /> */}

            <SidebarNavigationSimple items={navigation} activeUrl={pathname} />

            <main className="px-6 py-6 max-h-screen max-w-[1366px] lg:max-w-9xl mx-auto  pl-[312px]">
                {/* <div className="mx-auto w-full max-w-6xl overflow-hidden rounded-3xl border border-white/10 bg-black/30 backdrop-blur-sm"> */}
                {children}
                {/* </div> */}
            </main>

        </div>
    );
}
