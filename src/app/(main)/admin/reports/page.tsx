
'use client';

import { useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, collectionGroup, orderBy, documentId } from "firebase/firestore";
import type { Order, UserProfile, Product } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Printer, DollarSign, ShoppingCart, Users, Package, TrendingUp } from "lucide-react";
import { useSession } from '@/auth/SessionProvider';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


const StatCard = ({ title, value, icon, isLoading }: { title: string, value: string | number, icon: React.ReactNode, isLoading: boolean }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            {icon}
        </CardHeader>
        <CardContent>
            {isLoading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{value}</div>}
        </CardContent>
    </Card>
);

const ReportSection = ({ title, description, children, handlePrint }: { title: string, description: string, children: React.ReactNode, handlePrint?: () => void }) => (
    <Card>
        <CardHeader>
            <div className="flex items-center justify-between">
                <div>
                    <CardTitle>{title}</CardTitle>
                    <CardDescription className="no-print">{description}</CardDescription>
                </div>
                {handlePrint && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" onClick={handlePrint} className="no-print">
                            <Printer className="me-2 h-4 w-4" />
                            طباعة / تحميل PDF
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>للحفظ كملف PDF، اختر "Save as PDF" من نافذة الطباعة.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
            </div>
        </CardHeader>
        <CardContent>
            {children}
        </CardContent>
    </Card>
);


export default function AdminReportsPage() {
    const { firestore } = useFirebase();
    const { isAdmin, isLoading: isRoleLoading } = useSession();

    const canAccess = !isRoleLoading && isAdmin;

    const usersQuery = useMemoFirebase(() => (firestore && canAccess) ? query(collection(firestore, 'users')) : null, [firestore, canAccess]);
    const ordersQuery = useMemoFirebase(() => (firestore && canAccess) ? query(collectionGroup(firestore, 'orders'), orderBy(documentId())) : null, [firestore, canAccess]);
    const productsQuery = useMemoFirebase(() => (firestore && canAccess) ? query(collection(firestore, 'products')) : null, [firestore, canAccess]);
    
    const { data: users, isLoading: usersLoading } = useCollection<UserProfile>(usersQuery);
    const { data: orders, isLoading: ordersLoading } = useCollection<Order>(ordersQuery);
    const { data: products, isLoading: productsLoading } = useCollection<Product>(productsQuery);

    const isLoading = isRoleLoading || usersLoading || ordersLoading || productsLoading;
    
    const reportsData = useMemo(() => {
        const initialState = {
            totalRevenue: 0,
            totalOrders: 0,
            avgOrderValue: 0,
            topProducts: [] as { name: string, quantity: number, revenue: number }[],
            topMarketers: [] as { id: string; name: string; orderCount: number; totalSales: number; totalCommission: number }[],
            marketersData: [] as { id: string; name: string; orderCount: number; totalSales: number; totalCommission: number }[],
            inventoryData: {
                totalValue: 0,
                totalUnits: 0,
                products: [] as Product[]
            }
        };

        if (!orders || !users || !products) return initialState;

        const usersMap = new Map<string, UserProfile>();
        users.forEach(user => usersMap.set(user.id, user));
        
        const deliveredOrders = orders.filter(o => o.status === 'Delivered');
        const totalRevenue = deliveredOrders.reduce((sum, order) => sum + order.totalAmount, 0);
        const totalOrders = orders.length;
        const avgOrderValue = deliveredOrders.length > 0 ? totalRevenue / deliveredOrders.length : 0;

        const productSales = deliveredOrders.reduce((acc, order) => {
            if (!acc[order.productId]) {
                acc[order.productId] = { name: order.productName, quantity: 0, revenue: 0 };
            }
            acc[order.productId].quantity += order.quantity;
            acc[order.productId].revenue += order.totalAmount;
            return acc;
        }, {} as Record<string, { name: string, quantity: number, revenue: number }>);

        const topProducts = Object.values(productSales).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

        const marketerSales = deliveredOrders.reduce((acc, order) => {
            const dropshipper = usersMap.get(order.dropshipperId);
            const name = dropshipper ? `${''}${dropshipper.firstName} ${''}${dropshipper.lastName}`.trim() : order.dropshipperName || 'مسوق غير معروف';

            if (!acc[order.dropshipperId]) {
                acc[order.dropshipperId] = { id: order.dropshipperId, name: name, orderCount: 0, totalSales: 0, totalCommission: 0 };
            }
            acc[order.dropshipperId].orderCount++;
            acc[order.dropshipperId].totalSales += order.totalAmount;
            acc[order.dropshipperId].totalCommission += order.totalCommission;
            return acc;
        }, {} as Record<string, { id: string; name: string; orderCount: number; totalSales: number; totalCommission: number }>);
        
        const marketersData = Object.values(marketerSales).sort((a, b) => b.totalSales - a.totalSales);
        const topMarketers = marketersData.slice(0, 10);

        const inventoryData = {
            totalValue: products.reduce((sum, p) => sum + (p.price * p.stockQuantity), 0),
            totalUnits: products.reduce((sum, p) => sum + p.stockQuantity, 0),
            products: products.sort((a,b) => b.stockQuantity - a.stockQuantity)
        };

        return { totalRevenue, totalOrders, avgOrderValue, topProducts, topMarketers, marketersData, inventoryData };

    }, [orders, users, products]);
    
    if (!isRoleLoading && !canAccess) {
        return (
            <Card>
                <CardHeader> <CardTitle>غير مصرح بالدخول</CardTitle> </CardHeader>
                <CardContent>
                    <Alert variant="destructive">
                        <ShieldAlert className="h-4 w-4" />
                        <AlertTitle>ليس لديك الصلاحية!</AlertTitle>
                        <AlertDescription> عفواً، ليس لديك الصلاحيات اللازمة للوصول إلى هذه الصفحة. </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }
    

    return (
        <div className="space-y-8">
            <div className="no-print">
                <h1 className="text-3xl font-bold tracking-tight">التقارير الشاملة</h1>
                <p className="text-muted-foreground">تحليلات مفصلة لأداء المبيعات، المسوقين، والمخزون.</p>
            </div>

            <Tabs defaultValue="sales" className="w-full">
                <TabsList className="grid w-full grid-cols-3 no-print">
                    <TabsTrigger value="sales">تقرير المبيعات</TabsTrigger>
                    <TabsTrigger value="marketers">تقرير المسوقين</TabsTrigger>
                    <TabsTrigger value="inventory">تقرير المخزون</TabsTrigger>
                </TabsList>
                <TabsContent value="sales">
                    <ReportSection title="تقرير المبيعات" description="نظرة عامة على أداء المبيعات والمنتجات والمسوقين." handlePrint={() => window.print()}>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 my-6">
                            <StatCard title="إجمالي الإيرادات (المكتملة)" value={`${''}${reportsData.totalRevenue.toFixed(2)} ج.م`} icon={<DollarSign />} isLoading={isLoading} />
                            <StatCard title="إجمالي الطلبات (كل الحالات)" value={reportsData.totalOrders} icon={<ShoppingCart />} isLoading={isLoading} />
                            <StatCard title="متوسط قيمة الطلب (المكتمل)" value={`${''}${reportsData.avgOrderValue.toFixed(2)} ج.م`} icon={<Users />} isLoading={isLoading} />
                        </div>
                        <div className="grid md:grid-cols-2 gap-8">
                            <Card>
                                <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp/> المنتجات الأكثر مبيعاً</CardTitle></CardHeader>
                                <CardContent><Table>
                                    <TableHeader><TableRow><TableHead>المنتج</TableHead><TableHead>الكمية</TableHead><TableHead>الإيرادات</TableHead></TableRow></TableHeader>
                                    <TableBody>{reportsData.topProducts.map(p => <TableRow key={p.name}><TableCell>{p.name}</TableCell><TableCell>{p.quantity}</TableCell><TableCell>{p.revenue.toFixed(2)} ج.م</TableCell></TableRow>)}</TableBody>
                                </Table></CardContent>
                            </Card>
                             <Card>
                                <CardHeader><CardTitle className="flex items-center gap-2"><Users/> المسوقين الأكثر مبيعاً</CardTitle></CardHeader>
                                <CardContent><Table>
                                    <TableHeader><TableRow><TableHead>المسوق</TableHead><TableHead>الطلبات</TableHead><TableHead>المبيعات</TableHead></TableRow></TableHeader>
                                    <TableBody>{reportsData.topMarketers.map(m => <TableRow key={m.id}><TableCell>{m.name}</TableCell><TableCell>{m.orderCount}</TableCell><TableCell>{m.totalSales.toFixed(2)} ج.م</TableCell></TableRow>)}</TableBody>
                                </Table></CardContent>
                            </Card>
                        </div>
                    </ReportSection>
                </TabsContent>
                <TabsContent value="marketers">
                     <ReportSection title="تقرير أداء المسوقين" description="تحليل أداء جميع المسوقين في المنصة." handlePrint={() => window.print()}>
                        <Table>
                            <TableHeader><TableRow><TableHead>المسوق</TableHead><TableHead>الطلبات المكتملة</TableHead><TableHead>إجمالي المبيعات</TableHead><TableHead>إجمالي الربح</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {isLoading && Array.from({length: 5}).map((_, i) => <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell></TableRow>)}
                                {reportsData.marketersData.map(m => (
                                <TableRow key={m.id}>
                                    <TableCell>{m.name}</TableCell>
                                    <TableCell>{m.orderCount}</TableCell>
                                    <TableCell>{m.totalSales.toFixed(2)} ج.م</TableCell>
                                    <TableCell className="font-semibold text-green-500">{m.totalCommission.toFixed(2)} ج.م</TableCell>
                                </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ReportSection>
                </TabsContent>
                <TabsContent value="inventory">
                     <ReportSection title="تقرير حالة المخزون" description="نظرة شاملة على حالة المخزون لجميع المنتجات." handlePrint={() => window.print()}>
                         <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2 my-6">
                            <StatCard title="إجمالي قيمة المخزون" value={`${''}${reportsData.inventoryData.totalValue.toFixed(2)} ج.م`} icon={<DollarSign />} isLoading={isLoading} />
                            <StatCard title="إجمالي عدد الوحدات" value={reportsData.inventoryData.totalUnits} icon={<Package />} isLoading={isLoading} />
                        </div>
                        <Table>
                            <TableHeader><TableRow><TableHead>المنتج</TableHead><TableHead>الكمية المتاحة</TableHead><TableHead>الحالة</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {isLoading && Array.from({length: 5}).map((_, i) => <TableRow key={i}><TableCell colSpan={3}><Skeleton className="h-8 w-full" /></TableCell></TableRow>)}
                                {reportsData.inventoryData.products.map(p => (
                                <TableRow key={p.id}>
                                    <TableCell className="flex items-center gap-4">
                                        <Image src={p.imageUrls?.[0] || 'https://placehold.co/40'} alt={p.name} width={40} height={40} className="rounded-sm" />
                                        {p.name}
                                    </TableCell>
                                    <TableCell>{p.stockQuantity}</TableCell>
                                    <TableCell>
                                        {p.stockQuantity === 0 ? <Badge variant="destructive">نفد</Badge> : p.stockQuantity < 5 ? <Badge variant="secondary">منخفض</Badge> : <Badge>متوفر</Badge>}
                                    </TableCell>
                                </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ReportSection>
                </TabsContent>
            </Tabs>
        </div>
    );
}

    