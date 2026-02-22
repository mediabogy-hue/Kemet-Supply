
'use client';
import {
  Sidebar,
  SidebarProvider,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Logo } from "@/components/logo";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Header } from "@/components/layout/header";
import { useUser, useFirestore, errorEmitter, FirestorePermissionError } from "@/firebase";
import { useEffect } from "react";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { RoleGuard } from "@/auth/RoleGuard";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useUser();
  const firestore = useFirestore();

  // This effect handles updating the user's 'lastSeen' status.
  useEffect(() => {
    if (!firestore || !user) return;

    const userStatusRef = doc(firestore, 'users', user.uid);
    
    const updateLastSeen = () => {
        updateDoc(userStatusRef, { lastSeen: serverTimestamp() }).catch(err => {
             errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: userStatusRef.path,
                operation: 'update',
                requestResourceData: { lastSeen: 'serverTimestamp' }
            }));
        });
    }

    updateLastSeen(); // Initial update on load
    const intervalId = setInterval(updateLastSeen, 5 * 60 * 1000); // Update every 5 minutes
    window.addEventListener('focus', updateLastSeen);

    return () => {
        clearInterval(intervalId);
        window.removeEventListener('focus', updateLastSeen);
    };
  }, [firestore, user]);

  return (
    <SidebarProvider defaultOpen={true}>
      <div className={cn(
        "flex min-h-screen bg-gradient-to-br from-background to-background/80"
      )}>
        <Sidebar side="right" collapsible="icon" className="border-s bg-sidebar text-sidebar-foreground no-print">
            <SidebarHeader>
                <Logo />
            </SidebarHeader>
            <SidebarContent className="p-2">
                <SidebarNav />
            </SidebarContent>
            <SidebarFooter>
                {/* Footer content if any */}
            </SidebarFooter>
        </Sidebar>
        <main className="flex flex-1 flex-col">
          <Header />
          <div className="flex-1 p-6 sm:p-8 lg:p-10">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
