
"use client";

import { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, AlertTriangle, Trash2, ShieldAlert } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useFirestore, errorEmitter, FirestorePermissionError, useCollection, useMemoFirebase } from "@/firebase";
import { collection, doc, updateDoc, serverTimestamp, query, orderBy, where } from "firebase/firestore";
import type { Order } from "@/lib/types";
import { Skeleton, RefreshIndicator } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useSession } from '@/auth/SessionProvider';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { DeletePaymentAlert } from './_components/delete-payment-alert';


const statusVariant: { [key: string]: "default" | "secondary" | "destructive" } = {
  Verified: "default",
  Pending: "secondary",
  Rejected: "destructive",
};

const statusText: { [key: string]: string } = {
  Pending: "قيد المراجعة",
  Verified: "مؤكد",
  Rejected: "مرفوض",
};

export default function AdminPaymentsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const { isAdmin, isFinanceManager, isLoading: isRoleLoading } = useSession();
  const [rejectionReason, setRejectionReason] = useState("");
  const [orderToReject, setOrderToReject] = useState<Order | null>(null);
  const [paymentToDelete, setPaymentToDelete] = useState<Order | null>(null);


  const canAccess = isAdmin || isFinanceManager;
  
  const allOrdersQuery = useMemoFirebase(() => {
    if (!firestore || !canAccess) return null;
    return query(collection(firestore, 'orders'), where('customerPaymentStatus', '==', 'Pending'));
  }, [firestore, canAccess]);

  const { data: allOrders, isLoading: ordersLoading, error: ordersError, setData: setAllOrders, lastUpdated } = useCollection<Order>(allOrdersQuery);

  const isLoading = isRoleLoading || ordersLoading;

  const orders = useMemo((): Order[] => {
    if (!allOrders) return [];
    return [...allOrders].sort((a, b) => (a.createdAt?.toDate?.()?.getTime() || 0) - (b.createdAt?.toDate?.()?.getTime() || 0));
  }, [allOrders]);

  const handleStatusUpdate = (order: Order, newStatus: 'Verified' | 'Rejected', notes?: string) => {
    if (!firestore) return;
    const orderRef = doc(firestore, `orders/${order.id}`);
    
    const updatedData: any = { customerPaymentStatus: newStatus, updatedAt: serverTimestamp() };
    if (notes) {
        updatedData.adminNotes = notes;
    }

    // Optimistic UI update
    setAllOrders(prev => {
      if (!prev) return null;
      return prev.map(o => o.id === order.id ? { ...o, customerPaymentStatus: newStatus } : o);
    });
    toast({ title: "تم تحديث حالة الدفع" });

    updateDoc(orderRef, updatedData).catch(async (error) => {
        // Revert UI on error
        setAllOrders(prev => {
            if (!prev) return null;
            return prev.map(o => o.id === order.id ? order : o); // Revert to original order
        });
        toast({ variant: "destructive", title: "فشل تحديث الحالة", description: "قد لا تملك الصلاحيات الكافية." });
    });
  };
  
   const handleDeletePayment = () => {
    if (!paymentToDelete || !firestore) return;

    const orderRef = doc(firestore, `orders/${paymentToDelete.id}`);
    
    // Resetting payment status instead of deleting the order.
    const updatedData = {
      customerPaymentStatus: null, // Using null to remove the field
      customerPaymentProof: null, // Using null to remove the field
      adminNotes: 'تم حذف إثبات الدفع بواسطة الأدمن'
    };

    setAllOrders(prev => {
      if (!prev) return null;
      // Filter out the order from the pending list
      return prev.filter(o => o.id !== paymentToDelete.id);
    });
    toast({ title: "تم حذف إثبات الدفع" });
    setPaymentToDelete(null);


    updateDoc(orderRef, updatedData).catch(err => {
      // Revert if error
      setAllOrders(prev => prev ? [...prev, paymentToDelete] : [paymentToDelete]);
       toast({ variant: "destructive", title: "فشل حذف إثبات الدفع" });
    });
  };

  const handleRejectSubmit = () => {
    if (orderToReject) {
      handleStatusUpdate(orderToReject, 'Rejected', rejectionReason);
      setOrderToReject(null);
      setRejectionReason('');
    }
  }

  return (
    <>
      <Card>
          <CardHeader className="flex flex-row justify-between items-center">
              <div>
                <CardTitle>تأكيد دفعات العملاء</CardTitle>
                <CardDescription>
                    مراجعة وتأكيد إثباتات الدفع المقدمة من العملاء للطلبات المدفوعة مسبقاً.
                </CardDescription>
              </div>
              <RefreshIndicator isLoading={isLoading} lastUpdated={lastUpdated} />
          </CardHeader>
          <CardContent>
              {ordersError && (
                <Alert variant="destructive" className="mb-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>خطأ في جلب البيانات</AlertTitle>
                    <AlertDescription>
                        لم نتمكن من تحميل قائمة الدفعات. قد يكون السبب عدم وجود صلاحيات كافية أو مشكلة في قاعدة البيانات.
                        <p className="mt-2 text-xs font-mono">{ordersError.message}</p>
                    </AlertDescription>
                </Alert>
              )}
              <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead>الطلب</TableHead>
                          <TableHead>المسوق</TableHead>
                          <TableHead>هاتف الراسل</TableHead>
                          <TableHead>رقم العملية</TableHead>
                          <TableHead>تاريخ الطلب</TableHead>
                          <TableHead className="text-end">المبلغ</TableHead>
                          <TableHead className="text-end">الإجراءات</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {isLoading && Array.from({length: 5}).map((_, i) => (
                           <TableRow key={i}>
                              <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                              <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                              <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                              <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                              <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                              <TableCell className="text-end"><Skeleton className="h-5 w-20 ms-auto" /></TableCell>
                              <TableCell><Skeleton className="h-8 w-24 ms-auto" /></TableCell>
                         </TableRow>
                      ))}
                      {orders.map((order) => (
                      <TableRow key={order.id} className="hover:bg-muted/50">
                          <TableCell className="font-medium cursor-pointer hover:underline" onClick={() => setSelectedOrder(order)}>{order.id.substring(0,7).toUpperCase()}</TableCell>
                          <TableCell>{order.dropshipperName || `مسوق غير معروف (${order.dropshipperId.substring(0,5)})`}</TableCell>
                          <TableCell className="font-mono">{order.customerPaymentProof?.senderPhoneNumber || 'N/A'}</TableCell>
                          <TableCell className="font-mono">{order.customerPaymentProof?.referenceNumber || 'N/A'}</TableCell>
                          <TableCell>{order.createdAt && typeof order.createdAt.toDate === 'function' ? format(order.createdAt.toDate(), 'yyyy-MM-dd') : 'N/A'}</TableCell>
                          <TableCell className="text-end">{order.totalAmount.toFixed(2)} ج.م</TableCell>
                          <TableCell className="text-end">
                              <div className="flex justify-end gap-2 items-center">
                                <Button variant="destructive" size="sm" onClick={(e) => { e.stopPropagation(); setOrderToReject(order); }}>رفض</Button>
                                <Button size="sm" onClick={(e) => { e.stopPropagation(); handleStatusUpdate(order, 'Verified'); }}>تأكيد</Button>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4"/></Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <DropdownMenuItem onClick={() => setSelectedOrder(order)}>عرض التفاصيل</DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="text-destructive" onClick={() => setPaymentToDelete(order)}>
                                            <Trash2 className="me-2"/>
                                            حذف إثبات الدفع
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                          </TableCell>
                      </TableRow>
                      ))}
                       {(!isLoading && orders.length === 0) && (
                          <TableRow>
                              <TableCell colSpan={7} className="text-center h-24">
                                  {ordersError ? "فشل في تحميل الطلبات." : 'لا توجد دفعات من العملاء لمراجعتها حاليًا.'}
                              </TableCell>
                          </TableRow>
                      )}
                  </TableBody>
              </Table>
          </CardContent>
      </Card>
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
                تفاصيل الدفع للطلب #{selectedOrder?.id.substring(0, 7).toUpperCase()}
            </DialogTitle>
             <DialogDescription>
                البيانات المقدمة من العميل لتأكيد الدفع.
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="py-4 space-y-4 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">المبلغ:</span><span className="font-bold text-primary">{selectedOrder.totalAmount.toFixed(2)} ج.م</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">حالة الدفع:</span><Badge variant={statusVariant[selectedOrder.customerPaymentStatus || '']}>{statusText[selectedOrder.customerPaymentStatus || '']}</Badge></div>
                <div className="flex justify-between"><span className="text-muted-foreground">هاتف الراسل:</span><span className="font-mono">{selectedOrder.customerPaymentProof?.senderPhoneNumber || 'لم يحدد'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">رقم العملية:</span><span className="font-mono">{selectedOrder.customerPaymentProof?.referenceNumber || 'لم يحدد'}</span></div>
                {selectedOrder.adminNotes && <div className="flex flex-col gap-1 pt-2 border-t"><span className="text-muted-foreground">ملاحظات الأدمن:</span><p className="p-2 bg-muted rounded-md">{selectedOrder.adminNotes}</p></div>}
            </div>
          )}
        </DialogContent>
      </Dialog>
       <Dialog open={!!orderToReject} onOpenChange={(isOpen) => !isOpen && setOrderToReject(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>رفض إثبات الدفع</DialogTitle>
            <CardDescription>
              الرجاء كتابة سبب الرفض ليظهر للمسوق والعميل.
            </CardDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="rejection-reason">سبب الرفض</Label>
            <Textarea
              id="rejection-reason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="مثال: الصورة غير واضحة، المبلغ غير صحيح..."
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOrderToReject(null)}>إلغاء</Button>
            <Button variant="destructive" onClick={handleRejectSubmit}>تأكيد الرفض</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
       <DeletePaymentAlert
        order={paymentToDelete}
        isOpen={!!paymentToDelete}
        onOpenChange={(isOpen) => !isOpen && setPaymentToDelete(null)}
        onConfirm={handleDeletePayment}
      />
    </>
  );
}
