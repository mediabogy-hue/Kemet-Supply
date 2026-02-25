
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


const AnkhIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="60" height="108" viewBox="0 0 60 108" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M30 38.625V108" stroke="currentColor" strokeWidth="6"/>
      <path d="M0 54H60" stroke="currentColor" strokeWidth="6"/>
      <circle cx="30" cy="19.5" r="15.5" stroke="currentColor" strokeWidth="6"/>
  </svg>
);

const PyramidIcon = ({ className }: { className?: string }) => (
    <svg className={className} width="120" height="80" viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M60 0L0 80H120L60 0Z" stroke="currentColor" strokeWidth="4" />
        <path d="M60 0V80" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3"/>
    </svg>
);

const EyeOfHorusIcon = ({ className }: { className?: string }) => (
    <svg className={className} width="100" height="70" viewBox="0 0 100 70" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 35C15 20 40 15 50 35C60 15 85 20 97 35" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M3 35C15 50 40 55 50 35C60 55 85 50 97 35" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="50" cy="35" r="8" stroke="currentColor" strokeWidth="3" fill="transparent"/>
        <path d="M70 35C70 43.8399 61.0457 51 50 51" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M55 52L48 68" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
    </svg>
);


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
    let newUserCredential;
    try {
        newUserCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = newUserCredential.user;

        await updateProfile(user, {
            displayName: `${firstName} ${lastName}`,
        });
        
        const batch = writeBatch(firestore);
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
          referralCode: user.uid.substring(0, 8), // Generate a simple referral code
        };

        if (referrerId) {
            newUserProfile.referrerId = referrerId;
            const referrerDocRef = doc(firestore, 'users', referrerId);
            batch.update(referrerDocRef, { referredUsersCount: increment(1) });
        }

        batch.set(userDocRef, {
            ...newUserProfile,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        
        await batch.commit();

        toast({
            title: 'تم إنشاء الحساب بنجاح!',
            description: 'مرحباً بك. سيتم توجيهك الآن.',
        });

    } catch (error: any) {
      console.error('Registration Error:', error);
      let description = 'حدث خطأ غير متوقع. الرجاء المحاولة مرة أخرى.';
      const userId = newUserCredential?.user?.uid;

      if (error.code === 'auth/email-already-in-use') {
        description = 'هذا البريد الإلكتروني مستخدم بالفعل.';
      } else if (error.code === 'auth/weak-password') {
        description = 'كلمة المرور ضعيفة جدا. يجب أن تكون 6 أحرف على الأقل.';
      } else if (userId) {
         description = 'فشل حفظ بيانات الملف الشخصي. قد تكون هناك مشكلة في صلاحيات قاعدة البيانات.';
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
      <section className="relative flex flex-col items-center justify-center text-center min-h-screen p-8 bg-background overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern z-0"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background z-1"></div>
        <AnkhIcon className="absolute top-[20%] left-[5%] text-primary/5 -rotate-12 hidden lg:block" />
        <PyramidIcon className="absolute bottom-[10%] right-[5%] text-primary/5 hidden md:block" />
        <EyeOfHorusIcon className="absolute top-[25%] right-[10%] text-primary/5 rotate-12 hidden lg:block" />
        <AnkhIcon className="absolute bottom-[15%] left-[15%] text-primary/5 rotate-6 hidden md:block w-12 h-auto" />

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

      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight">هل أنت تاجر أو مورد؟</h2>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
            هل لديك منتجات وترغب في الوصول إلى آلاف المسوقين النشطين؟ انضم إلى شبكة موردينا وقم بزيادة مبيعاتك وأرباحك دون عناء.
          </p>
          <div className="mt-8">
            <MerchantInquiryDialog />
          </div>
        </div>
      </section>

      <footer className="bg-background border-t">
          <div className="container mx-auto px-6 py-6 text-center text-muted-foreground">
             <p>&copy; 2026 KEMET MARKETING SOLUTION. جميع الحقوق محفوظة.</p>
          </div>
      </footer>
    </div>
  );
}
