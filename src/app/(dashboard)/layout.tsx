"use client";


import { SidebarNavigationSimple } from "@/components/application/app-navigation/sidebar-navigation/sidebar-simple";
import { Header } from "@/components/application/navigation/main-nav";
import { BarChart03, Home01, Package } from "@untitledui/icons";


const navigation = [
  { label: "SOTI", href: "/", icon: Home01, current: false },
  { label: "Stock", href: "/stock", icon: Package, current: false },
  { label: "Reportes", href: "/reportes/phones", icon: BarChart03, current: false },
];


export default function layout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="relative min-h-dvh w-full">
            {/* <Header /> */}
            
            <SidebarNavigationSimple items={navigation} />

            <main className="px-6 py-6 max-h-screen max-w-7xl mx-auto pt-24 pl-[312px]">
                {/* <div className="mx-auto w-full max-w-6xl overflow-hidden rounded-3xl border border-white/10 bg-black/30 backdrop-blur-sm"> */}
                {children}
                {/* </div> */}
            </main>
        </div>
    );
}
