
'use client';
import { Sidebar } from "@/components/ui/sidebar";
import { Header } from "@/components/layout/header";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { RoleGuard } from "@/auth/RoleGuard";
import { Logo } from "@/components/logo";
import { SidebarContent, SidebarHeader } from "@/components/ui/sidebar";
import Link from "next/link";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  // The RoleGuard will now handle loading states and redirection for unauthorized access.
  return (
    <RoleGuard>
      <div className="flex h-screen">
        <Sidebar>
            <SidebarHeader>
                <Link href="/">
                  <Logo />
                </Link>
            </SidebarHeader>
            <SidebarContent>
                <SidebarNav />
            </SidebarContent>
        </Sidebar>
        <div className="flex flex-col flex-1 h-screen overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6 md:p-10">
            {children}
          </main>
        </div>
      </div>
    </RoleGuard>
  );
}
