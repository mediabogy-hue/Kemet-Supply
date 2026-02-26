'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/auth/SessionProvider";
import { useCollection, useMemoFirebase, useFirebase } from "@/firebase";
import type { Order } from "@/lib/types";
import { collection, query, where, orderBy, Timestamp } from "firebase/firestore";
import { format, subDays } from 'date-fns';
import { RecentSales } from './_components/recent-sales';
import { DollarSign, ShoppingCart, Activity } from 'lucide-react';

const SalesChart = dynamic(
  () => import('./_components/sales-chart').then(mod => mod.SalesChart),
  { 
    ssr: false,
    loading: () => <Skeleton className="h-[350px]" />
  }
);

export default function DashboardPage() {
    const { user, profile } = useSession();
    const { firestore } = useFirebase();

    const ordersQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        const thirtyDaysAgo = subDays(new Date(), 30);
        return query(
            collection(firestore, "orders"),
            where("dropshipperId", "==", user.uid),
            where("createdAt", ">=", Timestamp.fromDate(thirtyDaysAgo)),
            orderBy("createdAt", "desc")
        );
    }, [firestore, user]);

    const { data: orders, isLoading: ordersLoading } = useCollection<Order>(ordersQuery);

    const stats = useMemo(() => {
        if (!orders) {
            return { totalCommission: 0, deliveredOrders: 0, pendingOrders: 0 };
        }
        const totalCommission = orders.reduce((sum, order) => {
            return (order.status === 'Delivered') ? sum + (order.totalCommission || 0) : sum;
        }, 0);
        const deliveredOrders = orders.filter(o => o.status === 'Delivered').length;
        const pendingOrders = orders.filter(o => ['Pending', 'Confirmed', 'Ready to Ship', 'Shipped'].includes(o.status)).length;
        
        return { totalCommission, deliveredOrders, pendingOrders };
    }, [orders]);
    
    const chartData = useMemo(() => {
        if (!orders) return [];
        const dailyCommissions: { [key: string]: number } = {};
        
        for (let i = 29; i >= 0; i--) {
            const date = subDays(new Date(), i);
            const formattedDate = format(date, 'MMM dd');
            dailyCommissions[formattedDate] = 0;
        }

        orders.forEach(order => {
            if (order.status === 'Delivered' && order.createdAt) {
                const date = format(order.createdAt.toDate(), 'MMM dd');
                if (date in dailyCommissions) {
                    dailyCommissions[date] += (order.totalCommission || 0);
                }
            }
        });
        
        return Object.keys(dailyCommissions).map(date => ({
            name: date,
            total: parseFloat(dailyCommissions[date].toFixed(2))
        }));
    }, [orders]);
    
    const recentSalesData = useMemo(() => {
        if (!orders) return undefined; // Important for RecentSales component check
        return orders.slice(0, 5).map(order => ({
            id: order.id,
            name: order.customerName,
            email: order.customerPhone,
            amount: `+${(order.totalCommission || 0).toFixed(2)} ج.م`
        }));
    }, [orders]);


    return (
    <div className="space-y-6">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">
                مرحباً بك، {profile?.firstName || 'المسوق'}!
            </h1>
            <p className="text-muted-foreground">
                هذه لوحة التحكم الخاصة بك. يمكنك من هنا متابعة أداءك.
            </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">إجمالي الأرباح (آخر 30 يوم)</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    {ordersLoading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold">{stats.totalCommission.toFixed(2)} ج.م</div>}
                    <p className="text-xs text-muted-foreground">الأرباح من الطلبات التي تم توصيلها.</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">الطلبات المكتملة (آخر 30 يوم)</CardTitle>
                    <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    {ordersLoading ? <Skeleton className="h-8 w-1/4" /> : <div className="text-2xl font-bold">+{stats.deliveredOrders}</div>}
                    <p className="text-xs text-muted-foreground">عدد الطلبات التي تم توصيلها بنجاح.</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">الطلبات قيد التنفيذ</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    {ordersLoading ? <Skeleton className="h-8 w-1/4" /> : <div className="text-2xl font-bold">{stats.pendingOrders}</div>}
                    <p className="text-xs text-muted-foreground">الطلبات قيد الانتظار أو الشحن.</p>
                </CardContent>
            </Card>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
                <CardHeader>
                    <CardTitle>نظرة عامة على الأرباح</CardTitle>
                    <CardDescription>أرباحك اليومية من الطلبات المكتملة خلال آخر 30 يومًا.</CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                    <SalesChart data={chartData} />
                </CardContent>
            </Card>
            <Card className="col-span-4 lg:col-span-3">
                <CardHeader>
                    <CardTitle>آخر الطلبات</CardTitle>
                    <CardDescription>
                        آخر 5 طلبات قمت بإنشائها.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <RecentSales data={recentSalesData} />
                </CardContent>
            </Card>
        </div>
    </div>
    );
}
