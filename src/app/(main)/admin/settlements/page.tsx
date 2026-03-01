'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useFirestore } from '@/firebase';
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import type { Order } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable } from './_components/data-table';
import { getColumns } from './_components/columns';

export default function SettlementsPage() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [settlingOrderId, setSettlingOrderId] = useState<string | null>(null);

    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchPendingSettlements = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/settlements/pending');
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to fetch data from server.');
            }
            const data: any[] = await response.json();
            
            // Convert ISO strings back to Date objects for client-side processing
            const parsedData = data.map(order => ({
                ...order,
                createdAt: new Date(order.createdAt),
                updatedAt: new Date(order.updatedAt),
                deliveredAt: order.deliveredAt ? new Date(order.deliveredAt) : undefined,
                confirmedAt: order.confirmedAt ? new Date(order.confirmedAt) : undefined,
                shippedAt: order.shippedAt ? new Date(order.shippedAt) : undefined,
                returnedAt: order.returnedAt ? new Date(order.returnedAt) : undefined,
                canceledAt: order.canceledAt ? new Date(order.canceledAt) : undefined,
            }));

            setOrders(parsedData);
        } catch (e: any) {
            setError(e.message);
            toast({
                variant: 'destructive',
                title: 'فشل تحميل بيانات التسويات',
                description: e.message,
            });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchPendingSettlements();
    }, [fetchPendingSettlements]);

    
    const handleSettleOrder = async (order: Order) => {
        if (!firestore) return;

        setSettlingOrderId(order.id);
        
        try {
            await runTransaction(firestore, async (transaction) => {
                const orderRef = doc(firestore, 'orders', order.id);
                const orderDoc = await transaction.get(orderRef);

                if (!orderDoc.exists() || orderDoc.data().isSettled === true) {
                    throw new Error(`الطلب #${order.id.substring(0,5)} تم تسويته بالفعل أو غير موجود.`);
                }

                const orderData = orderDoc.data();
                const orderTotalAmount = Number(orderData.totalAmount || 0);
                const orderDropshipperCommission = Number(orderData.totalCommission || 0);
                const orderPlatformFee = Number(orderData.platformFee || 0);

                if (isNaN(orderTotalAmount) || isNaN(orderDropshipperCommission) || isNaN(orderPlatformFee)) {
                    throw new Error(`البيانات المالية للطلب #${order.id.substring(0,7)} غير صالحة.`);
                }
                
                const dropshipperId = orderData.dropshipperId;
                if (typeof dropshipperId === 'string' && dropshipperId.trim() !== '' && orderDropshipperCommission > 0) {
                    const walletRef = doc(firestore, 'wallets', dropshipperId);
                    const walletDoc = await transaction.get(walletRef);
                    
                    const currentBalance = Number(walletDoc.data()?.availableBalance);
                    if (walletDoc.exists() && !isNaN(currentBalance)) {
                        transaction.update(walletRef, { 
                            availableBalance: currentBalance + orderDropshipperCommission,
                            updatedAt: serverTimestamp() 
                        });
                    } else {
                        transaction.set(walletRef, {
                            id: dropshipperId,
                            availableBalance: orderDropshipperCommission,
                            pendingBalance: 0,
                            pendingWithdrawals: 0,
                            totalWithdrawn: 0,
                            updatedAt: serverTimestamp(),
                        }, { merge: true });
                    }
                }

                const merchantId = orderData.merchantId;
                if (typeof merchantId === 'string' && merchantId.trim() !== '') {
                    const merchantProfit = orderTotalAmount - orderDropshipperCommission - orderPlatformFee;
                    if (isNaN(merchantProfit)) {
                        throw new Error(`فشل حساب ربح التاجر للطلب #${order.id.substring(0,7)}.`);
                    }
                    if (merchantProfit < 0) {
                        throw new Error(`ربح التاجر سالب (${merchantProfit.toFixed(2)}) للطلب #${order.id.substring(0,7)}. لن تتم التسوية.`);
                    }
                    if (merchantProfit > 0) {
                        const walletRef = doc(firestore, 'wallets', merchantId);
                        const walletDoc = await transaction.get(walletRef);
                        
                        const currentBalance = Number(walletDoc.data()?.availableBalance);
                        if (walletDoc.exists() && !isNaN(currentBalance)) {
                            transaction.update(walletRef, { 
                                availableBalance: currentBalance + merchantProfit,
                                updatedAt: serverTimestamp() 
                            });
                        } else {
                            transaction.set(walletRef, {
                                id: merchantId,
                                availableBalance: merchantProfit,
                                pendingBalance: 0,
                                pendingWithdrawals: 0,
                                totalWithdrawn: 0,
                                updatedAt: serverTimestamp(),
                            }, { merge: true });
                        }
                    }
                }
                
                transaction.update(orderRef, { isSettled: true, updatedAt: serverTimestamp() });
            });

            toast({
                title: '🎉 تمت التسوية بنجاح!',
                description: `تم إيداع الأرباح في المحافظ للطلب #${order.id.substring(0, 5)}.`,
            });
            fetchPendingSettlements();
        } catch (e: any) {
             console.error(`FATAL: Financial settlement failed for order ${order.id}:`, e);
             toast({
                variant: 'destructive',
                title: 'فشل إتمام التسوية المالية',
                description: e.message,
                duration: 10000,
            });
        } finally {
            setSettlingOrderId(null);
        }
    };
    
    const columns = useMemo(() => getColumns(handleSettleOrder, settlingOrderId), [settlingOrderId]);

    if (error) {
        return (
          <div className="space-y-6">
              <div>
                  <h1 className="text-3xl font-bold tracking-tight">تسويات الأرباح</h1>
                  <p className="text-muted-foreground">مراجعة وتوزيع أرباح الطلبات المكتملة على المسوقين والتجار.</p>
              </div>
              <Card>
                <CardHeader>
                    <CardTitle className="text-destructive">خطأ في تحميل البيانات</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-destructive">فشل تحميل الطلبات: {error}</p>
                </CardContent>
            </Card>
          </div>
        );
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
