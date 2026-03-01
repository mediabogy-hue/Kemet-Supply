'use client';
import { useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useSession } from "@/auth/SessionProvider";
import { useCollection, useDoc, useMemoFirebase, useFirestore } from "@/firebase";
import type { Order, Product, Wallet } from "@/lib/types";
import { collection, query, where, orderBy, limit, doc } from "firebase/firestore";
import { Skeleton } from '@/components/ui/skeleton';
import { Box, ShoppingCart, Activity, Wallet as WalletIcon, Package, PackageX, PlusCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { OrderStatusBadge } from '@/app/(main)/merchant/orders/_components/order-status-badge';
import { Button } from '@/components/ui/button';

export default function MerchantDashboardPage() {
  const { profile, user } = useSession();
  const firestore = useFirestore();

  // === QUERIES ===
  const productsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
        collection(firestore, "products"),
        where("merchantId", "==", user.uid)
    );
  }, [firestore, user]);

  const ordersQuery = useMemoFirebase(() => {
      if (!firestore || !user) return null;
      return query(
          collection(firestore, "orders"),
          where("merchantId", "==", user.uid),
          orderBy("createdAt", "desc"),
          limit(20)
      );
  }, [firestore, user]);

  const walletRef = useMemoFirebase(() => (firestore && user) ? doc(firestore, 'wallets', user.uid) : null, [firestore, user]);

  // === DATA FETCHING ===
  const { data: products, isLoading: productsLoading } = useCollection<Product>(productsQuery);
  const { data: orders, isLoading: ordersLoading } = useCollection<Order>(ordersQuery);
  const { data: wallet, isLoading: walletLoading } = useDoc<Wallet>(walletRef);
  
  const overallLoading = productsLoading || ordersLoading || walletLoading;

  // === STATS & DATA CALCULATION ===
  const stats = useMemo(() => {
      if (!products || !orders) return { totalProducts: 0, totalSales: 0, pendingOrders: 0, outOfStockCount: 0 };
      
      const totalProducts = products.length;
      const outOfStockCount = products.filter(p => p.stockQuantity === 0).length;
      
      const totalSales = orders.reduce((sum, order) => {
          return (order.status === 'Delivered') ? sum + order.totalAmount : sum;
      }, 0);
      
      const pendingOrders = orders.filter(o => o.status === 'Pending').length;
      
      return { totalProducts, totalSales, pendingOrders, outOfStockCount };
  }, [products, orders]);

  const recentOrders = useMemo(() => {
    return orders?.slice(0, 5) || [];
  }, [orders]);


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">
            مرحباً بك، {profile?.firstName || 'التاجر'}!
            </h1>
            <p className="text-muted-foreground">
            نظرة عامة على منتجاتك ومبيعاتك.
            </p>
        </div>
         <div className="flex items-center gap-2">
            <Button asChild variant="outline"><Link href="/merchant/orders"><ShoppingCart /> متابعة الطلبات</Link></Button>
            <Button asChild><Link href="/merchant/products"><PlusCircle /> إضافة منتج جديد</Link></Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">الرصيد القابل للسحب</CardTitle>
                  <WalletIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                  {overallLoading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold">{(wallet?.availableBalance || 0).toFixed(2)} ج.م</div>}
                  <p className="text-xs text-muted-foreground">الأرباح الجاهزة للسحب الآن.</p>
              </CardContent>
          </Card>
           <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">إجمالي المبيعات المكتملة</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                  {overallLoading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold">{stats.totalSales.toFixed(2)} ج.م</div>}
                  <p className="text-xs text-muted-foreground">من الطلبات التي تم توصيلها</p>
              </CardContent>
          </Card>
           <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">إجمالي منتجاتي</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                  {overallLoading ? <Skeleton className="h-8 w-1/4" /> : <div className="text-2xl font-bold">{stats.totalProducts}</div>}
                  <p className="text-xs text-muted-foreground">عدد المنتجات التي قمت بإضافتها</p>
              </CardContent>
          </Card>
          <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">منتجات نفدت كميتها</CardTitle>
                  <PackageX className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                  {overallLoading ? <Skeleton className="h-8 w-1/4" /> : <div className="text-2xl font-bold">{stats.outOfStockCount}</div>}
                  <p className="text-xs text-muted-foreground">منتجات تحتاج لإعادة توفير مخزون</p>
              </CardContent>
          </Card>
      </div>

      <Card>
        <CardHeader>
            <CardTitle>آخر الطلبات على منتجاتك</CardTitle>
            <CardDescription>
                آخر 5 طلبات تحتاج لمتابعتك.
            </CardDescription>
        </CardHeader>
        <CardContent>
            {overallLoading ? (
                <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                </div>
            ) : recentOrders.length > 0 ? (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>الطلب</TableHead>
                            <TableHead>العميل</TableHead>
                            <TableHead>الحالة</TableHead>
                            <TableHead>التاريخ</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {recentOrders.map(order => (
                            <TableRow key={order.id}>
                                <TableCell>
                                    <div className="font-medium text-primary">#{order.id.substring(0, 7)}</div>
                                    <div className="text-xs text-muted-foreground">{order.productName}</div>
                                </TableCell>
                                <TableCell>{order.customerName}</TableCell>
                                <TableCell><OrderStatusBadge status={order.status} /></TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                    {order.createdAt?.toDate ? formatDistanceToNow(order.createdAt.toDate(), { addSuffix: true, locale: ar }) : 'N/A'}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            ) : (
                <p className="text-center text-muted-foreground py-8">لا توجد طلبات لعرضها حاليًا.</p>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
