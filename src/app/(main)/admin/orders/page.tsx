
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, doc, updateDoc, deleteDoc, serverTimestamp, getDoc, writeBatch, increment, setDoc } from 'firebase/firestore';
import type { Order, Shipment } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getColumns } from './_components/columns';
import { DataTable } from './_components/data-table';
import { DeleteOrderAlert } from './_components/delete-order-alert';
import { BostaManualShipmentDialog } from './_components/bosta-manual-shipment-dialog';
import { ShipmentDetailsDrawer } from '@/components/shared/shipment-details-drawer';
import { Skeleton } from '@/components/ui/skeleton';
import { useSession } from '@/auth/SessionProvider';

export default function AdminOrdersPage() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const { isFinanceManager, isAdmin, isOrdersManager } = useSession();


    // State for dialogs and drawers
    const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
    const [orderToShip, setOrderToShip] = useState<Order | null>(null);
    const [orderToViewShipment, setOrderToViewShipment] = useState<Order | null>(null);
    const [shipmentDetails, setShipmentDetails] = useState<Shipment | null>(null);

    // Use real-time listener for orders
    const ordersQuery = useMemoFirebase(
        () => (firestore ? query(collection(firestore, 'orders')) : null),
        [firestore]
    );
    const { data: orders, isLoading: ordersLoading, error: ordersError } = useCollection<Order>(ordersQuery);

    // Sort on the client to avoid indexing issues
    const sortedOrders = useMemo(() => {
        if (!orders) return [];
        return [...orders].sort((a, b) => {
            const dateA = a.createdAt?.toDate?.().getTime() || 0;
            const dateB = b.createdAt?.toDate?.().getTime() || 0;
            return dateB - dateA;
        });
    }, [orders]);


    const handleStatusUpdate = async (order: Order, status: Order['status']) => {
        if (!firestore) return;

        const orderRef = doc(firestore, 'orders', order.id);
        toast({ title: `جاري تحديث حالة الطلب إلى ${status}...` });

        if (status === 'Delivered') {
            if (order.status === 'Delivered') {
                toast({ variant: 'destructive', title: 'الطلب تم توصيله بالفعل', description: 'لا يمكن توصيل الطلب مرتين.' });
                return;
            }

            try {
                const batch = writeBatch(firestore);

                // 1. Update order status
                batch.update(orderRef, { status: 'Delivered', deliveredAt: serverTimestamp(), updatedAt: serverTimestamp() });

                // 2. Settle Dropshipper's commission
                const dropshipperId = order.dropshipperId;
                const dropshipperCommission = Number(order.totalCommission || 0);

                if (!dropshipperId || typeof dropshipperId !== 'string' || dropshipperId.length < 5) {
                    throw new Error(`Invalid dropshipperId: ${dropshipperId}`);
                }
                if (isNaN(dropshipperCommission)) {
                    throw new Error(`Invalid dropshipper commission amount for order ${order.id}`);
                }

                if (dropshipperCommission !== 0) { // Only update if there is a commission
                    const dropshipperWalletRef = doc(firestore, 'wallets', dropshipperId);
                    batch.set(dropshipperWalletRef, {
                        availableBalance: increment(dropshipperCommission),
                        updatedAt: serverTimestamp()
                    }, { merge: true });
                }

                // 3. Settle Merchant's profit
                const merchantId = order.merchantId;
                if (merchantId && typeof merchantId === 'string' && merchantId.length > 5) {
                    const totalAmount = Number(order.totalAmount || 0);
                    const platformFee = Number(order.platformFee || 0);
                    
                    if (isNaN(totalAmount) || isNaN(platformFee)) {
                         throw new Error(`Invalid financial data for order ${order.id}. Amount: ${order.totalAmount}, Fee: ${order.platformFee}`);
                    }

                    const merchantProfit = totalAmount - dropshipperCommission - platformFee;
                    
                    if (isNaN(merchantProfit)) {
                        throw new Error(`Merchant profit calculation resulted in NaN for order ${order.id}`);
                    }

                    if (merchantProfit !== 0) { // Only update if there is a profit/loss
                        const merchantWalletRef = doc(firestore, 'wallets', merchantId);
                        batch.set(merchantWalletRef, {
                            availableBalance: increment(merchantProfit),
                            updatedAt: serverTimestamp()
                        }, { merge: true });
                    }
                }

                await batch.commit();

                toast({
                    title: '🎉 تم تأكيد التوصيل والتسوية المالية!',
                    description: `تم إيداع الأرباح في المحافظ.`,
                });

            } catch (e: any) {
                console.error("FATAL: Financial settlement failed for order:", order.id, e);
                toast({
                    variant: 'destructive',
                    title: 'فشل إتمام التسوية المالية',
                    description: `حدث خطأ فادح أثناء تحديث المحافظ. ${e.message}`,
                    duration: 10000,
                });
            }
            return;
        }

        // For any status other than Delivered, just update the order.
        try {
            const updateData: any = { status, updatedAt: serverTimestamp() };
            if (status === 'Confirmed') updateData.confirmedAt = serverTimestamp();
            if (status === 'Shipped') updateData.shippedAt = serverTimestamp();
            if (status === 'Returned') updateData.returnedAt = serverTimestamp();
            if (status === 'Canceled') updateData.canceledAt = serverTimestamp();

            await updateDoc(orderRef, updateData);
            // No need to update local state, useCollection handles it
            toast({ title: 'تم تحديث الحالة بنجاح.' });
        } catch (e) {
            console.error('Failed to update order status:', e);
            toast({ variant: 'destructive', title: 'فشل تحديث الحالة' });
        }
    };
    
    const handleShipmentCreated = async (orderId: string, shipmentId: string, trackingNumber: string) => {
        if (!firestore) return;
        const orderRef = doc(firestore, 'orders', orderId);
        try {
            await updateDoc(orderRef, {
                status: 'Ready to Ship',
                shipmentId: shipmentId,
                shipmentTrackingNumber: trackingNumber,
                updatedAt: serverTimestamp(),
            });
            setOrderToShip(null);
            // No need to update local state, useCollection handles it
        } catch (e) {
            console.error("Failed to link shipment to order:", e);
        }
    }

    const handleDelete = async () => {
        if (!firestore || !orderToDelete) return;
        const orderRef = doc(firestore, 'orders', orderToDelete.id);
        
        try {
            await deleteDoc(orderRef);
            // No need to update local state, useCollection handles it
            setOrderToDelete(null);
        } catch (e) {
            console.error('Failed to delete order:', e);
            toast({ variant: 'destructive', title: 'فشل حذف الطلب' });
        }
    };

    const handleViewShipment = async (order: Order) => {
        if (!firestore || !order.shipmentId) return;
        setOrderToViewShipment(order);
        try {
            const shipmentRef = doc(firestore, 'shipments', order.shipmentId);
            const docSnap = await getDoc(shipmentRef);
            if (docSnap.exists()) {
                setShipmentDetails(docSnap.data() as Shipment);
            } else {
                toast({ variant: 'destructive', title: 'الشحنة غير موجودة' });
                setOrderToViewShipment(null);
            }
        } catch (e) {
            console.error("Failed to fetch shipment details:", e);
            toast({ variant: 'destructive', title: 'فشل جلب تفاصيل الشحنة' });
            setOrderToViewShipment(null);
        }
    };

    const columns = useMemo(
        () => getColumns(handleStatusUpdate, (order) => setOrderToDelete(order), (order) => setOrderToShip(order), handleViewShipment),
        []
    );

    const onBostaDialogShipmentCreated = () => {
        setOrderToShip(null);
    }
    
    if (ordersError) {
        return (
            <Card>
                 <CardHeader>
                    <CardTitle>خطأ</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-destructive">فشل تحميل الطلبات. قد تكون هناك مشكلة في الصلاحيات.</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">إدارة الطلبات</h1>
                <p className="text-muted-foreground">عرض وتعديل وتتبع جميع طلبات العملاء.</p>
            </div>
            <Card>
                <CardContent className="pt-6">
                    {ordersLoading ? (
                        <div className="space-y-4">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-64 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    ) : (
                        <DataTable columns={columns} data={sortedOrders || []} />
                    )}
                </CardContent>
            </Card>

            <DeleteOrderAlert
                order={orderToDelete}
                isOpen={!!orderToDelete}
                onOpenChange={(isOpen) => !isOpen && setOrderToDelete(null)}
                onConfirm={handleDelete}
            />

            <BostaManualShipmentDialog
                order={orderToShip}
                link="https://business.bosta.co/deliveries/create"
                isOpen={!!orderToShip}
                onOpenChange={(isOpen) => !isOpen && setOrderToShip(null)}
                onShipmentCreated={onBostaDialogShipmentCreated}
            />
            
            <ShipmentDetailsDrawer 
                shipment={shipmentDetails}
                isOpen={!!orderToViewShipment}
                onOpenChange={(isOpen) => {
                    if (!isOpen) {
                        setOrderToViewShipment(null);
                        setShipmentDetails(null);
                    }
                }}
            />
        </div>
    );
}
