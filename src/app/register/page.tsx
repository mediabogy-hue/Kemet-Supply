
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/logo';
import { useAuth, useFirestore } from '@/firebase';
import { useState, useEffect } from 'react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { doc, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { MerchantInquiryDialog } from './_components/merchant-inquiry-dialog';
import Image from 'next/image';
import { useSession } from '@/auth/SessionProvider';
import { useRouter } from 'next/navigation';
import { getDefaultPath } from '@/auth/permissions';
import { Rocket } from 'lucide-react';

export default function RegisterPage() {
  const { user, role, isLoading: isSessionLoading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isSessionLoading && user) {
      const defaultPath = getDefaultPath(role);
      router.replace(defaultPath);
    }
  }, [isSessionLoading, user, role, router]);

  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      const newUser = userCredential.user;

      await updateProfile(newUser, {
        displayName: `${firstName} ${lastName}`,
      });
      
      const batch = writeBatch(firestore);
      const userDocRef = doc(firestore, 'users', newUser.uid);
      const walletDocRef = doc(firestore, 'wallets', newUser.uid);
      
      const newUserProfile: Omit<UserProfile, 'createdAt' | 'updatedAt'> = {
        id: newUser.uid,
        email: newUser.email!,
        role: 'Dropshipper',
        firstName: firstName,
        lastName: lastName,
        phone: phone,
        isActive: true,
        initialPasswordChangeRequired: false,
        level: 'Beginner Marketer',
        shiftStatus: 'off',
        canTrackShift: false
      };

      batch.set(userDocRef, {
        ...newUserProfile,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      batch.set(walletDocRef, {
        id: newUser.uid,
        availableBalance: 0,
        pendingBalance: 0,
        pendingWithdrawals: 0,
        totalWithdrawn: 0,
        updatedAt: serverTimestamp(),
      });

      await batch.commit();
      
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
     <div className="flex h-screen w-full items-center justify-center bg-background">
         <div className="flex items-center gap-2 text-muted-foreground">
           <Rocket className="h-5 w-5 animate-pulse text-primary" />
           <span>جاري التحميل...</span>
         </div>
     </div>
   );
 }

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
       <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="mx-auto grid w-full max-w-lg gap-8">
            <Card>
              <CardHeader className="text-center space-y-4">
                <Link href="/" className="mx-auto">
                  <Logo />
                </Link>
                <CardTitle className="text-2xl">إنشاء حساب مسوق جديد</CardTitle>
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
            
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">هل أنت تاجر أو مورد؟</CardTitle>
                <CardDescription>
                  هل تملك منتجات وترغب في عرضها على منصتنا ليصل إليها آلاف المسوقين؟ تواصل معنا.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                  <MerchantInquiryDialog />
              </CardContent>
            </Card>
        </div>
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
