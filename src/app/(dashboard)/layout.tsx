"use client";


import { SidebarNavigationSimple } from "@/components/application/app-navigation/sidebar-navigation/sidebar-simple";
import { Header } from "@/components/application/navigation/main-nav";
import { useSession } from "@/lib/auth-client";
import { BarChart03, Home01, Package, Phone01 } from "@untitledui/icons";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Toaster } from "sonner";
import { useLocale } from 'react-aria-components';


const navigation = [
  { label: "Mesa de entrada", href: "/", icon: Home01, current: false },
  { label: "SOTI", href: "/soti", icon: Phone01, current: false },
  { label: "Inventario", href: "/stock", icon: Package, current: false },
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


    useEffect(() => {
      if (!isPending && !session?.user) {
        router.push('/login');
      }
    }, [session, isPending, router]);

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
