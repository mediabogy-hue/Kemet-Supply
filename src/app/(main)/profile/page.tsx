
'use client';

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUser, useFirestore, useDoc, useMemoFirebase, errorEmitter, FirestorePermissionError, useCollection } from "@/firebase";
import { doc, updateDoc, serverTimestamp, collection, query, where, Timestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useMemo } from "react";
import type { UserProfile, Order } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Target, CalendarDays, DollarSign, ListOrdered, TrendingUp, BrainCircuit, CheckCircle, BarChart2, Trophy, ClipboardCheck, Mail, Phone, User as UserIcon, Save, Loader2, Banknote, Wallet } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useSession } from "@/auth/SessionProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const roleTranslation: Record<string, string> = {
    'Dropshipper': 'مسوق',
    'Admin': 'أدمن',
    'OrdersManager': 'مدير طلبات',
    'FinanceManager': 'مدير مالي',
    'ProductManager': 'مدير منتجات',
};

const StatDisplay = ({ icon, label, value, unit, isLoading, className }: { icon: React.ReactNode, label: string, value: string | number, unit?: string, isLoading: boolean, className?: string }) => (
    <div className={`space-y-1 rounded-lg bg-muted/50 p-3 ${className}`}>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {icon}
            <span>{label}</span>
        </div>
        {isLoading ? <Skeleton className="h-6 w-24" /> : <p className="text-xl font-bold">{value} <span className="text-sm font-normal text-muted-foreground">{unit}</span></p>}
    </div>
);

const VodafoneCashLogo = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM10.5 16.5C8.02 16.5 6 14.48 6 12C6 9.52 8.02 7.5 10.5 7.5C11.4 7.5 12.22 7.8 12.9 8.3L11.4 9.8C11.14 9.6 10.84 9.5 10.5 9.5C9.12 9.5 8 10.62 8 12C8 13.38 9.12 14.5 10.5 14.5C11.98 14.5 13.12 13.36 13.12 11.9H10.5V10.4H14.5V12C14.5 14.48 12.48 16.5 10.5 16.5Z" fill="#E60000"/></svg>;
const InstaPayLogo = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" fill="#00A99D"/><path d="M10.5 9.5H12V16H10.5V9.5ZM12 7C12 7.55 11.55 8 11 8C10.45 8 10 7.55 10 7C10 6.45 10.45 6 11 6C11.55 6 12 6.45 12 7Z" fill="white"/><path d="M14.5 9.5C15.88 9.5 17 10.62 17 12C17 13.38 15.88 14.5 14.5 14.5C13.12 14.5 12 13.38 12 12C12 10.62 13.12 9.5 14.5 9.5ZM14.5 11C13.95 11 13.5 11.45 13.5 12C13.5 12.55 13.95 13 14.5 13C15.05 13 15.5 12.55 15.5 12C15.5 11.45 15.05 11 14.5 11Z" fill="white"/></svg>;


const ProfileHeader = ({ userProfile, isLoading }: { userProfile: UserProfile | null, isLoading: boolean }) => {
    if (isLoading) {
        return (
            <div className="flex items-center gap-4">
                <Skeleton className="h-24 w-24 rounded-full" />
                <div className="space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-5 w-64" />
                </div>
            </div>
        )
    }
    if (!userProfile) return null;

    const initials = `${userProfile.firstName?.[0] || ''}${userProfile.lastName?.[0] || ''}`;

    return (
        <div className="flex flex-col items-center text-center md:flex-row md:text-start md:items-center gap-6">
            <Avatar className="h-28 w-28 text-3xl border-4 border-primary/20">
                <AvatarImage src={userProfile.photoURL} alt={`${userProfile.firstName} ${userProfile.lastName}`} />
                <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div>
                <h1 className="text-4xl font-bold">{userProfile.firstName} {userProfile.lastName}</h1>
                <p className="text-lg text-muted-foreground mt-1">{userProfile.email}</p>
                {userProfile.role && (
                    <Badge variant="outline" className="mt-2 text-base border-primary/30 text-primary">{roleTranslation[userProfile.role] || userProfile.role}</Badge>
                )}
            </div>
        </div>
    )
}

export default function ProfilePage() {
    const { user: authUser, isUserLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const { isDropshipper, isStaff, isLoading: isRoleLoading, profile: userProfile } = useSession();

    const [isClient, setIsClient] = useState(false);
    useEffect(() => { setIsClient(true); }, []);

    const ordersQuery = useMemoFirebase(() => {
        if (!firestore || !authUser) return null;
        return query(collection(firestore, `users/${authUser.uid}/orders`));
    }, [firestore, authUser]);
    const { data: orders, isLoading: ordersLoading } = useCollection<Order>(ordersQuery);

    const [workingDays, setWorkingDays] = useState(25);
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [phone, setPhone] = useState("");
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isSavingPayment, setIsSavingPayment] = useState(false);

    const [vodafoneCash, setVodafoneCash] = useState("");
    const [instaPay, setInstaPay] = useState("");
    const [bankAccount, setBankAccount] = useState("");
    const [telda, setTelda] = useState("");

    useEffect(() => {
        if (userProfile) {
            setFirstName(userProfile.firstName || "");
            setLastName(userProfile.lastName || "");
            setPhone(userProfile.phone || "");
            setVodafoneCash(userProfile.paymentDetails?.vodafoneCash || "");
            setInstaPay(userProfile.paymentDetails?.instaPay || "");
            setBankAccount(userProfile.paymentDetails?.bankAccount || "");
            setTelda(userProfile.paymentDetails?.telda || "");
        }
    }, [userProfile]);

    const {
        currentMonthlySales, avgOrderValue, avgCommissionPerOrder, targetRemaining,
        dailyTarget, ordersPerDay, estimatedDailyProfit, targetProgress, estimatedTotalProfitWithReward,
    } = useMemo(() => {
        const fallbackResult = { currentMonthlySales: 0, avgOrderValue: 0, avgCommissionPerOrder: 0, targetRemaining: 0, dailyTarget: 0, ordersPerDay: 0, estimatedDailyProfit: 0, targetProgress: 0, estimatedTotalProfitWithReward: 0 };
        if (!userProfile || !orders || !isClient) return fallbackResult;
        const deliveredOrders = orders.filter(o => o.status === 'Delivered');
        const monthlyDeliveredOrders = deliveredOrders.filter(o => o.createdAt?.toDate?.() >= new Date(new Date().getFullYear(), new Date().getMonth(), 1));
        const currentMonthlySales = monthlyDeliveredOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
        const totalSalesAllTime = deliveredOrders.reduce((sum, o) => sum + o.totalAmount, 0);
        const avgOrderValue = deliveredOrders.length > 0 ? totalSalesAllTime / deliveredOrders.length : 500;
        const totalCommissionAllTime = deliveredOrders.reduce((sum, o) => sum + (o.totalCommission || 0), 0);
        const avgCommissionPerOrder = deliveredOrders.length > 0 ? totalCommissionAllTime / deliveredOrders.length : 50;
        const target = userProfile.monthlySalesTarget || 0;
        const targetRemaining = Math.max(0, target - currentMonthlySales);
        const targetProgress = target > 0 ? Math.min((currentMonthlySales / target) * 100, 100) : 0;
        const dailyTarget = workingDays > 0 ? targetRemaining / workingDays : 0;
        const ordersPerDay = avgOrderValue > 0 ? dailyTarget / avgOrderValue : 0;
        const estimatedDailyProfit = ordersPerDay * avgCommissionPerOrder;
        const totalTargetCommission = avgOrderValue > 0 ? (target / avgOrderValue) * avgCommissionPerOrder : 0;
        const finalEstimatedProfit = totalTargetCommission + (userProfile.monthlyReward || 0);
        return { currentMonthlySales, avgOrderValue, avgCommissionPerOrder, targetRemaining, dailyTarget, ordersPerDay, estimatedDailyProfit, targetProgress, estimatedTotalProfitWithReward: finalEstimatedProfit };
    }, [userProfile, orders, workingDays, isClient]);

    const handleSaveProfileData = async () => {
        if (!userProfile || !authUser) return;
        const userProfileRef = doc(firestore, `users/${authUser.uid}`);
        setIsSavingProfile(true);
        const updatedData = { firstName, lastName, phone, updatedAt: serverTimestamp() };
        updateDoc(userProfileRef, updatedData)
            .then(() => {
                toast({ title: "تم تحديث بيانات الحساب بنجاح" });
            })
            .catch((error: any) => {
                errorEmitter.emit('permission-error', new FirestorePermissionError({ path: userProfileRef.path, operation: 'update', requestResourceData: updatedData }));
                toast({ variant: "destructive", title: "فشل حفظ البيانات", description: "قد لا تملك الصلاحيات الكافية." });
            })
            .finally(() => {
                setIsSavingProfile(false);
            });
    };

    const handleSavePaymentData = async () => {
        if (!userProfile || !authUser) return;
        const userProfileRef = doc(firestore, `users/${authUser.uid}`);
        setIsSavingPayment(true);
        const updatedData = { paymentDetails: { vodafoneCash, instaPay, bankAccount, telda }, updatedAt: serverTimestamp() };
        updateDoc(userProfileRef, updatedData)
            .then(() => {
                toast({ title: "تم تحديث بيانات الدفع بنجاح" });
            })
            .catch((error: any) => {
                errorEmitter.emit('permission-error', new FirestorePermissionError({ path: userProfileRef.path, operation: 'update', requestResourceData: updatedData }));
                toast({ variant: "destructive", title: "فشل حفظ بيانات الدفع", description: "قد لا تملك الصلاحيات الكافية." });
            })
            .finally(() => {
                setIsSavingPayment(false);
            });
    };

    const isLoading = !isClient || isUserLoading || isRoleLoading || ordersLoading;
    const paymentCardVisible = isDropshipper || isStaff;
    const paymentDescription = isDropshipper 
        ? "إدارة معلومات حساباتك لاستلام الأرباح."
        : "إدارة معلومات حساباتك الشخصية للمدفوعات.";

    const renderPlanner = () => {
        if (isLoading) return <Card><CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader><CardContent><Skeleton className="h-64 w-full" /></CardContent></Card>;
        if (isDropshipper) {
            if (userProfile?.monthlySalesTarget && userProfile.monthlySalesTarget > 0) {
                return (
                    <Card>
                        <CardHeader><CardTitle className="flex items-center gap-2"><Target className="h-6 w-6 text-primary" /> مخطط تحقيق الهدف</CardTitle><CardDescription>استخدم هذه الأداة لتخطيط أهداف مبيعاتك الشهرية وتحليل أدائك لتحقيقها.</CardDescription></CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3 text-center"><p className="text-muted-foreground">الهدف الشهري</p><p className="text-4xl font-bold tracking-tight">{userProfile.monthlySalesTarget.toLocaleString()} ج.م</p><Progress value={targetProgress} className="w-full max-w-sm mx-auto h-2" /><div className="flex justify-between max-w-sm mx-auto text-xs text-muted-foreground"><span>{currentMonthlySales.toLocaleString()} ج.م <span className="text-green-500">(مُحقق)</span></span><span>{targetRemaining.toLocaleString()} ج.م <span className="text-destructive">(متبقي)</span></span></div></div>
                            <div className="space-y-4 pt-6 border-t"><div className="space-y-2"><Label htmlFor="working-days" className="text-center block">حدد أيام عملك المتبقية في الشهر</Label><div className="flex items-center gap-4"><Slider id="working-days" min={1} max={30} step={1} value={[workingDays]} onValueChange={(value) => setWorkingDays(value[0])} className="flex-1" /><span className="font-bold text-primary text-lg w-12 text-center">{workingDays} يوم</span></div></div><div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-2"><StatDisplay icon={<DollarSign />} label="الهدف اليومي" value={dailyTarget.toFixed(0)} unit="ج.م" isLoading={isLoading} /><StatDisplay icon={<ListOrdered />} label="الطلبات اليومية" value={ordersPerDay.toFixed(1)} unit="طلب" isLoading={isLoading} /><StatDisplay icon={<TrendingUp />} label="متوسط قيمة الطلب" value={avgOrderValue.toFixed(0)} unit="ج.م" isLoading={isLoading} /><StatDisplay icon={<DollarSign className="text-green-500" />} label="الربح اليومي المتوقع" value={estimatedDailyProfit.toFixed(0)} unit="ج.م" isLoading={isLoading} /><StatDisplay icon={<Trophy className="text-amber-400" />} label="إجمالي الربح المتوقع" value={estimatedTotalProfitWithReward.toFixed(0)} unit="ج.م" isLoading={isLoading} /></div></div>
                            <Accordion type="single" collapsible className="w-full pt-4"><AccordionItem value="item-1"><AccordionTrigger><div className="flex items-center gap-2"><BarChart2 className="h-5 w-5" /> تحليل الأداء الحالي</div></AccordionTrigger><AccordionContent className="pt-2 text-muted-foreground">بناءً على أدائك حتى الآن، متوسط قيمة الطلب الواحد لديك هو حوالي {avgOrderValue.toFixed(0)} جنيه، ومتوسط ربحك من كل طلب هو {avgCommissionPerOrder.toFixed(0)} جنيه. لتحقيق هدفك، تحتاج إلى زيادة عدد الطلبات اليومية أو زيادة قيمة كل طلب عن طريق بيع منتجات ذات أسعار أعلى.</AccordionContent></AccordionItem><AccordionItem value="item-2"><AccordionTrigger><div className="flex items-center gap-2"><BrainCircuit className="h-5 w-5" /> خطة العمل المقترحة</div></AccordionTrigger><AccordionContent className="pt-2 text-muted-foreground space-y-2"><div className="flex items-start gap-2"><CheckCircle className="h-4 w-4 mt-1 text-green-500 shrink-0" /><span>**التركيز على المنتجات الرابحة:** قم بمراجعة المنتجات التي حققت لك أعلى نسبة أرباح في الماضي وركز جهودك التسويقية عليها.</span></div><div className="flex items-start gap-2"><CheckCircle className="h-4 w-4 mt-1 text-green-500 shrink-0" /><span>**التسويق بالمحتوى:** قم بإنشاء محتوى جذاب (فيديوهات، منشورات) يوضح فوائد المنتج ويحل مشكلة لدى العميل. شارك هذا المحتوى على منصات التواصل الاجتماعي التي يتواجد بها جمهورك.</span></div><div className="flex items-start gap-2"><CheckCircle className="h-4 w-4 mt-1 text-green-500 shrink-0" /><span>**التواصل مع العملاء:** قم ببناء علاقة جيدة مع عملائك الحاليين. العميل الراضي قد يكرر الشراء أو يوصي بمنتجاتك لآخرين.</span></div><div className="flex items-start gap-2"><CheckCircle className="h-4 w-4 mt-1 text-green-500 shrink-0" /><span>**الاستمرارية:** التزم بالخطة اليومية. تحقيق {ordersPerDay.toFixed(1)} طلب يوميًا هو هدف يمكن الوصول إليه بالتركيز والمتابعة.</span></div></AccordionContent></AccordionItem></Accordion>
                        </CardContent>
                    </Card>
                );
            }
            return <Card><CardHeader><CardTitle className="flex items-center gap-2"><Target className="h-6 w-6 text-primary" /> مخطط تحقيق الهدف</CardTitle></CardHeader><CardContent><div className="text-center py-8 text-muted-foreground"><Target className="h-12 w-12 mx-auto mb-4" /><p className="font-semibold">لم يتم تحديد هدف شهري لك بعد.</p><p className="text-sm">تواصل مع الإدارة لتحديد هدفك وبدء تتبع أدائك.</p></div></CardContent></Card>;
        }
        if (isStaff) {
            if (userProfile?.staffDetails?.monthlyTask) {
                const progress = userProfile.staffDetails.taskProgress || 0;
                const reward = userProfile.staffDetails.taskReward || 0;
                return (
                    <Card>
                        <CardHeader><CardTitle className="flex items-center gap-2"><ClipboardCheck className="h-6 w-6 text-primary"/> مهمتك الشهرية</CardTitle><CardDescription>هذه هي المهمة الموكلة إليك من قبل الإدارة لهذا الشهر.</CardDescription></CardHeader>
                        <CardContent className="space-y-6"><div className="p-4 bg-muted rounded-lg space-y-2"><Label>وصف المهمة</Label><p className="text-foreground font-medium whitespace-pre-wrap">{userProfile.staffDetails.monthlyTask}</p></div><div className="space-y-3 text-center"><p className="text-muted-foreground">مستوى التقدم</p><p className="text-4xl font-bold tracking-tight">{progress}%</p><Progress value={progress} className="w-full max-w-sm mx-auto h-2" /></div>{reward > 0 && (<div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/20"><div className="flex items-center gap-2"><Trophy className="h-5 w-5 text-amber-400"/><span className="font-semibold text-green-300">مكافأة الإنجاز</span></div><span className="font-bold text-lg text-green-200">{reward.toLocaleString()} ج.م</span></div>)}</CardContent>
                    </Card>
                )
            }
            return <Card><CardHeader><CardTitle className="flex items-center gap-2"><ClipboardCheck className="h-6 w-6 text-primary"/> المهام الشهرية</CardTitle></CardHeader><CardContent><div className="text-center py-8 text-muted-foreground"><ClipboardCheck className="h-12 w-12 mx-auto mb-4" /><p className="font-semibold">لا توجد مهام محددة لك بعد.</p><p className="text-sm">سيتم عرض مهامك هنا عند إضافتها من قبل الإدارة.</p></div></CardContent></Card>;
        }
        return null;
    }

    return (
        <div className="space-y-8">
            <ProfileHeader userProfile={userProfile} isLoading={isLoading} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <Card className="bg-card/80 backdrop-blur-sm">
                    <CardHeader><CardTitle>إعدادات الحساب</CardTitle><CardDescription>إدارة معلومات حسابك الشخصي.</CardDescription></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2"><Label htmlFor="firstName">الاسم الأول</Label><div className="relative"><UserIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} disabled={isSavingProfile || isLoading} className="pr-10" /></div></div>
                        <div className="space-y-2"><Label htmlFor="lastName">الاسم الأخير</Label><div className="relative"><UserIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} disabled={isSavingProfile || isLoading} className="pr-10" /></div></div>
                        <div className="space-y-2"><Label htmlFor="phone">رقم الهاتف</Label><div className="relative"><Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={isSavingProfile || isLoading} className="pr-10" /></div></div>
                        <div className="space-y-2"><Label htmlFor="email">البريد الإلكتروني</Label><div className="relative"><Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="email" value={userProfile?.email || ""} disabled className="pr-10" /></div></div>
                    </CardContent>
                    <CardFooter>
                        <Button onClick={handleSaveProfileData} disabled={isSavingProfile || isLoading}>{isSavingProfile ? <><Loader2 className="me-2 h-4 w-4 animate-spin" /> جاري الحفظ...</> : <><Save className="me-2 h-4 w-4" /> حفظ التغييرات</>}</Button>
                    </CardFooter>
                </Card>

                {paymentCardVisible && (
                    <Card className="bg-card/80 backdrop-blur-sm">
                        <CardHeader><CardTitle>بيانات الدفع</CardTitle><CardDescription>{paymentDescription}</CardDescription></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2"><Label htmlFor="vodafoneCash" className="flex items-center gap-2"><VodafoneCashLogo /> رقم فودافون كاش</Label><Input id="vodafoneCash" value={vodafoneCash} onChange={(e) => setVodafoneCash(e.target.value)} placeholder="e.g., 01012345678" disabled={isSavingPayment || isLoading} /><CardDescription>سيتم التحويل لهذا الرقم.</CardDescription></div>
                            <div className="space-y-2"><Label htmlFor="instaPay" className="flex items-center gap-2"><InstaPayLogo /> معرّف انستا باي (IPA)</Label><Input id="instaPay" value={instaPay} onChange={(e) => setInstaPay(e.target.value)} placeholder="e.g., yourname@instapay" disabled={isSavingPayment || isLoading} /><CardDescription>سيتم التحويل لهذا المعرف.</CardDescription></div>
                            <div className="space-y-2"><Label htmlFor="telda" className="flex items-center gap-2"><Wallet className="h-5 w-5" /> حساب Telda</Label><Input id="telda" value={telda} onChange={(e) => setTelda(e.target.value)} placeholder="e.g., @teldahandle" disabled={isSavingPayment || isLoading} /><CardDescription>سيتم التحويل لحساب تيلدا الخاص بك.</CardDescription></div>
                            <div className="space-y-2"><Label htmlFor="bankAccount" className="flex items-center gap-2"><Banknote className="h-5 w-5" /> معلومات الحساب البنكي</Label><Textarea id="bankAccount" value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} placeholder="اسم البنك، رقم الحساب، رقم الفرع، رقم IBAN" rows={3} disabled={isSavingPayment || isLoading} /><CardDescription>للتحويلات البنكية المباشرة.</CardDescription></div>
                        </CardContent>
                        <CardFooter>
                            <Button onClick={handleSavePaymentData} disabled={isSavingPayment || isLoading}>{isSavingPayment ? <><Loader2 className="me-2 h-4 w-4 animate-spin" /> جاري الحفظ...</> : <><Save className="me-2 h-4 w-4" /> حفظ بيانات الدفع</>}</Button>
                        </CardFooter>
                    </Card>
                )}
            </div>

            <div className="mt-8">
                {renderPlanner()}
            </div>
        </div>
    );
}
