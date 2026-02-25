
'use client';

import { SidebarTrigger } from "@/components/ui/sidebar";
import { UserNav } from "./user-nav";

export function Header() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <SidebarTrigger />
      <div className="flex-1">
        {/* Can add breadcrumbs or page title here later */}
      </div>
      <UserNav />
    </header>
  );
}
