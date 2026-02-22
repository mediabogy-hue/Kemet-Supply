
'use client';

import { SidebarTrigger } from "@/components/ui/sidebar";
import { UserNav } from "./user-nav";
import { useSession } from "@/auth/SessionProvider";
import { ShiftToggle } from "./shift-toggle";
import { NotificationsDropdown } from "./notifications-dropdown";

export function Header() {
  const { profile, isStaff, isDropshipper, isLoading } = useSession();
  const canTrackShift = isStaff || (isDropshipper && profile?.canTrackShift);

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center gap-4 border-b bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60 no-print">
      <SidebarTrigger />
      
      <div className="relative flex-1">
        {/* Search input can be re-enabled if needed */}
      </div>
      
      <div className="flex items-center gap-2">
        {canTrackShift && !isLoading && <ShiftToggle />}
        
        <NotificationsDropdown />

        <UserNav />
      </div>
    </header>
  );
}
