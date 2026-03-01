'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuth } from '@/firebase';
import type { Order } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable } from './_components/data-table';
import { getColumns } from './_components/columns';

export default function SettlementsPage() {
    const auth = useAuth();
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
        if (!auth.currentUser) {
            toast({ variant: 'destructive', title: 'خطأ في المصادقة', description: 'الرجاء تسجيل الخروج والدخول مرة أخرى.' });
            return;
        }

        setSettlingOrderId(order.id);
        
        try {
            const token = await auth.currentUser.getIdToken();
            const response = await fetch('/api/settlements/settle-order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ orderId: order.id })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'فشل إتمام التسوية.');
            }
            
            toast({
                title: '🎉 تمت التسوية بنجاح!',
                description: `تم إيداع الأرباح في المحافظ للطلب #${order.id.substring(0, 5)}.`,
            });
            fetchPendingSettlements();

        } catch (e: any) {
             console.error(`FATAL: Client-side settlement trigger failed for order ${order.id}:`, e);
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
