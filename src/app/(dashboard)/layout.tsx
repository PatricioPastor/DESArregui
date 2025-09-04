"use client";

import { Header } from "@/components/application/navigation/main-nav";

export default function layout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="relative min-h-dvh w-full">
            <Header />
            <main className="px-6 py-6 max-h-screen max-w-7xl mx-auto pt-24">
                {/* <div className="mx-auto w-full max-w-6xl overflow-hidden rounded-3xl border border-white/10 bg-black/30 backdrop-blur-sm"> */}
                {children}
                {/* </div> */}
            </main>
        </div>
    );
}
