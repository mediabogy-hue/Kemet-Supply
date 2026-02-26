
'use client';

import { useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, where, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import type { Order } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useSession } from '@/auth/SessionProvider';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getMerchantOrderColumns } from './_components/columns';
import { DataTable } from '@/app/(main)/admin/orders/_components/data-table';


export default function MerchantOrdersPage() {
    const { firestore, user } = useSession();
    const { toast } = useToast();

    const ordersQuery = useMemoFirebase(
        () => (firestore && user) ? query(
            collection(firestore, "orders"),
            where("merchantId", "==", user.uid),
            orderBy("createdAt", "desc")
        ) : null,
        [firestore, user]
    );
    const { data: orders, isLoading, error } = useCollection<Order>(ordersQuery);
    
    const handleStatusUpdate = async (order: Order, status: Order['status']) => {
        if (!firestore) return;
        const orderRef = doc(firestore, 'orders', order.id);
        toast({ title: 'جاري تحديث حالة الطلب...' });
        try {
            const updateData: any = { status, updatedAt: serverTimestamp() };
            if (status === 'Confirmed') updateData.confirmedAt = serverTimestamp();

            await updateDoc(orderRef, updateData);
            // Success toast removed for better UX.
        } catch (e) {
            console.error('Failed to update order status:', e);
            toast({ variant: 'destructive', title: 'فشل تحديث الحالة' });
        }
    };
    
    const columns = useMemo(
        () => getMerchantOrderColumns(handleStatusUpdate),
        []
    );

     if (error) {
        return <p className="text-destructive">خطأ في تحميل الطلبات: {error.message}</p>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">طلبات منتجاتي</h1>
                <p className="text-muted-foreground">هنا تظهر الطلبات الخاصة بالمنتجات التي قمت بإضافتها.</p>
            </div>

            <Card>
                 <CardContent className="pt-6">
                    {isLoading ? (
                        <div className="space-y-4">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-64 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    ) : (
                        <DataTable columns={columns} data={orders || []} />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
