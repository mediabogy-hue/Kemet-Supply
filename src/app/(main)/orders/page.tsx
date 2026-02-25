
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { File, Eye } from "lucide-react";
import Link from "next/link";
import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, where, collectionGroup } from "firebase/firestore";
import type { Order } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from 'date-fns';
import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { exportToExcel } from '@/lib/export';
import { cn } from "@/lib/utils";


const orderStatusVariant: { [key: string]: "default" | "secondary" | "destructive" | "outline" } = {
  Delivered: "default",
  Shipped: "outline",
  'Ready to Ship': 'outline',
  Pending: "secondary",
  Returned: "destructive",
  Confirmed: "default",
  Canceled: "destructive",
};

const orderStatusText: { [key: string]: string } = {
  Pending: "قيد الانتظار",
  Confirmed: "مؤكد",
  'Ready to Ship': 'جاهز للشحن',
  Shipped: "تم الشحن",
  Delivered: "تم التوصيل",
  Returned: "مرتجع",
  Canceled: "ملغي",
};

const orderStatusColorClass: { [key: string]: string } = {
    Delivered: "bg-green-500",
    Shipped: "bg-blue-500",
    'Ready to Ship': 'bg-sky-500',
    Pending: "bg-yellow-500",
    Returned: "bg-red-500",
    Confirmed: "bg-indigo-500",
    Canceled: "bg-gray-500",
};

const paymentStatusVariant: { [key: string]: "default" | "secondary" | "destructive" } = {
    Verified: "default",
    Pending: "secondary",
    Rejected: "destructive",
};
  
const paymentStatusText: { [key: string]: string } = {
    Pending: "قيد المراجعة",
    Verified: "مؤكد",
    Rejected: "مرفوض",
};

const paymentMethodText: { [key: string]: string } = {
  'Cash on Delivery': 'عند الاستلام',
  'Vodafone Cash': 'فودافون كاش',
  'InstaPay': 'انستا باي',
  'Telda': 'تيلدا',
  'Bank Transfer': 'تحويل بنكي',
};


export default function OrdersPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [activeTab, setActiveTab] = useState("all");

  const ordersQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collectionGroup(firestore, 'orders'),
      where('dropshipperId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, user]);

  const { data: orders, isLoading: ordersLoading } = useCollection<Order>(ordersQuery);

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    
    // No need to sort again, query already does it
    if (activeTab === "all") {
      return orders;
    }
    if (activeTab === "Returned") { // Combine Returned and Canceled
        return orders.filter(order => order.status === 'Returned' || order.status === 'Canceled');
    }
    return orders.filter(order => order.status === activeTab);
  }, [orders, activeTab]);

  const handleExport = () => {
      if (!filteredOrders) return;

      const dataToExport = filteredOrders.map(order => {
          const isCod = order.customerPaymentMethod === 'Cash on Delivery';

          let paymentStatus = 'N/A';
          if (isCod) {
              paymentStatus = 'عند الاستلام';
          } else if (order.customerPaymentStatus) {
              paymentStatus = paymentStatusText[order.customerPaymentStatus] || order.customerPaymentStatus;
          } else {
              paymentStatus = 'في انتظار الدفع';
          }

          return {
              id: order.id.substring(0,7).toUpperCase(),
              customerName: order.customerName,
              productName: order.productName,
              customerPaymentMethod: paymentMethodText[order.customerPaymentMethod] || order.customerPaymentMethod,
              createdAt: order.createdAt && typeof order.createdAt.toDate === 'function' ? format(order.createdAt.toDate(), 'yyyy-MM-dd') : 'N/A',
              orderStatus: orderStatusText[order.status] || order.status,
              paymentStatus: paymentStatus,
              totalAmount: order.totalAmount,
              totalCommission: order.totalCommission || 0,
          }
      });

      const headers = {
          id: 'رقم الطلب',
          customerName: 'العميل',
          productName: 'المنتج',
          customerPaymentMethod: 'طريقة الدفع',
          createdAt: 'التاريخ',
          orderStatus: 'حالة الطلب',
          paymentStatus: 'حالة الدفع',
          totalAmount: 'الإجمالي',
          totalCommission: 'ربحك',
      };
      
      exportToExcel(dataToExport, `My_Orders_${new Date().toISOString().split('T')[0]}`, 'Orders', headers);
  }


  const isLoading = ordersLoading;

  return (
    <>
        <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">متابعة الطلبات</h1>
            <p className="text-muted-foreground">تتبع جميع طلباتك وحالاتها من هنا.</p>
        </div>
      <Tabs defaultValue="all" onValueChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <TabsList>
            <TabsTrigger value="all">الكل</TabsTrigger>
            <TabsTrigger value="Pending">قيد الانتظار</TabsTrigger>
            <TabsTrigger value="Confirmed">مؤكد</TabsTrigger>
            <TabsTrigger value="Shipped">تم الشحن</TabsTrigger>
            <TabsTrigger value="Delivered">تم التوصيل</TabsTrigger>
            <TabsTrigger value="Returned">مرتجع/ملغي</TabsTrigger>
          </TabsList>
          <div className="ms-auto flex items-center gap-2">
              <Button size="sm" variant="outline" className="h-9 gap-1" onClick={handleExport} disabled={isLoading || !filteredOrders || filteredOrders.length === 0}>
                  <File className="h-4 w-4" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  تصدير
                  </span>
              </Button>
              <Button size="sm" className="h-9 gap-1" asChild>
                  <Link href="/orders/new">
                  إضافة طلب جديد
                  </Link>
              </Button>
          </div>
        </div>
        <TabsContent value={activeTab} className="mt-6">
          <Card>
              <CardContent className="p-0">
                  <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead>رقم الطلب</TableHead>
                              <TableHead>العميل</TableHead>
                              <TableHead>المنتج</TableHead>
                              <TableHead>التاريخ</TableHead>
                              <TableHead>حالة الطلب</TableHead>
                              <TableHead>حالة الدفع</TableHead>
                              <TableHead className="text-end">الإجمالي</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {isLoading && Array.from({length: 5}).map((_, i) => (
                             <TableRow key={i}>
                               <TableCell className="py-4"><Skeleton className="h-5 w-24" /></TableCell>
                               <TableCell className="py-4"><Skeleton className="h-5 w-32" /></TableCell>
                               <TableCell className="py-4"><Skeleton className="h-5 w-40" /></TableCell>
                               <TableCell className="py-4"><Skeleton className="h-5 w-28" /></TableCell>
                               <TableCell className="py-4"><Skeleton className="h-6 w-20" /></TableCell>
                               <TableCell className="py-4"><Skeleton className="h-6 w-20" /></TableCell>
                               <TableCell className="text-end py-4"><Skeleton className="h-5 w-20 ms-auto" /></TableCell>
                             </TableRow>
                          ))}
                          {filteredOrders?.map((order) => {
                            const isCod = order.customerPaymentMethod === 'Cash on Delivery';

                            return (
                              <TableRow key={order.id} className="hover:bg-muted/50">
                                  <TableCell className="font-medium py-4">{order.id.substring(0, 7).toUpperCase()}</TableCell>
                                  <TableCell className="py-4">{order.customerName}</TableCell>
                                  <TableCell className="py-4">{order.productName}</TableCell>
                                  <TableCell className="py-4">
                                    {order.createdAt && typeof order.createdAt.toDate === 'function' ? format(order.createdAt.toDate(), 'yyyy-MM-dd') : 'N/A'}
                                  </TableCell>
                                  <TableCell className="py-4">
                                      <Badge variant="outline" className="flex items-center gap-2">
                                        <span className={cn("h-2 w-2 rounded-full", orderStatusColorClass[order.status] || 'bg-gray-400')} />
                                        <span>{orderStatusText[order.status] || order.status}</span>
                                      </Badge>
                                  </TableCell>
                                  <TableCell className="py-4">
                                    {isCod ? (
                                        <Badge variant="outline">عند الاستلام</Badge>
                                    ) : order.customerPaymentStatus ? (
                                        <Badge variant={paymentStatusVariant[order.customerPaymentStatus] || 'secondary'}>
                                            {paymentStatusText[order.customerPaymentStatus] || order.customerPaymentStatus}
                                        </Badge>
                                    ) : (
                                        <Badge variant="destructive">في انتظار الدفع</Badge>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-end py-4">{order.totalAmount.toFixed(2)} ج.م</TableCell>
                              </TableRow>
                            );
                          })}
                          {(!isLoading && (!filteredOrders || filteredOrders.length === 0)) && (
                              <TableRow>
                                  <TableCell colSpan={7} className="h-24 text-center">ليس لديك أي طلبات في هذه الفئة.</TableCell>
                              </TableRow>
                          )}
                      </TableBody>
                  </Table>
              </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
