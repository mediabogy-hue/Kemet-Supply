
"use client";

import { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useFirestore, errorEmitter, FirestorePermissionError, useCollection, useMemoFirebase } from "@/firebase";
import { collection, doc, updateDoc, serverTimestamp, collectionGroup, query, deleteDoc, writeBatch } from "firebase/firestore";
import type { Payment } from "@/lib/types";
import { Skeleton, RefreshIndicator } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useSession } from '@/auth/SessionProvider';
import { DeletePaymentAlert } from './_components/delete-payment-alert';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';


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
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const { isAdmin, isFinanceManager, isLoading: isRoleLoading } = useSession();
  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [paymentToReject, setPaymentToReject] = useState<Payment | null>(null);

  const canAccess = isAdmin || isFinanceManager;
  
  const paymentsQuery = useMemoFirebase(() => (isRoleLoading || !firestore || !canAccess) ? null : query(collectionGroup(firestore, 'payments')), [firestore, canAccess, isRoleLoading]);

  const { data: allPayments, isLoading: paymentsLoading, error: paymentsError, setData: setAllPayments, lastUpdated } = useCollection<Payment>(paymentsQuery);

  const isLoading = isRoleLoading || paymentsLoading;
  const error = paymentsError;

  const payments = useMemo((): Payment[] => {
    if (!allPayments) return [];
    
    const sortedPayments = [...allPayments].sort((a, b) => (b.createdAt?.toDate?.()?.getTime() || 0) - (a.createdAt?.toDate?.()?.getTime() || 0));

    return sortedPayments;
  }, [allPayments]);

  const handleStatusUpdate = (payment: Payment, newStatus: 'Verified' | 'Rejected', notes?: string) => {
    if (!firestore || !allPayments) return;
    const paymentRef = doc(firestore, `users/${payment.dropshipperId}/payments/${payment.id}`);
    const orderRef = doc(firestore, `users/${payment.dropshipperId}/orders/${payment.orderId}`);
    
    const batch = writeBatch(firestore);

    const paymentUpdateData: any = { status: newStatus, updatedAt: serverTimestamp() };
    if (notes) {
        paymentUpdateData.adminNotes = notes;
    }
    batch.update(paymentRef, paymentUpdateData);
    batch.update(orderRef, { customerPaymentStatus: newStatus, updatedAt: serverTimestamp() });

    // Optimistic UI update
    setAllPayments(prev => (prev || []).map(p => p.id === payment.id ? { ...p, status: newStatus, adminNotes: notes } : p));
    toast({ title: "تم تحديث حالة الدفعة" });

    batch.commit().catch(async (error) => {
        // Revert UI on error
        setAllPayments(allPayments);
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: `batch write for payment ${payment.id}`,
            operation: 'update',
            requestResourceData: { status: newStatus },
        }));
        toast({ variant: "destructive", title: "فشل تحديث الحالة", description: "قد لا تملك الصلاحيات الكافية." });
    });
  };

  const handleRejectSubmit = () => {
    if (paymentToReject) {
      handleStatusUpdate(paymentToReject, 'Rejected', rejectionReason);
      setPaymentToReject(null);
      setRejectionReason('');
    }
  }

  const handleDeletePayment = () => {
    if (!paymentToDelete || !firestore || !allPayments) return;
    
    const originalPayments = [...allPayments];
    setAllPayments(prev => (prev || []).filter(p => p.id !== paymentToDelete.id));
    toast({ title: "تم حذف سجل الدفع بنجاح" });

    const paymentRef = doc(firestore, `users/${paymentToDelete.dropshipperId}/payments/${paymentToDelete.id}`);
    
    deleteDoc(paymentRef)
        .catch(async (error) => {
            setAllPayments(originalPayments);
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: paymentRef.path,
                operation: 'delete',
            }));
            toast({ variant: "destructive", title: "فشل حذف سجل الدفع", description: "قد لا تملك الصلاحيات الكافية." });
        });
     setPaymentToDelete(null);
  };


  return (
    <>
      <Card>
          <CardHeader className="flex flex-row justify-between items-center">
              <div>
                <CardTitle>مراجعة دفعات الطلبات</CardTitle>
                <CardDescription>
                    مراجعة وتأكيد إثباتات الدفع المرسلة من المسوقين لقيمة الطلبات.
                </CardDescription>
              </div>
              <RefreshIndicator isLoading={isLoading} lastUpdated={lastUpdated} />
          </CardHeader>
          <CardContent>
              <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead>المسوق</TableHead>
                          <TableHead>رقم الطلب</TableHead>
                          <TableHead>هاتف الراسل</TableHead>
                          <TableHead>رقم العملية</TableHead>
                          <TableHead>التاريخ</TableHead>
                          <TableHead>الحالة</TableHead>
                          <TableHead className="text-end">المبلغ</TableHead>
                          <TableHead><span className="sr-only">Actions</span></TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {isLoading && Array.from({length: 5}).map((_, i) => (
                           <TableRow key={i}>
                              <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                              <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                              <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                              <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                              <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                              <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                              <TableCell className="text-end"><Skeleton className="h-5 w-20 ms-auto" /></TableCell>
                              <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                         </TableRow>
                      ))}
                      {payments.map((payment) => (
                      <TableRow key={payment.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => setSelectedPayment(payment)}>
                          <TableCell>{payment.dropshipperName || `مسوق غير معروف (${payment.dropshipperId.substring(0,5)})`}</TableCell>
                          <TableCell className="font-medium">{payment.orderId.substring(0,7).toUpperCase()}</TableCell>
                          <TableCell className="font-mono">{payment.senderPhoneNumber || 'N/A'}</TableCell>
                          <TableCell className="font-mono">{payment.referenceNumber || 'N/A'}</TableCell>
                          <TableCell>{payment.createdAt && typeof payment.createdAt.toDate === 'function' ? format(payment.createdAt.toDate(), 'yyyy-MM-dd') : 'N/A'}</TableCell>
                          <TableCell>
                              <Badge variant={statusVariant[payment.status] || 'secondary'}>
                                  {statusText[payment.status] || payment.status}
                              </Badge>
                          </TableCell>
                          <TableCell className="text-end">{payment.amount.toFixed(2)} ج.م</TableCell>
                          <TableCell className="text-end">
                              <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                  <Button aria-haspopup="true" size="icon" variant="ghost" onClick={(e) => e.stopPropagation()}>
                                      <MoreHorizontal className="h-4 w-4" />
                                      <span className="sr-only">Toggle menu</span>
                                  </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>الإجراءات</DropdownMenuLabel>
                                    {payment.status === 'Pending' && (
                                        <>
                                            <DropdownMenuItem onClick={() => handleStatusUpdate(payment, 'Verified')}>تأكيد الدفع</DropdownMenuItem>
                                            <DropdownMenuItem className="text-destructive" onClick={() => setPaymentToReject(payment)}>رفض الدفع</DropdownMenuItem>
                                        </>
                                    )}
                                    {isAdmin && (
                                        <>
                                            {payment.status === 'Pending' && <DropdownMenuSeparator />}
                                            <DropdownMenuItem className="text-destructive" onClick={() => setPaymentToDelete(payment)}>
                                                حذف
                                            </DropdownMenuItem>
                                        </>
                                    )}
                                  </DropdownMenuContent>
                              </DropdownMenu>
                          </TableCell>
                      </TableRow>
                      ))}
                       {(!isLoading && payments.length === 0) && (
                          <TableRow>
                              <TableCell colSpan={8} className="text-center">
                                  {error ? "فشل في تحميل دفعات الطلبات." : 'لا توجد دفعات من المسوقين لمراجعتها.'}
                              </TableCell>
                          </TableRow>
                      )}
                  </TableBody>
              </Table>
          </CardContent>
      </Card>
      <Dialog open={!!selectedPayment} onOpenChange={(open) => !open && setSelectedPayment(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
                تفاصيل الدفع للطلب #{selectedPayment?.orderId.substring(0, 7).toUpperCase()}
            </DialogTitle>
             <DialogDescription>
                تم تقديم هذه البيانات بواسطة المسوق لتأكيد الدفع.
            </DialogDescription>
          </DialogHeader>
          {selectedPayment && (
            <div className="py-4 space-y-4 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">المبلغ:</span><span className="font-bold text-primary">{selectedPayment.amount.toFixed(2)} ج.م</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">حالة الدفع:</span><Badge variant={statusVariant[selectedPayment.status]}>{statusText[selectedPayment.status]}</Badge></div>
                <div className="flex justify-between"><span className="text-muted-foreground">هاتف الراسل:</span><span className="font-mono">{selectedPayment.senderPhoneNumber || 'لم يحدد'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">رقم العملية:</span><span className="font-mono">{selectedPayment.referenceNumber || 'لم يحدد'}</span></div>
                {selectedPayment.adminNotes && <div className="flex flex-col gap-1 pt-2 border-t"><span className="text-muted-foreground">ملاحظات الأدمن:</span><p className="p-2 bg-muted rounded-md">{selectedPayment.adminNotes}</p></div>}
            </div>
          )}
        </DialogContent>
      </Dialog>
       <Dialog open={!!paymentToReject} onOpenChange={(isOpen) => !isOpen && setPaymentToReject(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>رفض إثبات الدفع</DialogTitle>
            <CardDescription>
              الرجاء كتابة سبب الرفض ليظهر للمسوق.
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
            <Button variant="ghost" onClick={() => setPaymentToReject(null)}>إلغاء</Button>
            <Button variant="destructive" onClick={handleRejectSubmit}>تأكيد الرفض</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <DeletePaymentAlert
        payment={paymentToDelete}
        isOpen={!!paymentToDelete}
        onOpenChange={(isOpen) => !isOpen && setPaymentToDelete(null)}
        onConfirm={handleDeletePayment}
      />
    </>
  );
}
