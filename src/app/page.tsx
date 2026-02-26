
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from "@/components/logo";
import Link from 'next/link';
import { useAuth } from '@/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { Loader2, Rocket } from 'lucide-react';
import Image from 'next/image';
import { useSession } from "@/auth/SessionProvider";
import { getDefaultPath } from "@/auth/permissions";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  // --- Start of logic from AuthLayout ---
  const { user, role, isLoading: isSessionLoading } = useSession();
  const router = useRouter();

  useEffect(() => {
    // If the session is loaded and a user exists, redirect them to their default dashboard.
    if (!isSessionLoading && user) {
      const defaultPath = getDefaultPath(role);
      router.replace(defaultPath);
    }
  }, [isSessionLoading, user, role, router]);
  // --- End of logic from AuthLayout ---

  // --- Start of logic from original LoginPage ---
  const auth = useAuth();
  const { toast } = useToast();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) {
        toast({ variant: 'destructive', title: 'خطأ', description: 'خدمة المصادقة غير متاحة.' });
        return;
    };
    setIsLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // The SessionProvider will handle the redirect on auth state change.
      // The useEffect hook above will also catch this and redirect.
    } catch (err: any) {
      let errorMessage = 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        errorMessage = 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = 'تم حظر هذا الحساب مؤقتًا بسبب كثرة محاولات الدخول الفاشلة.';
      }
      setError(errorMessage);
      setIsLoading(false);
    }
  };
  // --- End of logic from original LoginPage ---

  // --- Start of loading/redirect guard from AuthLayout ---
  if (isSessionLoading || user) {
     return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Rocket className="h-5 w-5 animate-pulse text-primary" />
            <span>جاري التحميل...</span>
          </div>
      </div>
    );
  }
  // --- End of loading/redirect guard from AuthLayout ---

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center py-12">
        <Card className="mx-auto w-full max-w-sm">
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto">
                <Logo />
              </div>
              <CardTitle className="text-2xl">تسجيل الدخول</CardTitle>
              <CardDescription>
                أدخل بريدك الإلكتروني وكلمة المرور للوصول إلى حسابك
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignIn}>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">البريد الإلكتروني</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@example.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Label htmlFor="password">كلمة المرور</Label>
                      <Link href="/forgot-password" passHref legacyBehavior>
                        <a className="ms-auto inline-block text-sm underline">
                          نسيت كلمة المرور؟
                        </a>
                      </Link>
                    </div>
                    <Input 
                      id="password" 
                      type="password" 
                      required 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                    {isLoading ? 'جاري الدخول...' : 'تسجيل الدخول'}
                  </Button>
                </div>
              </form>
              <div className="mt-4 text-center text-sm">
                ليس لديك حساب؟{" "}
                <Link href="/register" passHref legacyBehavior>
                    <a className="underline">
                        إنشاء حساب
                    </a>
                </Link>
              </div>
            </CardContent>
        </Card>
      </div>
      <div className="hidden bg-muted lg:block relative">
        <Image
          src="https://picsum.photos/seed/authbg/1280/800"
          alt="Kemet Supply Platform"
          data-ai-hint="abstract tech"
          fill
          className="object-cover"
        />
         <div className="relative z-10 flex items-center justify-center h-full bg-black/50">
            <div className="text-center text-white p-8 rounded-lg max-w-md">
                <h2 className="text-4xl font-bold">بوابتك للنجاح في التجارة الإلكترونية</h2>
                <p className="mt-4 text-lg">
                    منصة واحدة لإدارة تجارتك. انضم إلى آلاف المسوقين بالعمولة والتجار الذين يحققون النجاح معنا. سهولة، سرعة، وأرباح مضمونة.
                </p>
            </div>
        </div>
      </div>
    </div>
  );
}
