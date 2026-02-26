
'use client';
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useSession } from "@/auth/SessionProvider";
import { useCollection, useMemoFirebase } from "@/firebase";
import type { Order, Product } from "@/lib/types";
import { collection, query, where, orderBy, limit } from "firebase/firestore";
import { Skeleton } from '@/components/ui/skeleton';
import { Box, ShoppingCart, Activity } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { OrderStatusBadge } from '@/app/(main)/merchant/orders/_components/order-status-badge';

export default function MerchantDashboardPage() {
  const { profile, user, firestore } = useSession();

  // Fetch merchant's products
  const productsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
        collection(firestore, "products"),
        where("merchantId", "==", user.uid)
    );
  }, [firestore, user]);
  const { data: products, isLoading: productsLoading } = useCollection<Product>(productsQuery);

  // Fetch orders for merchant's products
  const ordersQuery = useMemoFirebase(() => {
      if (!firestore || !user) return null;
      return query(
          collection(firestore, "orders"),
          where("merchantId", "==", user.uid),
          orderBy("createdAt", "desc"),
          limit(20) // Limit for dashboard performance
      );
  }, [firestore, user]);
  const { data: orders, isLoading: ordersLoading } = useCollection<Order>(ordersQuery);

  const stats = useMemo(() => {
      if (productsLoading || ordersLoading) return { totalProducts: 0, totalSales: 0, pendingOrders: 0 };
      
      const totalProducts = products?.length || 0;
      
      const totalSales = orders?.reduce((sum, order) => {
          return (order.status === 'Delivered') ? sum + order.totalAmount : sum;
      }, 0) || 0;
      
      const pendingOrders = orders?.filter(o => o.status === 'Pending').length || 0;
      
      return { totalProducts, totalSales, pendingOrders };
  }, [products, orders, productsLoading, ordersLoading]);

  const recentOrders = useMemo(() => {
    return orders?.slice(0, 5) || [];
  }, [orders]);


  const isLoading = productsLoading || ordersLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          مرحباً بك، {profile?.firstName || 'التاجر'}!
        </h1>
        <p className="text-muted-foreground">
          نظرة عامة على منتجاتك ومبيعاتك.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">إجمالي منتجاتي</CardTitle>
                  <Box className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                  {isLoading ? <Skeleton className="h-8 w-1/4" /> : <div className="text-2xl font-bold">{stats.totalProducts}</div>}
                  <p className="text-xs text-muted-foreground">عدد المنتجات التي قمت بإضافتها</p>
              </CardContent>
          </Card>
          <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">إجمالي المبيعات المكتملة</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                  {isLoading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold">{stats.totalSales.toFixed(2)} ج.م</div>}
                  <p className="text-xs text-muted-foreground">من الطلبات التي تم توصيلها</p>
              </CardContent>
          </Card>
          <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">طلبات تحتاج تأكيد</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                  {isLoading ? <Skeleton className="h-8 w-1/4" /> : <div className="text-2xl font-bold">{stats.pendingOrders}</div>}
                  <p className="text-xs text-muted-foreground">طلبات جديدة في انتظار تأكيدك</p>
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
            {isLoading ? (
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
