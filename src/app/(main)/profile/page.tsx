'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useSession } from '@/auth/SessionProvider';
import { useFirestore } from '@/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';

// Schema for personal information
const profileSchema = z.object({
  firstName: z.string().min(2, 'الاسم الأول مطلوب'),
  lastName: z.string().min(2, 'الاسم الأخير مطلوب'),
  phone: z.string().optional(),
});

// Schema for payment details
const paymentSchema = z.object({
  vodafoneCash: z.string().optional(),
  instaPay: z.string().optional(),
  bankAccount: z.string().optional(),
  telda: z.string().optional(),
});

export default function ProfilePage() {
  const { user, profile, isLoading: sessionLoading } = useSession();
  const firestore = useFirestore();
  const { toast } = useToast();

  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    values: {
      firstName: profile?.firstName || '',
      lastName: profile?.lastName || '',
      phone: profile?.phone || '',
    },
    disabled: sessionLoading,
  });

  const paymentForm = useForm<z.infer<typeof paymentSchema>>({
    resolver: zodResolver(paymentSchema),
    values: {
      vodafoneCash: profile?.paymentDetails?.vodafoneCash || '',
      instaPay: profile?.paymentDetails?.instaPay || '',
      bankAccount: profile?.paymentDetails?.bankAccount || '',
      telda: profile?.paymentDetails?.telda || '',
    },
    disabled: sessionLoading,
  });
  
  const onProfileSubmit = async (values: z.infer<typeof profileSchema>) => {
    if (!user || !firestore) return;
    const userRef = doc(firestore, 'users', user.uid);
    try {
      await updateDoc(userRef, {
        ...values,
        updatedAt: serverTimestamp(),
      });
      toast({ title: 'تم تحديث بياناتك الشخصية بنجاح!' });
    } catch (error) {
      console.error("Profile update error:", error);
      toast({ variant: 'destructive', title: 'فشل تحديث البيانات' });
    }
  };

  const onPaymentSubmit = async (values: z.infer<typeof paymentSchema>) => {
    if (!user || !firestore) return;
    const userRef = doc(firestore, 'users', user.uid);
    try {
      await updateDoc(userRef, {
        paymentDetails: values,
        updatedAt: serverTimestamp(),
      });
      toast({ title: 'تم تحديث بيانات الدفع بنجاح!' });
    } catch (error) {
      console.error("Payment update error:", error);
      toast({ variant: 'destructive', title: 'فشل تحديث بيانات الدفع' });
    }
  };
  
  const { isSubmitting: isProfileSubmitting } = profileForm.formState;
  const { isSubmitting: isPaymentSubmitting } = paymentForm.formState;

  if (sessionLoading) {
      return (
          <div className="space-y-6">
              <Skeleton className="h-10 w-1/3" />
              <Card><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
              <Card><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
          </div>
      );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">الملف الشخصي</h1>
        <p className="text-muted-foreground">
          تحديث بياناتك الشخصية وتفاصيل سحب الأرباح.
        </p>
      </div>

      <Form {...profileForm}>
        <form onSubmit={profileForm.handleSubmit(onProfileSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>البيانات الشخصية</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <FormField
                  control={profileForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الاسم الأول</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={profileForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الاسم الأخير</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={profileForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رقم الهاتف</FormLabel>
                    <FormControl>
                      <Input type="tel" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isProfileSubmitting}>
                {isProfileSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                حفظ التغييرات
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>

      <Form {...paymentForm}>
        <form onSubmit={paymentForm.handleSubmit(onPaymentSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>بيانات سحب الأرباح</CardTitle>
              <CardDescription>
                تأكد من صحة هذه البيانات. سيتم استخدامها لتحويل أرباحك.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={paymentForm.control}
                name="vodafoneCash"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رقم فودافون كاش</FormLabel>
                    <FormControl>
                      <Input placeholder="010..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={paymentForm.control}
                name="instaPay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>حساب انستا باي (InstaPay)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., myhandle@instapay" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={paymentForm.control}
                name="bankAccount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الحساب البنكي (رقم الحساب + اسم البنك)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 123456789 - QNB" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
                <FormField
                control={paymentForm.control}
                name="telda"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>حساب Telda</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g., @myhandle" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </CardContent>
            <CardFooter>
               <Button type="submit" disabled={isPaymentSubmitting}>
                 {isPaymentSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                حفظ بيانات الدفع
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  );
}
