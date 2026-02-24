'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Loader2, ShieldAlert } from 'lucide-react';
import { useSession } from '@/auth/SessionProvider';
import { hasPermission, getDefaultPath } from '@/auth/permissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useEffect } from 'react';

const FullPageLoader = ({ message }: { message: string }) => (
  <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-foreground">
    <div className="flex flex-col items-center gap-4 text-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-lg font-semibold">{message}</p>
    </div>
  </div>
);

const AuthErrorState = ({ error }: { error: string }) => {
    const auth = useAuth();
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background p-4">
             <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>خطأ في الحساب</CardTitle>
                </CardHeader>
                <CardContent>
                    <Alert variant="destructive">
                        <ShieldAlert className="h-4 w-4" />
                        <AlertTitle>فشل تحميل بيانات الجلسة!</AlertTitle>
                        <AlertDescription>
                            {error}.
                             الرجاء تسجيل الخروج والمحاولة مرة أخرى. إذا استمرت المشكلة، تواصل مع الدعم.
                        </AlertDescription>
                    </Alert>
                    {auth && <Button variant="outline" className="mt-4 w-full" onClick={() => signOut(auth)}>تسجيل الخروج</Button>}
                </CardContent>
            </Card>
        </div>
    )
};


export function RoleGuard({ children }: { children: React.ReactNode }) {
  const { user, role, isLoading, error } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  const publicPaths = ['/', '/register', '/forgot-password'];
  const isPublicPath = publicPaths.includes(pathname) || pathname.startsWith('/product');

  useEffect(() => {
    if (isLoading) {
      return; // Wait until loading is complete
    }

    // If there's no user and we're not on a public path, redirect to login
    if (!user && !isPublicPath) {
      router.replace('/');
      return;
    }

    // If there is a user on a public-only path, redirect to their dashboard
    if (user && role && isPublicPath && !pathname.startsWith('/product')) {
      const defaultPath = getDefaultPath(role);
      router.replace(defaultPath);
      return;
    }

    // If user has a role but no permission for the current path, redirect
    if (user && role && !hasPermission(role, pathname)) {
        const defaultPath = getDefaultPath(role);
        router.replace(defaultPath);
        return;
    }

  }, [isLoading, user, role, pathname, router, isPublicPath]);

  // Handle loading state
  if (isLoading) {
    return <FullPageLoader message="جاري التحقق من الصلاحيات..." />;
  }
  
  // Handle session error state
  if (error) {
    return <AuthErrorState error={error} />;
  }

  // Handle redirection states (show loader while redirecting)
  if (!user && !isPublicPath) {
     return <FullPageLoader message="جاري التوجيه لتسجيل الدخول..." />;
  }
  if (user && role && isPublicPath && !pathname.startsWith('/product')) {
     return <FullPageLoader message="جاري التوجيه للوحة التحكم..." />;
  }
   if (user && role && !hasPermission(role, pathname)) {
     return <FullPageLoader message="غير مصرح بالدخول، جاري التوجيه..." />;
  }

  // If all checks pass, render the children
  return <>{children}</>;
}
