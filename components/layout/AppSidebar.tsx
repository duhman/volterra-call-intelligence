"use client";

import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarPinTrigger,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  Phone,
  LayoutDashboard,
  Settings,
  LogOut,
  LogIn,
  ScrollText,
  Shield,
} from "lucide-react";
import Link from "next/link";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/calls", label: "Calls", icon: Phone },
  { href: "/logs", label: "Logs", icon: ScrollText },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isHydrated, logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.push("/dashboard");
  };

  const handleLogin = () => {
    // Pass current path as redirect destination
    const redirectTo = encodeURIComponent(pathname || "/dashboard");
    router.push(`/login?redirectTo=${redirectTo}`);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarPinTrigger />
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:px-0">
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-[#00D084]/10 p-1.5 flex-shrink-0 group-data-[collapsible=icon]:mx-auto">
            <Image
              src="/volterra-logo-symbol-green.svg"
              alt="Volterra"
              width={24}
              height={24}
              className="w-full h-full"
            />
          </div>
          <div className="flex flex-col truncate group-data-[collapsible=icon]:hidden">
            <span className="font-semibold truncate text-[15px]">
              Volterra Call Intelligence
            </span>
            {isHydrated && isAuthenticated && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Shield className="size-3" />
                Admin
              </span>
            )}
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname?.startsWith(item.href + "/"));

            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  tooltip={item.label}
                  isActive={isActive}
                >
                  <Link href={item.href}>
                    <Icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            {/* Only render auth buttons after hydration to avoid mismatch */}
            {isHydrated &&
              (isAuthenticated ? (
                <SidebarMenuButton
                  onClick={handleLogout}
                  tooltip="Logout"
                  data-testid="logout-button"
                >
                  <LogOut />
                  <span>Logout</span>
                </SidebarMenuButton>
              ) : (
                <SidebarMenuButton
                  onClick={handleLogin}
                  tooltip="Admin Login"
                  data-testid="login-button"
                >
                  <LogIn />
                  <span>Admin Login</span>
                </SidebarMenuButton>
              ))}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
