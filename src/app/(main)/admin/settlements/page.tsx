
'use client';

import { useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import type { Order } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable } from '@/app/(main)/admin/orders/_components/data-table';
import { getColumns } from './_components/columns';


export default function SettlementsPage() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [settlingOrderId, setSettlingOrderId] = useState<string | null>(null);

    const unsettledOrdersQuery = useMemoFirebase(
        () => (firestore ? query(
            collection(firestore, 'orders'),
            where('status', '==', 'Delivered'),
            where('isSettled', '!=', true)
        ) : null),
        [firestore]
    );

    const { data: orders, isLoading, error } = useCollection<Order>(unsettledOrdersQuery);
    
    const handleSettleOrder = async (order: Order) => {
        if (!firestore) return;

        setSettlingOrderId(order.id);
        toast({ title: `جاري تسوية أرباح الطلب #${order.id.substring(0, 5)}...` });
        
        try {
            await runTransaction(firestore, async (transaction) => {
                const orderRef = doc(firestore, 'orders', order.id);

                // Validation
                const orderTotalAmount = Number(order.totalAmount || 0);
                const orderDropshipperCommission = Number(order.totalCommission || 0);
                const orderPlatformFee = Number(order.platformFee || 0);
                if (isNaN(orderTotalAmount) || isNaN(orderDropshipperCommission) || isNaN(orderPlatformFee)) {
                    throw new Error(`بيانات الطلب المالية غير صالحة.`);
                }

                // 1. Settle for Dropshipper
                const dropshipperId = order.dropshipperId;
                if (typeof dropshipperId === 'string' && dropshipperId.trim() !== '' && orderDropshipperCommission > 0) {
                    const walletRef = doc(firestore, 'wallets', dropshipperId);
                    const walletDoc = await transaction.get(walletRef);
                    const currentBalance = walletDoc.data()?.availableBalance || 0;
                    const newBalance = currentBalance + orderDropshipperCommission;
                    transaction.set(walletRef, { id: dropshipperId, availableBalance: newBalance, updatedAt: serverTimestamp() }, { merge: true });
                }

                // 2. Settle for Merchant
                const merchantId = order.merchantId;
                if (typeof merchantId === 'string' && merchantId.trim() !== '') {
                    const merchantProfit = orderTotalAmount - orderDropshipperCommission - orderPlatformFee;
                     if (isNaN(merchantProfit)) {
                        throw new Error(`فشل حساب ربح التاجر.`);
                    }
                    if (merchantProfit > 0) {
                        const walletRef = doc(firestore, 'wallets', merchantId);
                        const walletDoc = await transaction.get(walletRef);
                        const currentBalance = walletDoc.data()?.availableBalance || 0;
                        const newBalance = currentBalance + merchantProfit;
                        transaction.set(walletRef, { id: merchantId, availableBalance: newBalance, updatedAt: serverTimestamp() }, { merge: true });
                    } else if (merchantProfit < 0) {
                         throw new Error(`ربح التاجر سالب (${merchantProfit.toFixed(2)}).`);
                    }
                }
                
                // 3. Mark order as settled
                transaction.update(orderRef, { isSettled: true, updatedAt: serverTimestamp() });
            });

            toast({
                title: '🎉 تمت التسوية بنجاح!',
                description: `تم إيداع الأرباح في المحافظ للطلب #${order.id.substring(0, 5)}.`,
            });
        } catch (e: any) {
             console.error(`FATAL: Financial settlement failed for order ${order.id}:`, e);
             toast({
                variant: 'destructive',
                title: 'فشل إتمام التسوية المالية',
                description: `للطلب #${order.id.substring(0, 5)}: ${e.message}`,
                duration: 10000,
            });
        } finally {
            setSettlingOrderId(null);
        }
    };
    
    const columns = useMemo(() => getColumns(handleSettleOrder, settlingOrderId), [settlingOrderId]);

    if (error) {
        return <p className="text-destructive">خطأ في تحميل الطلبات: {error.message}</p>;
    }
    
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">تسويات الأرباح</h1>
                <p className="text-muted-foreground">مراجعة وتوزيع أرباح الطلبات المكتملة على المسوقين والتجار.</p>
            </div>
             <Card>
                <CardHeader>
                    <CardTitle>طلبات بانتظار التسوية</CardTitle>
                    <CardDescription>
                        هذه الطلبات تم توصيلها وبانتظار توزيع أرباحها.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                         <div className="space-y-4">
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-20 w-full" />
                        </div>
                    ) : (
                        <DataTable columns={columns} data={orders || []} />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
