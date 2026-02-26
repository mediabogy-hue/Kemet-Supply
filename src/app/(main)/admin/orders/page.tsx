'use client';

import { useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import type { Order, Shipment } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getColumns } from './_components/columns';
import { DataTable } from './_components/data-table';
import { DeleteOrderAlert } from './_components/delete-order-alert';
import { BostaManualShipmentDialog } from './_components/bosta-manual-shipment-dialog';
import { ShipmentDetailsDrawer } from '@/components/shared/shipment-details-drawer';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminOrdersPage() {
    const firestore = useFirestore();
    const { toast } = useToast();

    // State for dialogs and drawers
    const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
    const [orderToShip, setOrderToShip] = useState<Order | null>(null);
    const [orderToViewShipment, setOrderToViewShipment] = useState<Order | null>(null);
    const [shipmentDetails, setShipmentDetails] = useState<Shipment | null>(null);

    // Fetch orders
    const ordersQuery = useMemoFirebase(
        () => (firestore ? query(collection(firestore, 'orders'), orderBy('createdAt', 'desc')) : null),
        [firestore]
    );
    const { data: orders, isLoading: ordersLoading, error: ordersError } = useCollection<Order>(ordersQuery);

    const handleStatusUpdate = async (order: Order, status: Order['status']) => {
        if (!firestore) return;
        const orderRef = doc(firestore, 'orders', order.id);
        toast({ title: 'جاري تحديث حالة الطلب...' });
        try {
            const updateData: any = { status, updatedAt: serverTimestamp() };
            if (status === 'Confirmed') updateData.confirmedAt = serverTimestamp();
            if (status === 'Shipped') updateData.shippedAt = serverTimestamp();
            if (status === 'Delivered') updateData.deliveredAt = serverTimestamp();
            if (status === 'Returned') updateData.returnedAt = serverTimestamp();
            if (status === 'Canceled') updateData.canceledAt = serverTimestamp();

            await updateDoc(orderRef, updateData);
            toast({ title: 'تم تحديث حالة الطلب بنجاح!' });
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
        } catch (e) {
            console.error("Failed to link shipment to order:", e);
        }
    }

    const handleDelete = async () => {
        if (!firestore || !orderToDelete) return;
        const orderRef = doc(firestore, 'orders', orderToDelete.id);
        toast({ title: 'جاري حذف الطلب...' });
        try {
            await deleteDoc(orderRef);
            toast({ title: 'تم حذف الطلب بنجاح' });
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
            const docSnap = await (await import('firebase/firestore')).getDoc(shipmentRef);
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
        // This is a simplified refresh. For a more robust solution, you'd re-fetch data.
        // For now, we just close the dialog. The real-time listener will update the table.
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
                        <DataTable columns={columns} data={orders || []} />
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
