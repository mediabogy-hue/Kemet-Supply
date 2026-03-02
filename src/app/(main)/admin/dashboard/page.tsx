'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useSession } from "@/auth/SessionProvider";
import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Skeleton } from "@/components/ui/skeleton";
import { SeedDatabaseButton } from "./_components/seed-database-button";
import { useCollection, useMemoFirebase, useFirestore } from "@/firebase";
import type { Order, Product, WithdrawalRequest } from "@/lib/types";
import { collection, query, where, Timestamp } from "firebase/firestore";
import { DollarSign, ShoppingCart, Banknote, Package, Landmark } from "lucide-react";

// Dynamically import the chart component to prevent SSR issues and improve performance
const SalesByHourChart = dynamic(
  () => import('./_components/sales-by-hour-chart').then(mod => mod.SalesByHourChart),
  { 
    ssr: false,
    loading: () => <Skeleton className="h-[250px]" />
  }
);


export default function AdminDashboardPage() {
    const { profile } = useSession();
    const firestore = useFirestore();

    // === QUERIES ===
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todaysOrdersQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, "orders"),
            where("createdAt", ">=", Timestamp.fromDate(todayStart))
        );
    }, [firestore, todayStart.getTime()]);

    const pendingWithdrawalsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, "adminWithdrawalRequests"), where("status", "==", "Pending"));
    }, [firestore]);

    const productsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, "products"));
    }, [firestore]);
    
    // === DATA FETCHING ===
    const { data: todaysOrders, isLoading: ordersLoading } = useCollection<Order>(todaysOrdersQuery);
    const { data: pendingWithdrawals, isLoading: withdrawalsLoading } = useCollection<WithdrawalRequest>(pendingWithdrawalsQuery);
    const { data: products, isLoading: productsLoading } = useCollection<Product>(productsQuery);

    const overallLoading = ordersLoading || withdrawalsLoading || productsLoading;

    // === STATS CALCULATION ===
    const salesByHour = useMemo(() => {
        const hours = Array.from({ length: 24 }, (_, i) => ({ name: `${i}:00`, total: 0 }));
        if (todaysOrders) {
            todaysOrders.forEach(order => {
                if (order.status !== 'Canceled' && order.status !== 'Returned') {
                    const hour = order.createdAt.toDate().getHours();
                    hours[hour].total += order.totalAmount;
                }
            });
        }
        return hours;
    }, [todaysOrders]);

    const totalSalesToday = useMemo(() => {
        return salesByHour.reduce((sum, hour) => sum + hour.total, 0);
    }, [salesByHour]);

    const totalPendingWithdrawals = useMemo(() => {
        return pendingWithdrawals?.reduce((sum, req) => sum + req.amount, 0) || 0;
    }, [pendingWithdrawals]);
    
    const totalProducts = useMemo(() => products?.length || 0, [products]);
    
    const platformEarningsToday = useMemo(() => {
        if (!todaysOrders) return 0;
        return todaysOrders.reduce((sum, order) => {
            if (order.status !== 'Canceled' && order.status !== 'Returned') {
                // Use saved platformFee or calculate it if missing
                const fee = order.platformFee || (order.totalAmount * 0.05);
                return sum + fee;
            }
            return sum;
        }, 0);
    }, [todaysOrders]);
    
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                 <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        مرحباً بك، {profile?.firstName || 'الأدمن'}!
                    </h1>
                    <p className="text-muted-foreground">
                        نظرة عامة على أداء المنصة اليوم.
                    </p>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">إجمالي المبيعات اليوم</CardTitle>
                        <DollarSign className="h-5 w-5 text-primary" />
                    </CardHeader>
                    <CardContent>
                         {overallLoading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold">{totalSalesToday.toFixed(2)} ج.م</div>}
                        <p className="text-xs text-muted-foreground">
                            مبيعات اليوم حتى الآن
                        </p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">عدد الطلبات اليوم</CardTitle>
                        <ShoppingCart className="h-5 w-5 text-primary" />
                    </CardHeader>
                    <CardContent>
                        {overallLoading ? <Skeleton className="h-8 w-1/4" /> : <div className="text-2xl font-bold">{todaysOrders?.length || 0}</div>}
                        <p className="text-xs text-muted-foreground">
                             {todaysOrders?.filter(o => o.status === 'Delivered').length || 0} طلب تم توصيله
                        </p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">إجمالي السحوبات المعلقة</CardTitle>
                        <Banknote className="h-5 w-5 text-primary" />
                    </CardHeader>
                    <CardContent>
                        {overallLoading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold">{totalPendingWithdrawals.toFixed(2)} ج.م</div>}
                        <p className="text-xs text-muted-foreground">
                            مجموع المبالغ المطلوبة للسحب
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">إجمالي المنتجات</CardTitle>
                        <Package className="h-5 w-5 text-primary" />
                    </CardHeader>
                    <CardContent>
                        {overallLoading ? <Skeleton className="h-8 w-1/4" /> : <div className="text-2xl font-bold">{totalProducts}</div>}
                        <p className="text-xs text-muted-foreground">
                             إجمالي المنتجات المسجلة بالمنصة
                        </p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">أرباح المنصة اليوم</CardTitle>
                        <Landmark className="h-5 w-5 text-primary" />
                    </CardHeader>
                    <CardContent>
                        {overallLoading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold">{platformEarningsToday.toFixed(2)} ج.م</div>}
                        <p className="text-xs text-muted-foreground">
                            عمولة 5% من الطلبات
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>مبيعات اليوم حسب الساعة</CardTitle>
                    <CardDescription>
                        تحليل لتوزيع المبيعات على مدار اليوم.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <SalesByHourChart data={salesByHour} />
                </CardContent>
            </Card>

            <Card className="border-dashed border-primary/30">
                <CardHeader>
                    <CardTitle>أدوات المطورين</CardTitle>
                     <CardDescription>
                        استخدم هذه الأدوات لمهام الصيانة أو ملء البيانات.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-4">
                    <SeedDatabaseButton />
                </CardContent>
            </Card>
        </div>
    );
}
