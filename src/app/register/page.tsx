
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
import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { doc, serverTimestamp, setDoc, collection, query, where, getDocs, writeBatch, limit, increment } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { Rocket } from 'lucide-react';
import { MerchantInquiryDialog } from './_components/merchant-inquiry-dialog';
import { useSession } from '@/auth/SessionProvider';
import { getDefaultPath } from '@/auth/permissions';


export default function RegisterPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, role, isLoading: isSessionLoading } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const registerFormRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [referrerId, setReferrerId] = useState<string | null>(null);

  useEffect(() => {
    // If session is loaded and user exists, redirect them away from the register page.
    if (!isSessionLoading && user) {
      const defaultPath = getDefaultPath(role);
      router.replace(defaultPath);
    }
  }, [isSessionLoading, user, role, router]);

  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode && firestore) {
        const usersRef = collection(firestore, 'users');
        const q = query(usersRef, where("referralCode", "==", refCode), limit(1));
        getDocs(q).then(querySnapshot => {
            if (!querySnapshot.empty) {
                const referrer = querySnapshot.docs[0].data() as UserProfile;
                setReferrerId(querySnapshot.docs[0].id);
                toast({ 
                    title: 'أهلاً بك!', 
                    description: `لقد تمت دعوتك من قبل المسوق ${referrer.firstName}. أكمل التسجيل لبدء رحلتك.` 
                });
            }
        });
    }
  }, [searchParams, firestore, toast]);

  const handleRegister = async () => {
    if (!auth || !firestore) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'خدمات Firebase غير متاحة حالياً.',
      });
      return;
    }
    if (password !== confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'كلمتا المرور غير متطابقتين.',
      });
      return;
    }
    if (!firstName || !lastName || !phone) {
      toast({
        variant: 'destructive',
        title: 'خطأ',
        description: 'الرجاء إدخال جميع البيانات المطلوبة.',
      });
      return;
    }

    setIsSubmitting(true);
    let newUserUid: string | null = null;

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;
      newUserUid = newUser.uid;

      await updateProfile(newUser, {
        displayName: `${firstName} ${lastName}`,
      });

      const batch = writeBatch(firestore);
      const userDocRef = doc(firestore, 'users', newUser.uid);

      const userProfileData: Partial<UserProfile> = {
        id: newUser.uid,
        email: newUser.email!,
        firstName: firstName,
        lastName: lastName,
        phone: phone,
        photoURL: '',
        role: 'Dropshipper',
        isActive: true,
        initialPasswordChangeRequired: false,
        level: 'Beginner Marketer',
        referralCode: newUser.uid.substring(0, 8),
        referredUsersCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (referrerId) {
        userProfileData.referrerId = referrerId;
        const referrerDocRef = doc(firestore, 'users', referrerId);
        batch.update(referrerDocRef, {
            referredUsersCount: increment(1),
        });
      }
      
      batch.set(userDocRef, userProfileData);

      await batch.commit();

      toast({
        title: 'تم إنشاء الحساب بنجاح!',
        description: 'مرحباً بك في فريقنا. سيتم توجيهك الآن.',
      });
      // The useEffect will handle redirection after session state update.
    } catch (error: any) {
      console.error('Registration Error:', error);
      let description = 'حدث خطأ غير متوقع. الرجاء المحاولة مرة أخرى.';

      if (error.code === 'auth/email-already-in-use') {
        description = 'هذا البريد الإلكتروني مستخدم بالفعل.';
      } else if (error.code === 'auth/weak-password') {
        description = 'كلمة المرور ضعيفة جدا. يجب أن تكون 6 أحرف على الأقل.';
      } else if (newUserUid) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: `users/${newUserUid}`,
          operation: 'create',
          requestResourceData: { email, role: 'Dropshipper' },
        }));
        description =
          'فشل حفظ بيانات الملف الشخصي. قد تكون هناك مشكلة في الصلاحيات.';
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

  const scrollToRegister = () => {
    registerFormRef.current?.scrollIntoView({ behavior: 'smooth' });
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
    <div className="flex min-h-screen w-full flex-col bg-background">
      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center text-center min-h-screen p-8 bg-background overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern z-0"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background z-1"></div>
        <div className="z-10 flex flex-col items-center">
            <Logo />
            <h1 className="mt-8 text-4xl md:text-6xl font-bold tracking-tight bg-gradient-to-br from-primary to-amber-300 bg-clip-text text-transparent drop-shadow-sm">
            بوابتك للنجاح في التجارة الإلكترونية
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-foreground/80">
            انضم إلى KEMET SUPPLY، المنصة الرائدة للتسويق بالعمولة في مصر. نوفر لك منتجات رابحة، دعمًا متكاملاً، وأدوات قوية لتحقيق أعلى الأرباح بأقل مجهود.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Button size="lg" onClick={scrollToRegister} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    <Rocket className="me-2" />
                    املأ النموذج أدناه للبدء
                </Button>
                <Button size="lg" variant="outline" asChild>
                    <Link href="/">تسجيل الدخول</Link>
                </Button>
            </div>
        </div>
      </section>
      
      {/* Registration Form Section */}
      <section ref={registerFormRef} className="py-16 md:py-24 bg-card">
        <div className="container mx-auto px-6 flex justify-center">
          <Card className="w-full max-w-lg">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl">انضم كمسوق بالعمولة</CardTitle>
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
      </section>

      {/* Footer */}
      <footer className="bg-background border-t">
          <div className="container mx-auto px-6 py-6 text-center text-muted-foreground">
             <p>&copy; 2026 KEMET MARKETING SOLUTION. جميع الحقوق محفوظة.</p>
          </div>
      </footer>
    </div>
  );
}

    