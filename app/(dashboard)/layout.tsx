"use client";

import { AppSidebar } from "@/components/layout/AppSidebar";
import {
  SidebarProvider,
  SidebarInset,
} from "@/components/ui/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Public access - no auth check required
  // Admin actions are protected at the component and API level

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-background focus:border focus:border-border focus:rounded-md focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring"
        >
          Skip to main content
        </a>
        <main id="main-content" className="flex flex-1 flex-col gap-4 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
