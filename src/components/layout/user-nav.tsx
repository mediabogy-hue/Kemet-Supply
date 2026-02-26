'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/firebase";
import { signOut } from "firebase/auth";
import { useSession } from "@/auth/SessionProvider";
import { Skeleton } from "../ui/skeleton";
import { ShiftToggle } from "./shift-toggle";


export function UserNav() {
  const { profile, isLoading, isDropshipper } = useSession();
  const auth = useAuth();

  const handleSignOut = () => {
    if (!auth) return;
    // Calling signOut will trigger the onAuthStateChanged listener
    // in the SessionProvider. The layouts that consume useSession
    // will then automatically handle redirecting the user to the
    // login page. This avoids a race condition where we manually
    // push a route here while the layout is also trying to redirect.
    signOut(auth);
  }

  if (isLoading || !profile) {
    return <Skeleton className="h-8 w-8 rounded-full" />;
  }

  const userDisplayName = `${profile.firstName} ${profile.lastName}`.trim() || profile.email;
  const userInitials = `${profile.firstName?.[0] || ''}${profile.lastName?.[0] || ''}`.toUpperCase();


  return (
    <div className="flex items-center gap-4">
      {isDropshipper && profile.canTrackShift && <ShiftToggle />}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              {profile.photoURL && <AvatarImage src={profile.photoURL} alt={userDisplayName} />}
              <AvatarFallback>{userInitials || 'U'}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{userDisplayName}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {profile.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem asChild>
              <Link href="/profile">
                <UserIcon className="me-2 h-4 w-4" />
                <span>الملف الشخصي</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="me-2 h-4 w-4" />
              <span>تسجيل الخروج</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
