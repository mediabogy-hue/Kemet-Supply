
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getNavLinks } from "@/auth/nav";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSkeleton
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useSession } from "@/auth/SessionProvider";

export function SidebarNav() {
  const pathname = usePathname();
  const { isAdmin, isOrdersManager, isFinanceManager, isProductManager, isLoading } = useSession();
  const navLinks = getNavLinks({ isAdmin, isOrdersManager, isFinanceManager, isProductManager });

  if (isLoading) {
      return (
          <SidebarMenu>
              {Array.from({ length: 8 }).map((_, i) => (
                  <SidebarMenuSkeleton key={i} showIcon />
              ))}
          </SidebarMenu>
      )
  }

  return (
    <SidebarMenu>
      {navLinks.map((link) => (
        <SidebarMenuItem key={link.href}>
          <Link href={link.href}>
            <SidebarMenuButton
              isActive={pathname.startsWith(link.href)}
              tooltip={link.label}
              className={cn(pathname.startsWith(link.href) && "bg-sidebar-accent text-sidebar-accent-foreground")}
            >
              {link.icon}
              <span className="truncate">{link.label}</span>
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
