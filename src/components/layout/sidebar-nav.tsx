
'use client';

import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import { useSession } from "@/auth/SessionProvider";
import { navLinks } from "@/auth/nav";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function SidebarNav() {
  const { role } = useSession();
  const pathname = usePathname();

  if (!role) {
    return null;
  }
  
  const accessibleLinks = navLinks.filter(link => {
    return link.roles.some(r => r === role) || role === 'Admin'
  });

  return (
    <SidebarMenu>
        {accessibleLinks.map((link) => (
          <SidebarMenuItem key={link.href}>
             <Link href={link.href} passHref legacyBehavior>
                <SidebarMenuButton tooltip={link.label} isActive={pathname.startsWith(link.href)}>
                  {link.icon}
                  <span className="truncate">{link.label}</span>
                </SidebarMenuButton>
             </Link>
          </SidebarMenuItem>
        ))}
    </SidebarMenu>
  );
}
