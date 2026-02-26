
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/logo';
import { useAuth, useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { Rocket } from 'lucide-react';
import { useSession } from '@/auth/SessionProvider';
import { getDefaultPath } from '@/auth/permissions';

export default function RegisterPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, role, isLoading: isSessionLoading } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isSessionLoading && user) {
      const defaultPath = getDefaultPath(role);
      router.replace(defaultPath);
    }
  }, [isSessionLoading, user, role, router]);

  const handleRegister = async () => {
    if (!auth || !firestore) {
      toast({ variant: 'destructive', title: 'خطأ', description: 'خدمات Firebase غير متاحة.' });
      return;
    }
    if (password !== confirmPassword) {
      toast({ variant: 'destructive', title: 'خطأ', description: 'كلمتا المرور غير متطابقتين.' });
      return;
    }
    if (!firstName || !lastName || !phone) {
      toast({ variant: 'destructive', title: 'خطأ', description: 'الرجاء إدخال جميع البيانات المطلوبة.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await updateProfile(user, {
        displayName: `${firstName} ${lastName}`,
      });
      
      const userDocRef = doc(firestore, 'users', user.uid);
      const newUserProfile: Omit<UserProfile, 'createdAt' | 'updatedAt'> = {
        id: user.uid,
        email: user.email!,
        role: 'Dropshipper',
        firstName: firstName,
        lastName: lastName,
        phone: phone,
        isActive: true,
        initialPasswordChangeRequired: true,
      };

      await setDoc(userDocRef, {
        ...newUserProfile,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      toast({
        title: 'تم إنشاء الحساب بنجاح!',
        description: 'مرحباً بك. سيتم توجيهك الآن.',
      });
      // The SessionProvider will automatically redirect the user to their dashboard.

    } catch (error: any) {
      console.error('Registration Error:', error);
      let description = 'حدث خطأ غير متوقع. الرجاء المحاولة مرة أخرى.';

      if (error.code === 'auth/email-already-in-use') {
        description = 'هذا البريد الإلكتروني مستخدم بالفعل.';
      } else if (error.code === 'auth/weak-password') {
        description = 'كلمة المرور ضعيفة جدا. يجب أن تكون 6 أحرف على الأقل.';
      }
      
      toast({
        variant: 'destructive',
        title: 'فشل إنشاء الحساب',
        description: description,
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isSessionLoading || user) {
      return (
        <div className="flex min-h-screen w-full items-center justify-center bg-background">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Rocket className="h-5 w-5 animate-pulse" />
            <span>جاري التحميل...</span>
          </div>
        </div>
      );
  }

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center space-y-4">
          <Logo />
          <CardTitle className="text-3xl">إنشاء حساب جديد</CardTitle>
          <CardDescription>
            خطوتك الأولى نحو النجاح في التجارة الإلكترونية تبدأ من هنا.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first-name">الاسم الأول</Label>
                <Input
                  id="first-name"
                  placeholder="علي"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last-name">الاسم الأخير</Label>
                <Input
                  id="last-name"
                  placeholder="محمد"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">رقم الهاتف</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="01xxxxxxxxx"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">تأكيد كلمة المرور</Label>
              <Input
                id="confirm-password"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <Button
              onClick={handleRegister}
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'جاري الإنشاء...' : 'إنشاء الحساب'}
            </Button>
          </div>
          <div className="mt-4 text-center text-sm">
            لديك حساب بالفعل؟{' '}
            <Link href="/" className="underline">
              تسجيل الدخول
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
