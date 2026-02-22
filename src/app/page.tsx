
"use client";

import { useState, useEffect } from "react";
import Link from 'next/link';
import { useRouter } from "next/navigation";
import { useAuth } from "@/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/logo";
import { useSession } from "@/auth/SessionProvider";
import { getDefaultPath } from "@/auth/permissions";

export default function Page() {
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const { user, role, isLoading: isSessionLoading } = useSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If session is loaded and user exists, redirect them away from the login page.
    if (!isSessionLoading && user) {
      const defaultPath = getDefaultPath(role);
      router.replace(defaultPath);
    }
  }, [isSessionLoading, user, role, router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!auth) {
        toast({ variant: 'destructive', title: 'خطأ', description: 'خدمات المصادقة غير متاحة.' });
        return;
    }
    if (!email || !password) {
      setError("الرجاء إدخال البريد الإلكتروني وكلمة المرور.");
      return;
    }

    setIsSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({ title: "تم تسجيل الدخول بنجاح" });
      // The useEffect hook will now handle the redirection once the session state updates.
    } catch (err: any) {
      let msg = "حدث خطأ غير متوقع. الرجاء المحاولة مرة أخرى.";
      if (err.code === "auth/wrong-password" || err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found') {
        msg = "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
      }
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  // While session is loading or if a user is found (and redirect is imminent), show a loading screen.
  if (isSessionLoading || user) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-muted-foreground">
          <svg
            className="h-5 w-5 animate-spin text-primary"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <span>جاري التحميل...</span>
        </div>
      </div>
    );
  }

  // Render login form only if not loading and no user.
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center space-y-4">
          <Logo className="mx-auto" />
          <CardTitle>تسجيل الدخول</CardTitle>
          <CardDescription>أدخل بيانات حسابك للمتابعة.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">كلمة المرور</Label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-muted-foreground underline hover:text-primary"
                >
                  نسيت كلمة المرور؟
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                disabled={isSubmitting}
              />
            </div>

            {error && (
              <div className="text-sm font-medium text-destructive">{error}</div>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "جاري الدخول..." : "تسجيل الدخول"}
            </Button>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/register">إنشاء حساب جديد</Link>
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
