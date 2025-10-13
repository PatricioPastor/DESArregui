import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { RouteProvider } from "@/providers/router-provider";
import { Theme } from "@/providers/theme";
import { Header } from "@/components/application/navigation/main-nav";
import "@/styles/globals.css";
import { Toaster } from "sonner";
import { cx } from "@/utils/cx";
import '@/utils/chart-setup';

const inter = Inter({
    subsets: ["latin"],
    display: "swap",
    variable: "--font-inter",
});

export const metadata: Metadata = {
    title: "DESArregui",
    description: "Dashboard centralizado para gestión de dispositivos IMEI y soporte móvil nivel 2",
    icons: {
        icon: '/favicon-desa.png',
        shortcut: '/favicon-desa.png',
        apple: '/favicon-desa.png',
    },
};

export const viewport: Viewport = {
    themeColor: "#7f56d9",
    colorScheme: "light dark",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="es" suppressHydrationWarning>
            <body className={cx(inter.variable, "bg-[#0a0a0a] antialiased min-h-screen")}>
                <Toaster richColors theme="dark" position="top-right"
                
                expand={true}
                closeButton/>
                <RouteProvider>
                    <Theme>
                        
                            {children}
                        
                    </Theme>
                </RouteProvider>
            </body>
        </html>
    );
}
