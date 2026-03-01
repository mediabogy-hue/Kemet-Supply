
'use client';

import { useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, where, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import type { Order } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable } from './_components/data-table';
import { getColumns } from './_components/columns';
import { PaymentDetailsDrawer } from './_components/payment-details-drawer';

export default function AdminPaymentsPage() {
    const firestore = useFirestore();
    const { toast } = useToast();

    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

    const paymentsQuery = useMemoFirebase(
        () => (firestore ? query(
            collection(firestore, 'orders'), 
            where('customerPaymentMethod', '!=', 'Cash on Delivery'),
            where('customerPaymentStatus', '==', 'Pending')
        ) : null),
        [firestore]
    );

    const { data: orders, isLoading, error } = useCollection<Order>(paymentsQuery);

    const handleStatusUpdate = async (order: Order, status: 'Verified' | 'Rejected') => {
        if (!firestore) return;
        const orderRef = doc(firestore, 'orders', order.id);
        toast({ title: `جاري تحديث حالة الدفع...` });
        try {
            const updateData: any = { 
                customerPaymentStatus: status, 
                updatedAt: serverTimestamp() 
            };
            if (status === 'Verified') {
                updateData.status = 'Confirmed';
                updateData.confirmedAt = serverTimestamp();
            }
            await updateDoc(orderRef, updateData);
            toast({ title: 'تم تحديث الحالة بنجاح!' });
            setSelectedOrder(null); // Close the drawer
        } catch (e) {
            console.error('Failed to update payment status:', e);
            toast({ variant: 'destructive', title: 'فشل تحديث الحالة' });
        }
    };

    const columns = useMemo(
        () => getColumns(setSelectedOrder),
        []
    );

    if (error) {
        return <p className="text-destructive">خطأ في تحميل الدفعات: {error.message}</p>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">تأكيد الدفع</h1>
                <p className="text-muted-foreground">مراجعة وتأكيد إثباتات الدفع المرسلة من العملاء.</p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>الدفعات قيد المراجعة</CardTitle>
                    <CardDescription>
                        {isLoading ? 'جاري التحميل...' : `لديك ${orders?.length || 0} دفعة في انتظار المراجعة.`}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-4">
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-20 w-full" />
                            <Skeleton className="h-20 w-full" />
                        </div>
                    ) : (
                        <DataTable columns={columns} data={orders || []} />
                    )}
                </CardContent>
            </Card>
            
            <PaymentDetailsDrawer
                order={selectedOrder}
                isOpen={!!selectedOrder}
                onOpenChange={(isOpen) => !isOpen && setSelectedOrder(null)}
                onStatusUpdate={handleStatusUpdate}
            />
        </div>
    );
}
