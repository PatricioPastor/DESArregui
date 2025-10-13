"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home01, Package, Moon01, Sun, BarChart03, Phone01 } from "@untitledui/icons";
import { useTheme } from "next-themes";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { cx } from "@/utils/cx";
import { useMemo } from "react";
import { isAdmin } from "@/utils/user-roles";

const allNavigation = [
  { name: "Mesa de entrada", href: "/", icon: Home01, current: false },
  { name: "SOTI", href: "/soti", icon: Phone01, current: false },
  { name: "Stock", href: "/stock", icon: Package, current: false },
  { name: "Reportes", href: "/reports/phones", icon: BarChart03, current: false },
];

const viewerNavigation = [
  { name: "Reportes", href: "/reports/phones", icon: BarChart03, current: false },
];

// export function MainNavigation() {
//   const pathname = usePathname();
//   const { theme, setTheme } = useTheme();

//   return (
//     <nav className="bg-primary shadow-sm border-b border-secondary ">
//       <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
//         <div className="flex justify-between h-16">
//           <div className="flex">
//             <div className="flex-shrink-0 flex items-center">
//               <h1 className="text-xl font-semibold text-primary">DESArregui</h1>
//             </div>
//             <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
//               {navigation.map((item) => {
//                 const isCurrentPage = pathname === item.href;
//                 return (
//                   <Link
//                     key={item.name}
//                     href={item.href}
//                     className={cx(
//                       isCurrentPage
//                         ? "border-brand-500 text-primary"
//                         : "border-transparent text-secondary hover:border-tertiary hover:text-primary",
//                       "inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors"
//                     )}
//                   >
//                     <item.icon className="mr-2 h-4 w-4" />
//                     {item.name}
//                   </Link>
//                 );
//               })}
//             </div>
//           </div>
          
//           {/* Theme Toggle */}
//           <div className="flex items-center">
//             <ButtonUtility
//               size="sm"
//               color="tertiary"
//               icon={theme === 'dark' ? Sun : Moon01}
//               onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
//               tooltip={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
//             />
//           </div>
//         </div>
//       </div>

//       {/* Mobile navigation */}
//       <div className="sm:hidden">
//         <div className="pt-2 pb-3 space-y-1">
//           {navigation.map((item) => {
//             const isCurrentPage = pathname === item.href;
//             return (
//               <Link
//                 key={item.name}
//                 href={item.href}
//                 className={cx(
//                   isCurrentPage
//                     ? "bg-brand-50 border-brand-500 text-brand-700"
//                     : "border-transparent text-secondary hover:bg-secondary hover:border-tertiary hover:text-primary",
//                   "block pl-3 pr-4 py-2 border-l-4 text-base font-medium transition-colors"
//                 )}
//               >
//                 <div className="flex items-center">
//                   <item.icon className="mr-3 h-5 w-5" />
//                   {item.name}
//                 </div>
//               </Link>
//             );
//           })}
//         </div>
//       </div>
//     </nav>
//   );
// }


import { Avatar } from "@/components/base/avatar/avatar"
import { AvatarLabelGroup } from "@/components/base/avatar/avatar-label-group"
import { Button } from "@/components/base/buttons/button"

import Image from "next/image"

import { Container, HelpCircle, LayersTwo01, LogOut01, Settings01, User01 } from "@untitledui/icons";
import { Button as AriaButton } from "react-aria-components";

import { Dropdown } from "@/components/base/dropdown/dropdown"
import { useRouter } from "next/navigation"
import { signOut, useSession } from "@/lib/auth-client";

export function Header() {

  const {data, isPending} = useSession()
  const pathname = usePathname();
  const router = useRouter()

  // Determine navigation items based on user role
  const navigation = useMemo(() => {
    if (!data?.user?.email) return viewerNavigation;
    return isAdmin(data.user.email) ? allNavigation : viewerNavigation;
  }, [data?.user?.email]);

  const onSignOut = () => {
    signOut({
        fetchOptions:{
            onSuccess: () => {
                router.push('login')
            }
        }
    })
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="flex items-center justify-between px-6 py-4 backdrop-blur-xl bg-app/50">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="desarregui.svg"
              alt="Crop Studio"
              width={140}
              height={60}
              className="text-gray-100"
            />
            {/* <span className="font-medium text-white">GOREC</span> */}
          </Link>
        </div>
        <nav className="hidden md:flex items-center gap-8">
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
                      "inline-flex items-center px-1 p-2 border-b-2 text-sm font-medium transition-colors"
                    )}
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.name}
                  </Link>
                );
              })}
        </nav>

       


    <Dropdown.Root>
        <AriaButton
            className={({ isPressed, isFocusVisible }) =>
                cx("group relative inline-flex cursor-pointer rounded-full outline-focus-ring", (isPressed || isFocusVisible) && "outline-2 outline-offset-2")
            }
        >
            <Avatar alt={data?.user.name} src={data?.user.image} size="xs" />
        </AriaButton>

        <Dropdown.Popover>
            <div className="flex gap-3 border-b border-secondary p-3">
                <AvatarLabelGroup
                    size="md"
                    src={data?.user.image}
                    status="online"
                    title={data?.user.name}
                    subtitle={data?.user.email}
                />
            </div>
            <Dropdown.Menu>
                <Dropdown.Section>
                    <Dropdown.Item addon="⌘K->P" icon={User01}>
                        Mi perfíl
                    </Dropdown.Item>
                    <Dropdown.Item addon="⌘S" icon={Settings01}>
                        Ajustes
                    </Dropdown.Item>
                </Dropdown.Section>
                <Dropdown.Separator />
                <Dropdown.Section>
                    <Dropdown.Item icon={LayersTwo01}>Changelog</Dropdown.Item>
                    <Dropdown.Item icon={HelpCircle}>Support</Dropdown.Item>
                    <Dropdown.Item icon={Container}>API</Dropdown.Item>
                </Dropdown.Section>
                <Dropdown.Separator />
                <Dropdown.Section>
                    <Dropdown.Item onClick={onSignOut} addon="⌥⇧Q" icon={LogOut01}>
                        Cerrar sesión
                    </Dropdown.Item>
                </Dropdown.Section>
            </Dropdown.Menu>
        </Dropdown.Popover>
    </Dropdown.Root>
      </div>
    </header>
  )
}
