"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home01, Package, Moon01, Sun, BarChart03 } from "@untitledui/icons";
import { useTheme } from "next-themes";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { cx } from "@/utils/cx";

const navigation = [
  { name: "Dispositivos IMEI", href: "/", icon: Home01, current: false },
  { name: "Stock", href: "/stock", icon: Package, current: false },
  { name: "Reportes", href: "/reportes", icon: BarChart03, current: false },
];

export function MainNavigation() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  return (
    <nav className="bg-primary shadow-sm border-b border-secondary ">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <h1 className="text-xl font-semibold text-primary">DESArregui</h1>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navigation.map((item) => {
                const isCurrentPage = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cx(
                      isCurrentPage
                        ? "border-brand-500 text-primary"
                        : "border-transparent text-secondary hover:border-tertiary hover:text-primary",
                      "inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors"
                    )}
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
          
          {/* Theme Toggle */}
          <div className="flex items-center">
            <ButtonUtility
              size="sm"
              color="tertiary"
              icon={theme === 'dark' ? Sun : Moon01}
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              tooltip={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
            />
          </div>
        </div>
      </div>

      {/* Mobile navigation */}
      <div className="sm:hidden">
        <div className="pt-2 pb-3 space-y-1">
          {navigation.map((item) => {
            const isCurrentPage = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cx(
                  isCurrentPage
                    ? "bg-brand-50 border-brand-500 text-brand-700"
                    : "border-transparent text-secondary hover:bg-secondary hover:border-tertiary hover:text-primary",
                  "block pl-3 pr-4 py-2 border-l-4 text-base font-medium transition-colors"
                )}
              >
                <div className="flex items-center">
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}