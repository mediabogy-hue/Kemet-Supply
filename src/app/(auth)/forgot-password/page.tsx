
'use client';

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronRight, Rocket } from "lucide-react";
import { useAuth } from "@/firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";

export default function ForgotPasswordPage() {
  const auth = useAuth();
  const { toast } = useToast();
  
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "الرجاء إدخال البريد الإلكتروني.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setIsSuccess(true);
      toast({
        title: "تم إرسال الرابط بنجاح!",
        description: "تفقد بريدك الإلكتروني لإعادة تعيين كلمة المرور.",
      });
    } catch (error: any) {
      console.error("Password reset error:", error);
      let description = "حدث خطأ غير متوقع. تأكد من أن البريد الإلكتروني صحيح.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-email') {
        description = "لم يتم العثور على حساب مرتبط بهذا البريد الإلكتروني.";
      }
      toast({
        variant: "destructive",
        title: "فشل إرسال الرابط",
        description,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <Card className="mx-auto max-w-sm">
          <CardHeader>
            <CardTitle className="text-2xl">تم إرسال الرابط بنجاح</CardTitle>
            <CardDescription>
              لقد أرسلنا رابطًا لإعادة تعيين كلمة المرور إلى بريدك الإلكتروني. الرجاء تفقد صندوق الوارد الخاص بك (والبريد المزعج).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/login" className="flex items-center justify-center gap-1 underline">
              <ChevronRight className="h-4 w-4" />
              العودة إلى صفحة تسجيل الدخول
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background">
      <Card className="mx-auto max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">نسيت كلمة المرور؟</CardTitle>
          <CardDescription>
            أدخل بريدك الإلكتروني أدناه لإعادة تعيين كلمة المرور الخاصة بك
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@kemetsupply.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'جاري الإرسال...' : 'إرسال رابط إعادة التعيين'}
              </Button>
            </div>
          </form>
          <div className="mt-4 text-center text-sm">
            <Link href="/login" className="flex items-center justify-center gap-1 underline">
              <ChevronRight className="h-4 w-4" />
              العودة إلى تسجيل الدخول
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
    