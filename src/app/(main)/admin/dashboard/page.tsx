'use client';
import dynamic from 'next/dynamic';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DollarSign, ShoppingCart, Users, TrendingUp, TrendingDown, Trophy, BarChart, AlertTriangle } from "lucide-react";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, collectionGroup, query, where, Timestamp, orderBy, documentId } from "firebase/firestore";
import type { Order, UserProfile, Product } from "@/lib/types";
import { Skeleton, RefreshIndicator } from "@/components/ui/skeleton";
import { useMemo, useState, useEffect } from "react";
import { useSession } from '@/auth/SessionProvider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


const RecentSales = dynamic(() => import("../../dashboard/_components/recent-sales").then(mod => mod.RecentSales), {
    loading: () => <div className="space-y-6">{Array.from({length: 5}).map((_, i) => <div className="flex items-center" key={i}><Skeleton className="h-10 w-10 rounded-full" /><div className="ms-4 space-y-2"><Skeleton className="h-4 w-[100px]" /><Skeleton className="h-3 w-[150px]" /></div><Skeleton className="ms-auto h-5 w-[60px]" /></div>)}</div>,
    ssr: false,
});

const SalesByHourChart = dynamic(() => import("./_components/sales-by-hour-chart").then(mod => mod.SalesByHourChart), {
    loading: () => <Skeleton className="h-[250px]" />,
    ssr: false,
});

const StatCard = ({ title, value, icon, description, isLoading }: { title: string, value: string | number, icon: React.ReactNode, description: string, isLoading: boolean }) => (
    <div className="flex-1 p-6 rounded-lg bg-card border">
        <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
            {icon}
        </div>
        <div>
            {isLoading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-3xl font-bold">{value}</div>}
            {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        </div>
    </div>
);

const ProductPerformanceTable = ({ title, products, icon }: { title: string, products: {name: string, quantity: number}[], icon: React.ReactNode }) => (
     <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
                {icon}
                {title}
            </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>المنتج</TableHead>
                        <TableHead className="text-end">الكمية المباعة</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {products.map((p, i) => (
                        <TableRow key={i}>
                            <TableCell className="font-medium">{p.name}</TableCell>
                            <TableCell className="text-end font-semibold">{p.quantity}</TableCell>
                        </TableRow>
                    ))}
                    {products.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={2} className="text-center text-muted-foreground py-4">لا توجد بيانات</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </CardContent>
    </Card>
);


export default function AdminDashboardPage() {
    const firestore = useFirestore();
    const { isAdmin, isLoading: isSessionLoading } = useSession();

    const canAccess = !isSessionLoading && isAdmin;
    
    const usersQuery = useMemoFirebase(() => (firestore && canAccess) ? collection(firestore, 'users') : null, [firestore, canAccess]);
    
    const ordersQuery = useMemoFirebase(() => (firestore && canAccess) 
        ? query(collectionGroup(firestore, 'orders'), orderBy(documentId()))
        : null, 
    [firestore, canAccess]);

    const productsQuery = useMemoFirebase(() => (firestore && canAccess) ? collection(firestore, 'products') : null, [firestore, canAccess]);

    const { data: allOrders, isLoading: ordersLoading, error: ordersError, lastUpdated: ordersLastUpdated } = useCollection<Order>(ordersQuery);
    const { data: users, isLoading: usersLoading, lastUpdated: usersLastUpdated } = useCollection<UserProfile>(usersQuery);
    const { data: products, isLoading: productsLoading, lastUpdated: productsLastUpdated } = useCollection<Product>(productsQuery);

    const isLoading = isSessionLoading || usersLoading || ordersLoading || productsLoading;
    const queryError = ordersError;

    const lastUpdated = useMemo(() => {
        const timestamps = [usersLastUpdated, ordersLastUpdated, productsLastUpdated].filter(Boolean) as Date[];
        if (timestamps.length === 0) return null;
        return new Date(Math.max(...timestamps.map(t => t.getTime())));
    }, [usersLastUpdated, ordersLastUpdated, productsLastUpdated]);

    const dashboardStats = useMemo(() => {
        const initialStats = {
            totalRevenue: 0,
            averageTransactionValue: 0,
            totalMarketers: 0,
            topPerformers: [] as any[],
            recentSales: [] as any[],
            salesByHourData: [] as any[],
            fastMovingProducts: [] as any[],
            slowMovingProducts: [] as any[],
        };

        if (!allOrders || !users || !products) {
            return initialStats;
        }

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        // This is a robust way to filter, checking if `toDate` is a function before calling it.
        // This prevents crashes if `createdAt` is a server timestamp placeholder.
        const recentOrders = allOrders.filter(o => o.createdAt && typeof o.createdAt.toDate === 'function' && o.createdAt.toDate() >= thirtyDaysAgo);

        const deliveredOrders = recentOrders.filter(o => o.status === 'Delivered');
        const revenue = deliveredOrders.reduce((sum, order) => sum + order.totalAmount, 0);
        const totalDeliveredOrdersCount = deliveredOrders.length;
        
        const calculatedAtv = totalDeliveredOrdersCount > 0 ? revenue / totalDeliveredOrdersCount : 0;
        
        const totalMarketersCount = users.filter(u => u.role === 'Dropshipper').length;

        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const salesByHour = Array(24).fill(0).map((_, i) => ({ name: `${i}:00`, total: 0 }));
        allOrders.filter(o => o.createdAt && typeof o.createdAt.toDate === 'function' && o.createdAt.toDate() >= todayStart).forEach(order => {
            const hour = order.createdAt.toDate().getHours();
            salesByHour[hour].total += order.totalAmount;
        });
        
        const productSales = recentOrders.reduce((acc, order) => {
            if (!acc[order.productId]) {
                acc[order.productId] = { name: order.productName, quantity: 0 };
            }
            acc[order.productId].quantity += order.quantity;
            return acc;
        }, {} as Record<string, { name: string, quantity: number }>);

        const sortedProducts = Object.values(productSales).sort((a, b) => b.quantity - a.quantity);
        const fastMovers = sortedProducts.slice(0, 5);
        const slowMovers = sortedProducts.slice(-5).reverse();
        
        const dropshipperSales = deliveredOrders.reduce((acc, order) => {
            const dropshipperId = order.dropshipperId;
            if (!acc[dropshipperId]) acc[dropshipperId] = { totalSales: 0, orderCount: 0 };
            acc[dropshipperId].totalSales += order.totalAmount;
            acc[dropshipperId].orderCount++;
            return acc;
        }, {} as Record<string, { totalSales: number, orderCount: number }>);

        const topPerformersData = Object.keys(dropshipperSales).map(id => {
            const user = users.find(u => u.id === id);
            if (!user) return null;
            const sales = dropshipperSales[id];
            return {
                 id: user!.id, 
                 name: `${user!.firstName} ${user!.lastName}`.trim(), 
                 email: `${sales.orderCount} طلبات مكتملة`, 
                 amount: `+${sales.totalSales.toFixed(2)} ج.م` 
            };
        }).filter(Boolean) as any[];
        
        const sortedTopPerformers = topPerformersData.sort((a, b) => parseFloat(b.amount.replace(/[^0-9.-]+/g,"")) - parseFloat(a.amount.replace(/[^0-9.-]+/g,""))).slice(0, 5);

        const sortedOrdersForRecents = [...allOrders].sort((a, b) => (b.createdAt?.toDate?.()?.getTime() || 0) - (a.createdAt?.toDate?.()?.getTime() || 0));
        const recentSalesData = sortedOrdersForRecents.slice(0, 5).map(order => ({ id: order.id, name: order.customerName, email: order.customerPhone, amount: `+${order.totalAmount.toFixed(2)} ج.م` }));

        return { 
            totalRevenue: revenue, 
            averageTransactionValue: calculatedAtv,
            totalMarketers: totalMarketersCount,
            topPerformers: sortedTopPerformers,
            recentSales: recentSalesData,
            salesByHourData: salesByHour,
            fastMovingProducts: fastMovers,
            slowMovingProducts: slowMovers,
        };

      }, [allOrders, users, products]);

    const primaryStats = [
        { title: "إجمالي الإيرادات (آخر 30 يوم)", value: `${dashboardStats.totalRevenue.toFixed(2)} ج.م`, icon: <DollarSign />, description: "من الطلبات المكتملة." },
        { title: "متوسط قيمة الطلب", value: `${dashboardStats.averageTransactionValue.toFixed(2)} ج.م`, icon: <ShoppingCart />, description: "متوسط قيمة كل طلب مكتمل." },
        { title: "إجمالي المسوقين", value: dashboardStats.totalMarketers, icon: <Users />, description: "إجمالي المسوقين في النظام." },
    ];
    
  return (
        <div className="flex flex-col gap-8">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">لوحة التحكم الشاملة</h1>
                    <p className="text-muted-foreground">نظرة عامة فورية على أداء المنصة.</p>
                </div>
                <RefreshIndicator isLoading={isLoading} lastUpdated={lastUpdated} />
            </div>
            
            {queryError && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>خطأ في جلب البيانات</AlertTitle>
                    <AlertDescription>
                        لم نتمكن من تحميل بيانات لوحة التحكم. قد يكون السبب عدم وجود فهرس (index) في قاعدة البيانات. 
                        الرجاء التحقق من الـ Console في المتصفح، قد تجد رابطًا مباشرًا لإنشاء الفهرس المطلوب.
                        <p className="mt-2 text-xs font-mono">{queryError.message}</p>
                    </AlertDescription>
                </Alert>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {primaryStats.map((stat, index) => (
                   <StatCard 
                    key={index} 
                    title={stat.title}
                    value={stat.value}
                    icon={stat.icon}
                    description={stat.description}
                    isLoading={isLoading}
                   />
                ))}
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <Card className="lg:col-span-3">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><BarChart className="text-muted-foreground"/> المبيعات خلال اليوم</CardTitle>
                        <CardDescription>إجمالي المبيعات المحققة كل ساعة على مدار اليوم الحالي.</CardDescription>
                    </CardHeader>
                    <CardContent className="ps-2">
                        <SalesByHourChart data={dashboardStats.salesByHourData} />
                    </CardContent>
                </Card>
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Trophy className="text-amber-400" />
                            أفضل المسوقين أداءً
                        </CardTitle>
                        <CardDescription>المسوقون الأعلى تحقيقًا للمبيعات المكتملة.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <RecentSales data={dashboardStats.topPerformers}/>
                    </CardContent>
                </Card>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ProductPerformanceTable title="المنتجات الأسرع مبيعًا" icon={<TrendingUp className="text-green-400"/>} products={dashboardStats.fastMovingProducts}/>
                <ProductPerformanceTable title="المنتجات الأبطأ مبيعًا" icon={<TrendingDown className="text-red-400"/>} products={dashboardStats.slowMovingProducts}/>
            </div>
            
             <Card>
                <CardHeader>
                    <CardTitle>أحدث عمليات البيع</CardTitle>
                </CardHeader>
                <CardContent>
                    <RecentSales data={dashboardStats.recentSales}/>
                </CardContent>
            </Card>
        </div>
    );
}
