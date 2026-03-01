'use client';

import { useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useSession } from '@/auth/SessionProvider';
import { collection, query, where, doc, getDoc } from 'firebase/firestore'; // Removed orderBy
import type { Order, Shipment, Product } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable } from './_components/data-table';
import { ShipmentDetailsDrawer } from '@/components/shared/shipment-details-drawer';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { getDropshipperOrderColumns } from './_components/columns';


export default function MyOrdersPage() {
    const { user } = useSession();
    const firestore = useFirestore();
    const { toast } = useToast();
    const router = useRouter();

    const [orderToViewShipment, setOrderToViewShipment] = useState<Order | null>(null);
    const [shipmentDetails, setShipmentDetails] = useState<Shipment | null>(null);

    // Query without ordering to avoid needing a composite index
    const ordersQuery = useMemoFirebase(
        () => (firestore && user) ? query(
            collection(firestore, 'orders'),
            where('dropshipperId', '==', user.uid)
        ) : null,
        [firestore, user]
    );

    const { data: orders, isLoading, error } = useCollection<Order>(ordersQuery);

    // Sort the data on the client-side
    const sortedOrders = useMemo(() => {
        if (!orders) return [];
        return [...orders].sort((a, b) => {
            const dateA = a.createdAt?.toDate?.().getTime() || 0;
            const dateB = b.createdAt?.toDate?.().getTime() || 0;
            return dateB - dateA; // Sort descending
        });
    }, [orders]);


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
    
    const handleReorder = (product: Partial<Product>) => {
        router.push(`/orders/new?productId=${product.id}`);
    };

    const columns = useMemo(
        () => getDropshipperOrderColumns(handleViewShipment, handleReorder),
        [router]
    );

     if (error) {
        return <p className="text-destructive">خطأ في تحميل طلباتك: {error.message}</p>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">طلباتي</h1>
                    <p className="text-muted-foreground">عرض وتتبع جميع طلباتك التي قمت بإنشائها.</p>
                </div>
                <Button onClick={() => router.push('/orders/new')}>إنشاء طلب جديد</Button>
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
                        <DataTable columns={columns} data={sortedOrders} />
                    )}
                </CardContent>
            </Card>

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
