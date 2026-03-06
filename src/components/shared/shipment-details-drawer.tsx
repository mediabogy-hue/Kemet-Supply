'use client';

import { useMemo } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Printer, RefreshCw, Info } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, Timestamp } from 'firebase/firestore';
import type { Shipment, ShipmentEvent } from '@/lib/types';
import { format } from 'date-fns';

const statusText: { [key: string]: string } = {
  CREATED: 'تم الإنشاء',
  PICKUP_SCHEDULED: 'في انتظار المندوب',
  IN_TRANSIT: 'قيد النقل',
  OUT_FOR_DELIVERY: 'خرجت للتوصيل',
  DELIVERED: 'تم التوصيل',
  FAILED: 'فشل التوصيل',
  RETURNED: 'مرتجع',
  CANCELED: 'ملغاة',
};

const statusColorClass: { [key: string]: string } = {
  DELIVERED: 'bg-green-500',
  IN_TRANSIT: 'bg-blue-500',
  OUT_FOR_DELIVERY: 'bg-sky-500',
  PICKUP_SCHEDULED: 'bg-yellow-500',
  CREATED: 'bg-gray-400',
  FAILED: 'bg-orange-500',
  RETURNED: 'bg-red-500',
  CANCELED: 'bg-zinc-600',
};

export function ShipmentDetailsDrawer({ shipment, isOpen, onOpenChange }: { shipment: Shipment | null; isOpen: boolean; onOpenChange: (open: boolean) => void }) {
    const firestore = useFirestore();
    const eventsQuery = useMemoFirebase(() => {
        if (!firestore || !shipment) return null;
        return query(collection(firestore, `shipments/${shipment.id}/events`), orderBy('timestamp', 'desc'));
    }, [firestore, shipment]);

    const { data: events, isLoading: eventsLoading } = useCollection<ShipmentEvent>(eventsQuery);
    
    if (!shipment) return null;

    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-lg p-0">
                 <SheetHeader className="p-6 border-b">
                    <SheetTitle className="text-xl">تفاصيل الشحنة</SheetTitle>
                    <SheetDescription>
                        تتبع الشحنة رقم #{shipment.bostaTrackingNumber} الخاصة بالطلب #{shipment.orderId.substring(0, 7).toUpperCase()}
                    </SheetDescription>
                </SheetHeader>
                <div className="p-6 space-y-6 overflow-y-auto h-[calc(100vh_-_150px)]">
                    {/* Basic Info */}
                    <div className="space-y-2">
                        <h4 className="font-semibold">المعلومات الأساسية</h4>
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">الحالة الحالية:</span><Badge style={{ backgroundColor: statusColorClass[shipment.status] }} className="text-white">{statusText[shipment.status] || shipment.status}</Badge></div>
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">شركة الشحن:</span><span className="font-medium">{shipment.carrier}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">تاريخ الإنشاء:</span><span className="font-medium">{shipment.createdAt && format(shipment.createdAt.toDate(), 'yyyy/MM/dd hh:mm a')}</span></div>
                    </div>
                    <Separator/>
                     {/* Financials */}
                    <div className="space-y-2">
                        <h4 className="font-semibold">المعلومات المالية</h4>
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">مبلغ التحصيل (COD):</span><span className="font-medium">{shipment.codAmount?.toFixed(2) || '0.00'} ج.م</span></div>
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">رسوم الشحن:</span><span className="font-medium">{shipment.fees?.shipping?.toFixed(2) || 'N/A'} ج.م</span></div>
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">إجمالي الرسوم:</span><span className="font-medium font-bold text-primary">{shipment.fees?.total?.toFixed(2) || 'N/A'} ج.م</span></div>
                    </div>
                    <Separator/>
                    {/* Timeline */}
                    <div className="space-y-4">
                        <h4 className="font-semibold">الجدول الزمني للشحنة</h4>
                         {eventsLoading && <div className="space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>}
                         {!eventsLoading && events && events.length > 0 ? (
                            <div className="relative ps-4 border-s-2 border-border/40">
                                {events.map((event, index) => (
                                    <div key={event.id} className="mb-6 relative">
                                        <div className="absolute -start-[1.1rem] top-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 ring-4 ring-background">
                                            <Info className="h-3.5 w-3.5 text-primary" />
                                        </div>
                                        <p className="font-semibold text-sm">{statusText[event.status] || event.status}</p>
                                        <p className="text-xs text-muted-foreground">{event.description}</p>
                                        <time className="block mt-1 text-xs font-normal leading-none text-muted-foreground/80">{event.timestamp && format(event.timestamp.toDate(), 'yyyy/MM/dd, hh:mm a')}</time>
                                    </div>
                                ))}
                            </div>
                         ) : (
                             <p className="text-sm text-muted-foreground text-center py-4">لا توجد تحديثات متاحة.</p>
                         )}
                    </div>
                </div>
                 <SheetFooter className="p-6 border-t bg-background">
                    {shipment.labelUrl && <Button variant="outline" onClick={() => window.open(shipment.labelUrl, '_blank')}><Printer className="me-2"/> طباعة البوليصة</Button>}
                    <Button disabled><RefreshCw className="me-2"/> تحديث (قيد التطوير)</Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
