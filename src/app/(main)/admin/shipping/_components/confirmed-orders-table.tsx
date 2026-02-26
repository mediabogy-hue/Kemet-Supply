
'use client';
import { useState } from 'react';
import type { Order } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Truck } from 'lucide-react';
import { format } from 'date-fns';
import { BostaManualShipmentDialog } from '../../orders/_components/bosta-manual-shipment-dialog';

interface ConfirmedOrdersTableProps {
    orders: Order[];
    isLoading: boolean;
    onShipmentCreated?: () => void;
}

export function ConfirmedOrdersTable({ orders, isLoading, onShipmentCreated }: ConfirmedOrdersTableProps) {
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

    if (isLoading) {
        return <div>Loading...</div>; // Add skeleton later
    }

    if (orders.length === 0) {
        return <div className="text-center py-8 text-muted-foreground">لا توجد طلبات مؤكدة جاهزة للشحن حاليًا.</div>;
    }
    
    return (
        <>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>رقم الطلب</TableHead>
                        <TableHead>العميل</TableHead>
                        <TableHead>المدينة</TableHead>
                        <TableHead>تاريخ التأكيد</TableHead>
                        <TableHead className="text-end">الإجراء</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {orders.map(order => (
                        <TableRow key={order.id}>
                            <TableCell className="font-medium">#{order.id.substring(0, 7).toUpperCase()}</TableCell>
                            <TableCell>{order.customerName}</TableCell>
                            <TableCell>{order.customerCity}</TableCell>
                            <TableCell>{order.confirmedAt ? format(order.confirmedAt.toDate(), 'yyyy/MM/dd') : 'N/A'}</TableCell>
                            <TableCell className="text-end">
                                <Button size="sm" onClick={() => setSelectedOrder(order)}>
                                    <Truck className="me-2 h-4 w-4" />
                                    إنشاء شحنة
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            <BostaManualShipmentDialog 
                order={selectedOrder}
                link="https://business.bosta.co/deliveries/create"
                isOpen={!!selectedOrder}
                onOpenChange={(isOpen) => {
                    if (!isOpen) {
                        setSelectedOrder(null);
                    }
                }}
                onShipmentCreated={onShipmentCreated}
            />
        </>
    );
}
