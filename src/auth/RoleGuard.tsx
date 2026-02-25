
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

const AuthErrorState = ({ error }: { error: string }) => {
    const auth = useAuth();
    return (
        <div className="flex h-full w-full items-center justify-center p-4">
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
      return; 
    }

    if (!user && !isPublicPath) {
      router.replace('/');
      return;
    }

    if (user && role && isPublicPath && !pathname.startsWith('/product')) {
      const defaultPath = getDefaultPath(role);
      router.replace(defaultPath);
      return;
    }

    if (user && role && !hasPermission(role, pathname)) {
        const defaultPath = getDefaultPath(role);
        router.replace(defaultPath);
        return;
    }

  }, [isLoading, user, role, pathname, router, isPublicPath]);

  if (isLoading) {
    return null;
  }
  
  if (error) {
    return <AuthErrorState error={error} />;
  }

  if (!user && !isPublicPath) {
     return null;
  }
  if (user && role && isPublicPath && !pathname.startsWith('/product')) {
     return null;
  }
   if (user && role && !hasPermission(role, pathname)) {
     return null;
  }

  return <>{children}</>;
}
