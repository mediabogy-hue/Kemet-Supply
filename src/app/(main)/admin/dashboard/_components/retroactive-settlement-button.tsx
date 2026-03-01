'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useSession } from '@/firebase';
import { collection, query, where, getDocs, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { Loader2, History } from 'lucide-react';
import type { Order } from '@/lib/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"


export function RetroactiveSettlementButton() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const { isFinanceManager, isAdmin } = useSession();
    const [isLoading, setIsLoading] = useState(false);

    const handleSettleOldOrders = async () => {
        if (!firestore || (!isAdmin && !isFinanceManager)) {
            toast({ variant: 'destructive', title: 'غير مصرح به' });
            return;
        }

        setIsLoading(true);
        toast({ title: 'بدء تسوية الطلبات القديمة...', description: 'قد تستغرق هذه العملية بعض الوقت.' });

        let processedCount = 0;
        let errorCount = 0;
        let failedOrderErrors: string[] = [];

        try {
            const q = query(
                collection(firestore, "orders"),
                where("status", "==", "Delivered"),
                where("isSettled", "!=", true)
            );

            const querySnapshot = await getDocs(q);
            const ordersToSettle = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }) as Order);

            if (ordersToSettle.length === 0) {
                toast({ title: 'لا توجد طلبات قديمة لتسويتها', description: 'جميع الطلبات المكتملة مسواة بالفعل.' });
                setIsLoading(false);
                return;
            }

            for (const order of ordersToSettle) {
                try {
                    await runTransaction(firestore, async (transaction) => {
                        const orderRef = doc(firestore, 'orders', order.id);
                        
                        const orderTotalAmount = Number(order.totalAmount || 0);
                        const orderDropshipperCommission = Number(order.totalCommission || 0);
                        const orderPlatformFee = Number(order.platformFee || 0);

                        if (isNaN(orderTotalAmount) || isNaN(orderDropshipperCommission) || isNaN(orderPlatformFee)) {
                            throw new Error(`Order ${order.id} contains invalid financial data.`);
                        }

                        const dropshipperId = order.dropshipperId;
                        if (typeof dropshipperId !== 'string' || dropshipperId.trim() === '') {
                            throw new Error(`Order ${order.id} has an invalid or empty dropshipperId.`);
                        }

                        if (orderDropshipperCommission > 0) {
                            const dropshipperWalletRef = doc(firestore, 'wallets', dropshipperId);
                            const dropshipperWalletDoc = await transaction.get(dropshipperWalletRef);
                            const currentDropshipperBalance = Number(dropshipperWalletDoc.data()?.availableBalance || 0);
                            if (isNaN(currentDropshipperBalance)) {
                                throw new Error(`Dropshipper wallet ${dropshipperId} has an invalid balance.`);
                            }
                            transaction.set(dropshipperWalletRef, {
                                availableBalance: currentDropshipperBalance + orderDropshipperCommission,
                                updatedAt: serverTimestamp()
                            }, { merge: true });
                        }

                        const merchantId = order.merchantId;
                        if (typeof merchantId === 'string' && merchantId.trim() !== '') {
                            const merchantProfit = orderTotalAmount - orderDropshipperCommission - orderPlatformFee;
                            if (isNaN(merchantProfit)) {
                                throw new Error(`Merchant profit calculation failed for order ${order.id}.`);
                            }
                            
                            if (merchantProfit < 0) {
                                throw new Error(`Negative profit (${merchantProfit.toFixed(2)}) calculated.`);
                            }
                            
                            if (merchantProfit > 0) {
                                const merchantWalletRef = doc(firestore, 'wallets', merchantId);
                                const merchantWalletDoc = await transaction.get(merchantWalletRef);
                                const currentMerchantBalance = Number(merchantWalletDoc.data()?.availableBalance || 0);
                                if (isNaN(currentMerchantBalance)) {
                                    throw new Error(`Merchant wallet ${merchantId} has an invalid balance.`);
                                }
                                transaction.set(merchantWalletRef, {
                                    availableBalance: currentMerchantBalance + merchantProfit,
                                    updatedAt: serverTimestamp()
                                }, { merge: true });
                            }
                        }

                        transaction.update(orderRef, { isSettled: true, updatedAt: serverTimestamp() });
                    });
                    processedCount++;
                } catch (e: any) {
                    console.error(`Failed to settle order ${order.id}:`, e);
                    failedOrderErrors.push(`الطلب ${order.id.substring(0,5)}: ${e.message}`);
                    errorCount++;
                }
            }

            if (errorCount > 0) {
                toast({
                    variant: 'destructive',
                    title: `فشل تسوية ${errorCount} طلب`,
                    description: `تمت تسوية ${processedCount} طلب بنجاح. الأخطاء: ${failedOrderErrors.slice(0, 2).join(', ')}`,
                    duration: 10000,
                });
            } else {
                toast({
                    title: 'اكتملت التسوية بنجاح!',
                    description: `تمت تسوية ${processedCount} طلب.`,
                });
            }

        } catch (error: any) {
            console.error("Failed to query old orders:", error);
            toast({ variant: 'destructive', title: 'فشل جلب الطلبات القديمة', description: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                 <Button variant="secondary" disabled={isLoading}>
                    {isLoading ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <History className="me-2" />}
                    {isLoading ? 'جاري التسوية...' : 'تسوية الأرباح للطلبات القديمة'}
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                    <AlertDialogDescription>
                        سيقوم هذا الإجراء بمحاولة تسوية الأرباح لجميع الطلبات التي تم توصيلها سابقاً ولم تتم تسويتها بعد. قد تستغرق هذه العملية بعض الوقت ولا يمكن التراجع عنها.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSettleOldOrders}>نعم، قم بالتسوية</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
