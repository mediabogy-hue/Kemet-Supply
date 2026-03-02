'use client';

import { useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, runTransaction, serverTimestamp, increment, orderBy, limit, DocumentReference, DocumentSnapshot } from 'firebase/firestore';
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
            // === Start of Firestore Transaction ===
            await runTransaction(firestore, async (transaction) => {
                // 1. READ the order document first. This is mandatory for any transaction.
                const orderRef = doc(firestore, 'orders', order.id);
                const freshOrderDoc = await transaction.get(orderRef);

                if (!freshOrderDoc.exists() || freshOrderDoc.data().isSettled === true) {
                    throw new Error(`تمت تسوية هذا الطلب بالفعل أو لم يعد موجودًا.`);
                }
                
                const freshOrderData = freshOrderDoc.data() as Order;

                // 2. DEFINE all financial values from the FRESH, RELIABLE order data.
                const orderTotalAmount = Number(freshOrderData.totalAmount || 0);
                const dropshipperCommission = Number(freshOrderData.totalCommission || 0);
                
                // DEFENSIVE CALCULATION: If platformFee is missing or 0 on an old order, calculate it.
                let platformFee = Number(freshOrderData.platformFee || 0);
                if (platformFee === 0 && orderTotalAmount > 0) {
                    platformFee = orderTotalAmount * 0.05;
                }

                // THE CORRECT and FINAL calculation for merchant profit.
                const merchantProfit = orderTotalAmount - dropshipperCommission - platformFee;

                const dropshipperId = freshOrderData.dropshipperId;
                const merchantId = freshOrderData.merchantId;

                // 3. READ all wallet documents that will be written to. This is a transaction requirement.
                const dropshipperWalletRef = doc(firestore, 'wallets', dropshipperId);
                const dropshipperWalletDoc = await transaction.get(dropshipperWalletRef);

                let merchantWalletRef: DocumentReference | null = null;
                let merchantWalletDoc: DocumentSnapshot | null = null;
                // Only proceed with merchant if the ID is valid.
                if (merchantId && typeof merchantId === 'string' && merchantId.length > 0) {
                    merchantWalletRef = doc(firestore, 'wallets', merchantId);
                    merchantWalletDoc = await transaction.get(merchantWalletRef);
                }

                // 4. PERFORM ALL WRITES.
                // All reads are complete. Now we can safely perform all write operations.

                // A. Update the order to mark it as settled.
                transaction.update(orderRef, { 
                    isSettled: true, 
                    settledAt: serverTimestamp(),
                    updatedAt: serverTimestamp() 
                });

                // B. Settle dropshipper commission robustly.
                if (dropshipperCommission > 0) {
                    if (dropshipperWalletDoc.exists()) {
                        transaction.update(dropshipperWalletRef, { 
                            availableBalance: increment(dropshipperCommission),
                            updatedAt: serverTimestamp() 
                        });
                    } else {
                        // Create a new, complete wallet if it doesn't exist
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

                // C. Settle merchant profit robustly.
                if (merchantWalletRef && merchantProfit > 0) {
                     if (merchantWalletDoc && merchantWalletDoc.exists()) {
                        transaction.update(merchantWalletRef, { 
                            availableBalance: increment(merchantProfit),
                            updatedAt: serverTimestamp() 
                        });
                    } else {
                        // Create a new, complete wallet if it doesn't exist
                        transaction.set(merchantWalletRef, {
                            id: merchantId!,
                            availableBalance: merchantProfit,
                            pendingBalance: 0,
                            pendingWithdrawals: 0,
                            totalWithdrawn: 0,
                            updatedAt: serverTimestamp(),
                        });
                    }
                }
            });
            // === End of Firestore Transaction ===

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
