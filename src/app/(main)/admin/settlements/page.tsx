'use client';

import { useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, runTransaction, serverTimestamp, increment, orderBy, limit } from 'firebase/firestore';
import type { Order } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable } from './_components/data-table';
import { getColumns } from './_components/columns';
import { useSession } from '@/auth/SessionProvider';

export default function SettlementsPage() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const { isAdmin, isFinanceManager } = useSession();
    const [settlingOrderId, setSettlingOrderId] = useState<string | null>(null);

    const recentOrdersQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'orders'), orderBy('createdAt', 'desc'), limit(200));
    }, [firestore]);

    const { data: recentOrders, isLoading, error } = useCollection<Order>(recentOrdersQuery);

    const pendingSettlements = useMemo(() => {
        if (!recentOrders) return [];
        return recentOrders.filter(order => order.status === 'Delivered' && order.isSettled !== true);
    }, [recentOrders]);

    const handleSettleOrder = async (order: Order) => {
        if (!firestore) {
            toast({ variant: 'destructive', title: 'خطأ', description: 'خدمة قاعدة البيانات غير متاحة.' });
            return;
        }
        if (!isAdmin && !isFinanceManager) {
            toast({ variant: 'destructive', title: 'غير مصرح به', description: 'ليس لديك صلاحية لتنفيذ هذا الإجراء.' });
            return;
        }
        setSettlingOrderId(order.id);

        try {
            await runTransaction(firestore, async (transaction) => {
                const orderRef = doc(firestore, 'orders', order.id);
                const freshOrderDoc = await transaction.get(orderRef);

                if (!freshOrderDoc.exists() || freshOrderDoc.data().isSettled === true) {
                    throw new Error(`تمت تسوية الطلب #${order.id.substring(0,5)} بالفعل.`);
                }
                
                // Recalculate commissions to ensure correctness
                const orderUnitPrice = Number(order.unitPrice || 0);
                const orderQuantity = Number(order.quantity || 1);
                const orderTotalAmount = orderUnitPrice * orderQuantity;

                const dropshipperCommission = (orderUnitPrice * 0.0125) * orderQuantity;
                const platformFee = orderTotalAmount * 0.05;


                // 1. Mark order as settled
                transaction.update(orderRef, { isSettled: true, settledAt: serverTimestamp(), updatedAt: serverTimestamp() });

                // 2. Settle dropshipper commission (robustly)
                const dropshipperId = order.dropshipperId;
                if (dropshipperId && dropshipperCommission > 0) {
                    const dropshipperWalletRef = doc(firestore, 'wallets', dropshipperId);
                    const dropshipperWalletDoc = await transaction.get(dropshipperWalletRef);

                    if (dropshipperWalletDoc.exists()) {
                        transaction.update(dropshipperWalletRef, { 
                            availableBalance: increment(dropshipperCommission),
                            updatedAt: serverTimestamp() 
                        });
                    } else {
                        // Create wallet if it doesn't exist
                        transaction.set(dropshipperWalletRef, {
                            id: dropshipperId,
                            availableBalance: dropshipperCommission,
                            pendingBalance: 0,
                            pendingWithdrawals: 0,
                            totalWithdrawn: 0,
                            updatedAt: serverTimestamp(),
                        });
                    }
                }

                // 3. Settle merchant profit (robustly)
                const merchantId = order.merchantId;
                // Defensive check: Ensure merchantId is a valid non-empty string.
                if (merchantId && typeof merchantId === 'string' && merchantId.length > 0) {
                    const merchantProfit = orderTotalAmount - dropshipperCommission - platformFee;
                    
                    if (merchantProfit > 0) {
                        const merchantWalletRef = doc(firestore, 'wallets', merchantId);
                        const merchantWalletDoc = await transaction.get(merchantWalletRef);
                        
                        if (merchantWalletDoc.exists()) {
                             transaction.update(merchantWalletRef, { 
                                availableBalance: increment(merchantProfit),
                                updatedAt: serverTimestamp() 
                            });
                        } else {
                            // Create wallet if it doesn't exist
                            transaction.set(merchantWalletRef, {
                                id: merchantId,
                                availableBalance: merchantProfit,
                                pendingBalance: 0,
                                pendingWithdrawals: 0,
                                totalWithdrawn: 0,
                                updatedAt: serverTimestamp(),
                            });
                        }
                    }
                }
            });

            toast({
                title: '🎉 تمت التسوية بنجاح!',
                description: `تم إيداع الأرباح للطلب #${order.id.substring(0, 5)}.`,
            });

        } catch (e: any) {
             const errorMessage = e.message || "حدث خطأ غير متوقع أثناء محاولة تحديث قاعدة البيانات.";
             console.error(`FATAL: Client-side settlement transaction failed for order ${order.id}:`, e);
             toast({
                variant: 'destructive',
                title: 'فشل إتمام التسوية المالية',
                description: `الطلب: #${order.id.substring(0,5)}. السبب: ${errorMessage}`,
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
                    <p className="text-destructive">فشل تحميل الطلبات: {error.message}</p>
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
                        هذه الطلبات تم توصيلها وبانتظار توزيع أرباحها. يتم عرض آخر 200 طلب فقط.
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
                        <DataTable columns={columns} data={pendingSettlements} />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
