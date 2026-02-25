

'use client';

import { useMemo, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DollarSign, CheckCircle, XCircle, Users, Copy, Trophy, Gift } from "lucide-react";
import { useFirestore, useUser, useMemoFirebase, useCollection, errorEmitter, FirestorePermissionError } from "@/firebase";
import { collection, query, doc, updateDoc, where, collectionGroup, orderBy } from "firebase/firestore";
import type { Order, UserProfile } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useSession } from '@/auth/SessionProvider';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const SalesChart = dynamic(() => import("./_components/sales-chart").then(mod => mod.SalesChart), {
    loading: () => <Skeleton className="h-[350px]" />,
    ssr: false,
});

const RecentSales = dynamic(() => import("./_components/recent-sales").then(mod => mod.RecentSales), {
    loading: () => <div className="space-y-6">{Array.from({length: 5}).map((_, i) => <div className="flex items-center" key={i}><Skeleton className="h-10 w-10 rounded-full" /><div className="ms-4 space-y-2"><Skeleton className="h-4 w-[100px]" /><Skeleton className="h-3 w-[150px]" /></div><Skeleton className="ms-auto h-5 w-[60px]" /></div>)}</div>,
    ssr: false,
});


export default function DashboardPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const { profile: userProfile, isLoading: profileLoading } = useSession();
    
    const [referralLink, setReferralLink] = useState('');
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    const ordersQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return query(collection(firestore, `users/${user.uid}/orders`), orderBy('createdAt', 'desc'));
    }, [firestore, user]);
    
    const { data: orders, isLoading: ordersLoading } = useCollection<Order>(ordersQuery);

    useEffect(() => {
        if (userProfile && !userProfile.referralCode && firestore && user) {
            const userDocRef = doc(firestore, 'users', user.uid);
            const newReferralCode = user.uid.substring(0, 8);
            updateDoc(userDocRef, { referralCode: newReferralCode })
            .then(() => {
                toast({
                    title: "تم إنشاء رابط الإحالة الخاص بك!",
                    description: "يمكنك الآن استخدامه لدعوة أصدقائك.",
                });
            })
            .catch(error => {
                errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: userDocRef.path,
                    operation: 'update',
                    requestResourceData: { referralCode: newReferralCode }
                }));
            });
        }
    }, [userProfile, firestore, user, toast]);

    useEffect(() => {
        if (typeof window !== 'undefined' && userProfile?.referralCode) {
            setReferralLink(`${window.location.origin}/register?ref=${userProfile.referralCode}`);
        }
    }, [userProfile?.referralCode]);

    const handleCopyLink = () => {
        navigator.clipboard.writeText(referralLink);
        toast({
            title: "تم نسخ رابط الإحالة!",
            description: "يمكنك الآن مشاركته مع أصدقائك.",
        });
    };

    const {
        totalProfit,
        completedOrders,
        returnedOrders,
        salesChartData,
        recentSales,
    } = useMemo(() => {
        const fallback = {
            totalProfit: 0,
            completedOrders: 0,
            returnedOrders: 0,
            salesChartData: [],
            recentSales: []
        };
        if (!orders || !isClient) return fallback;
        
        const sortedOrders = [...orders].sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));

        const profitAndOrders = sortedOrders.reduce((acc, order) => {
            if (order.status === 'Delivered') {
                acc.totalProfit += order.totalCommission || 0;
                acc.completedOrders++;
            }
            if (order.status === 'Returned' || order.status === 'Canceled') {
                acc.returnedOrders++;
            }
            return acc;
        }, { totalProfit: 0, completedOrders: 0, returnedOrders: 0 });
        
        const monthlyProfits = sortedOrders.filter(o => o.status === 'Delivered').reduce((acc, order) => {
            const date = order.createdAt?.toDate?.();
            if (!date) return acc;
            
            const year = date.getFullYear();
            const month = date.getMonth(); // 0-11
            const monthKey = `${year}-${month}`;
            
            if (!acc[monthKey]) {
              acc[monthKey] = { year, month, total: 0 };
            }
            acc[monthKey].total += order.totalCommission || 0;
            return acc;
          }, {} as {[key: string]: {year: number, month: number, total: number}});
          
        const chartData = Object.values(monthlyProfits)
            .sort((a, b) => {
                if (a.year !== b.year) return a.year - b.year;
                return a.month - b.month;
            })
            .map(monthData => {
                const date = new Date(monthData.year, monthData.month);
                return {
                    name: format(date, 'MMM', { locale: ar }),
                    total: monthData.total,
                }
            });


        const recentSalesData = sortedOrders.slice(0, 5).map(order => ({
            id: order.id,
            name: order.customerName,
            email: order.customerPhone,
            amount: `+${(order.totalCommission || 0).toFixed(2)} ج.م`
        }));
        
        return { ...profitAndOrders, salesChartData: chartData, recentSales: recentSalesData };
    }, [orders, isClient]);

    const isLoading = ordersLoading || profileLoading;
    
    const stats = [
        { title: "إجمالي الأرباح", value: `${totalProfit.toFixed(2)} ج.م`, icon: <DollarSign className="h-5 w-5 text-muted-foreground" /> },
        { title: "الطلبات المكتملة", value: completedOrders, icon: <CheckCircle className="h-5 w-5 text-muted-foreground" /> },
        { title: "الطلبات المرتجعة/الملغاة", value: returnedOrders, icon: <XCircle className="h-5 w-5 text-muted-foreground" /> },
    ];
    
  return (
    <div className="flex flex-col gap-8">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">لوحة التحكم</h1>
            <p className="text-muted-foreground">نظرة عامة على أدائك وأرباحك.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {stats.map((stat, index) => (
                <div key={index} className="p-6 rounded-lg bg-card border">
                    <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <h3 className="text-sm font-medium text-muted-foreground">{stat.title}</h3>
                        {stat.icon}
                    </div>
                    <div>
                        {isLoading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-3xl font-bold">{stat.value}</div>}
                    </div>
                </div>
            ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
             <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Trophy className="text-amber-400" /> مستواك الحالي</CardTitle>
                </CardHeader>
                <CardContent>
                     {isLoading ? <Skeleton className="h-6 w-1/3" /> : (
                        <p className="text-2xl font-bold text-primary">{userProfile?.level || 'مسوق مبتدئ'}</p>
                     )}
                     <p className="text-sm text-muted-foreground mt-1">
                        استمر في البيع للوصول لمستويات أعلى وفتح مزايا حصرية!
                     </p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Gift /> مكافأة البداية</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">أكمل 10 طلبات ناجحة للحصول على مكافأة خاصة!</p>
                     <div className="mt-3 space-y-1">
                        <p className="text-xs font-semibold text-end">{completedOrders} / 10 طلبات</p>
                        <progress className="w-full" value={completedOrders} max="10" />
                     </div>
                </CardContent>
            </Card>
        </div>
         <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Users /> نظام الإحالة</CardTitle>
                <CardDescription>ادعُ مسوقين آخرين للانضمام واحصل على عمولات إضافية على مبيعاتهم.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {isLoading ? <Skeleton className="h-10 w-full" /> : (
                    <div>
                        <Label htmlFor="referral-link">رابط الإحالة الخاص بك</Label>
                        <div className="flex gap-2 mt-1">
                            <Input id="referral-link" value={referralLink} readOnly />
                            <Button variant="outline" size="icon" onClick={handleCopyLink} disabled={!referralLink}>
                                <Copy />
                            </Button>
                        </div>
                    </div>
                )}
                 <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg border bg-background p-4">
                        <p className="text-sm font-medium text-muted-foreground">عدد المسوقين الذين دعوتهم</p>
                         {isLoading ? <Skeleton className="h-6 w-10 mt-1" /> : (
                            <p className="text-2xl font-bold">{userProfile?.referredUsersCount || 0}</p>
                         )}
                    </div>
                    <div className="rounded-lg border bg-background p-4">
                        <p className="text-sm font-medium text-muted-foreground">أرباحك من الإحالات</p>
                        {isLoading ? <Skeleton className="h-6 w-20 mt-1" /> : (
                            <p className="text-2xl font-bold text-green-500">0.00 ج.م</p>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
        <div className="grid gap-6 lg:grid-cols-5">
            <Card className="lg:col-span-3">
                <CardHeader>
                    <CardTitle>نظرة عامة على الأرباح الشهرية</CardTitle>
                    <CardDescription>إجمالي أرباحك من الطلبات المكتملة خلال الأشهر الماضية.</CardDescription>
                </CardHeader>
                <CardContent className="ps-2">
                    <SalesChart data={salesChartData} />
                </CardContent>
            </Card>
            <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle>أحدث الطلبات</CardTitle>
                    <CardDescription>آخر 5 طلبات قمت بإنشائها.</CardDescription>
                </CardHeader>
                <CardContent>
                    <RecentSales data={recentSales} />
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
