

'use client';
import dynamic from 'next/dynamic';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DollarSign, ShoppingCart, TrendingUp, TrendingDown, BarChart, ShieldAlert, DatabaseZap, CheckCircle, ListOrdered } from "lucide-react";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, Timestamp, orderBy, limit } from "firebase/firestore";
import type { Order } from "@/lib/types";
import { Skeleton, RefreshIndicator } from "@/components/ui/skeleton";
import { useMemo, useState, useEffect } from "react";
import { useSession } from '@/auth/SessionProvider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SeedDatabaseButton } from './_components/seed-database-button';


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
    const { user, isProductManager, isStaff, isLoading: isSessionLoading } = useSession();
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    const canAccess = !isSessionLoading && isStaff;
    
    const ordersQuery = useMemoFirebase(() => {
        if (!firestore || !canAccess) return null;
        
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        // Admin and other staff query the denormalized admin collection
        const baseQuery = query(
            collection(firestore, 'adminOrders'),
            where('createdAt', '>=', Timestamp.fromDate(thirtyDaysAgo)),
            orderBy('createdAt', 'desc')
        );

        if (isProductManager && user) {
            return query(baseQuery, where('merchantId', '==', user.uid), limit(1000));
        }

        return query(baseQuery, limit(1000));
    }, [firestore, canAccess, isProductManager, user]);

    const { data: allOrders, isLoading: ordersLoading, error: queryError, lastUpdated } = useCollection<Order>(ordersQuery);

    const isLoading = !isClient || isSessionLoading || ordersLoading;
    
    const dataIsEmpty = !isLoading && !queryError && (!allOrders || allOrders.length === 0);

    const dashboardStats = useMemo(() => {
        const initialStats = {
            totalRevenue: 0,
            averageTransactionValue: 0,
            deliveredOrdersCount: 0,
            salesByHourData: [] as any[],
            fastMovingProducts: [] as any[],
            slowMovingProducts: [] as any[],
        };

        if (!isClient || !allOrders) {
            return initialStats;
        }

        const deliveredOrders = allOrders.filter(o => o.status === 'Delivered');
        const revenue = deliveredOrders.reduce((sum, order) => sum + order.totalAmount, 0);
        const totalDeliveredOrdersCount = deliveredOrders.length;
        
        const calculatedAtv = totalDeliveredOrdersCount > 0 ? revenue / totalDeliveredOrdersCount : 0;
        
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const salesByHour = Array(24).fill(0).map((_, i) => ({ name: `${i}:00`, total: 0 }));
        allOrders.filter(o => o.createdAt && typeof o.createdAt.toDate === 'function' && o.createdAt.toDate() >= todayStart).forEach(order => {
            const hour = order.createdAt.toDate().getHours();
            salesByHour[hour].total += order.totalAmount;
        });
        
        const productSales = allOrders.reduce((acc, order) => {
            if (!acc[order.productId]) {
                acc[order.productId] = { name: order.productName, quantity: 0 };
            }
            acc[order.productId].quantity += order.quantity;
            return acc;
        }, {} as Record<string, { name: string, quantity: number }>);

        const sortedProducts = Object.values(productSales).sort((a, b) => b.quantity - a.quantity);
        const fastMovers = sortedProducts.slice(0, 5);
        const slowMovers = sortedProducts.slice(-5).reverse();
        
        return { 
            totalRevenue: revenue, 
            averageTransactionValue: calculatedAtv,
            deliveredOrdersCount: totalDeliveredOrdersCount,
            salesByHourData: salesByHour,
            fastMovingProducts: fastMovers,
            slowMovingProducts: slowMovers,
        };

      }, [allOrders, isClient]);

    const primaryStats = [
        { title: "إجمالي الإيرادات (آخر 30 يوم)", value: `${dashboardStats.totalRevenue.toFixed(2)} ج.م`, icon: <DollarSign />, description: "من الطلبات المكتملة." },
        { title: "متوسط قيمة الطلب", value: `${dashboardStats.averageTransactionValue.toFixed(2)} ج.م`, icon: <ShoppingCart />, description: "متوسط قيمة كل طلب مكتمل." },
        { title: "الطلبات المكتملة (آخر 30 يوم)", value: dashboardStats.deliveredOrdersCount, icon: <CheckCircle />, description: "إجمالي الطلبات التي تم توصيلها بنجاح." },
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
                    <ShieldAlert className="h-4 w-4" />
                    <AlertTitle>خطأ في جلب البيانات</AlertTitle>
                    <AlertDescription>
                        لم نتمكن من تحميل بيانات لوحة التحكم. قد يكون السبب عدم وجود فهرس (index) في قاعدة البيانات. الرجاء التحقق من الـ Console في المتصفح، قد تجد رابطًا مباشرًا لإنشاء الفهرس المطلوب.
                         <p className="mt-2 text-xs font-mono">{queryError.message}</p>
                    </AlertDescription>
                </Alert>
            )}

            {dataIsEmpty && (
                <Alert>
                    <DatabaseZap className="h-4 w-4" />
                    <AlertTitle>مرحباً بك في لوحة التحكم!</AlertTitle>
                    <AlertDescription>
                       يبدو أن قاعدة بياناتك فارغة. لبدء استكشاف لوحة التحكم، يمكنك ملء النظام ببيانات تجريبية.
                        <div className="mt-4">
                            <SeedDatabaseButton />
                        </div>
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
            
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><BarChart className="text-muted-foreground"/> المبيعات خلال اليوم</CardTitle>
                    <CardDescription>إجمالي المبيعات المحققة كل ساعة على مدار اليوم الحالي.</CardDescription>
                </CardHeader>
                <CardContent className="ps-2">
                    <SalesByHourChart data={dashboardStats.salesByHourData} />
                </CardContent>
            </Card>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ProductPerformanceTable title="المنتجات الأسرع مبيعًا" icon={<TrendingUp className="text-green-400"/>} products={dashboardStats.fastMovingProducts}/>
                <ProductPerformanceTable title="المنتجات الأبطأ مبيعًا" icon={<TrendingDown className="text-red-400"/>} products={dashboardStats.slowMovingProducts}/>
            </div>
        </div>
    );
}

    

    


