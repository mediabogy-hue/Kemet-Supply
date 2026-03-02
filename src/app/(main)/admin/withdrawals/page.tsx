
'use client';
import { useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, where, doc, writeBatch, serverTimestamp, increment } from 'firebase/firestore';
import type { WithdrawalRequest, Wallet } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { KpiCard } from './_components/kpi-card';
import { FiltersPanel } from './_components/filters-panel';
import { WithdrawalsTable } from './_components/withdrawals-table';
import { WithdrawalDetailsDrawer } from './_components/withdrawal-details-drawer';
import { DeleteWithdrawalAlert } from './_components/delete-withdrawal-alert';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, Hourglass, CheckCircle } from 'lucide-react';
import { useSession } from '@/auth/SessionProvider';

export default function AdminWithdrawalsPage() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const { isFinanceManager } = useSession();

    const [statusFilter, setStatusFilter] = useState('all');
    const [methodFilter, setMethodFilter] = useState('all');
    const [selectedRequest, setSelectedRequest] = useState<WithdrawalRequest | null>(null);
    const [requestToDelete, setRequestToDelete] = useState<WithdrawalRequest | null>(null);

    const withdrawalsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        let q = query(collection(firestore, 'adminWithdrawalRequests'), orderBy('createdAt', 'desc'));
        if (statusFilter !== 'all') {
            q = query(q, where('status', '==', statusFilter));
        }
        if (methodFilter !== 'all') {
            q = query(q, where('method', '==', methodFilter));
        }
        return q;
    }, [firestore, statusFilter, methodFilter]);

    const { data: requests, isLoading, error } = useCollection<WithdrawalRequest>(withdrawalsQuery);
    
    const stats = useMemo(() => {
        if (!requests) return { pending: 0, completed: 0, total: 0 };
        return requests.reduce((acc, req) => {
            if (req.status === 'Pending') acc.pending += req.amount;
            if (req.status === 'Completed') acc.completed += req.amount;
            acc.total += req.amount;
            return acc;
        }, { pending: 0, completed: 0, total: 0 });
    }, [requests]);

    const handleStatusUpdate = async (request: WithdrawalRequest, newStatus: 'Completed' | 'Rejected') => {
        if (!firestore || !isFinanceManager) {
            toast({ variant: 'destructive', title: 'غير مصرح به', description: 'ليس لديك صلاحية لتنفيذ هذا الإجراء.' });
            return;
        }

        toast({ title: 'جاري تحديث حالة الطلب...' });
        
        try {
            const batch = writeBatch(firestore);

            const adminReqRef = doc(firestore, 'adminWithdrawalRequests', request.id);
            const userReqRef = doc(firestore, `users/${request.userId}/withdrawalRequests`, request.id);
            const walletRef = doc(firestore, 'wallets', request.userId);

            batch.update(adminReqRef, { status: newStatus, updatedAt: serverTimestamp() });
            batch.update(userReqRef, { status: newStatus, updatedAt: serverTimestamp() });

            if (newStatus === 'Completed') {
                batch.update(walletRef, {
                    pendingWithdrawals: increment(-request.amount),
                    totalWithdrawn: increment(request.amount),
                    updatedAt: serverTimestamp()
                });
            } else if (newStatus === 'Rejected') {
                batch.update(walletRef, {
                    pendingWithdrawals: increment(-request.amount),
                    availableBalance: increment(request.amount),
                    updatedAt: serverTimestamp()
                });
            }

            await batch.commit();
            toast({ title: 'تم تحديث الحالة بنجاح' });

        } catch (e) {
            console.error("Failed to update withdrawal status:", e);
            toast({ variant: 'destructive', title: 'فشل تحديث الحالة' });
        }
    };

    const handleDelete = async () => {
        if (!firestore || !requestToDelete) return;
        
        toast({ title: 'جاري حذف الطلب...' });
        
        const batch = writeBatch(firestore);
        const adminReqRef = doc(firestore, 'adminWithdrawalRequests', requestToDelete.id);
        const userReqRef = doc(firestore, `users/${requestToDelete.userId}/withdrawalRequests`, requestToDelete.id);
        
        batch.delete(adminReqRef);
        batch.delete(userReqRef);

        // If the request was pending, we must refund the user.
        if (requestToDelete.status === 'Pending') {
            const walletRef = doc(firestore, 'wallets', requestToDelete.userId);
            batch.update(walletRef, {
                pendingWithdrawals: increment(-requestToDelete.amount),
                availableBalance: increment(requestToDelete.amount),
                updatedAt: serverTimestamp()
            });
        }
        
        try {
            await batch.commit();
            toast({ title: 'تم حذف الطلب بنجاح' });
            setRequestToDelete(null);
        } catch (e) {
            console.error("Failed to delete withdrawal request:", e);
            toast({ variant: 'destructive', title: 'فشل حذف الطلب' });
        }
    };


    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">طلبات السحب</h1>
                <p className="text-muted-foreground">مراجعة واعتماد طلبات سحب الأرباح للمسوقين والتجار.</p>
            </div>
            
            <div className="grid gap-4 md:grid-cols-3">
                <KpiCard title="إجمالي الطلبات المعلقة" value={`${stats.pending.toFixed(2)}`} icon={<Hourglass />} isLoading={isLoading} />
                <KpiCard title="إجمالي المدفوعات (هذا الشهر)" value={`${stats.completed.toFixed(2)}`} icon={<CheckCircle />} isLoading={isLoading} />
                <KpiCard title="إجمالي كل الطلبات" value={`${stats.total.toFixed(2)}`} icon={<DollarSign />} isLoading={isLoading} />
            </div>

            <div className="bg-card p-4 rounded-lg border space-y-4">
                <FiltersPanel onStatusChange={setStatusFilter} onPaymentMethodChange={setMethodFilter} />
                
                {isLoading ? (
                    <div className="space-y-2 pt-4">
                        <Skeleton className="h-14 w-full" />
                        <Skeleton className="h-14 w-full" />
                        <Skeleton className="h-14 w-full" />
                    </div>
                ) : error ? (
                    <p className="text-destructive text-center py-8">خطأ: {error.message}</p>
                ) : (
                    <WithdrawalsTable 
                        requests={requests || []}
                        onViewDetails={setSelectedRequest}
                        onStatusUpdate={handleStatusUpdate}
                        onDelete={setRequestToDelete}
                    />
                )}
            </div>

            <WithdrawalDetailsDrawer 
                request={selectedRequest}
                isOpen={!!selectedRequest}
                onOpenChange={() => setSelectedRequest(null)}
            />
            
            <DeleteWithdrawalAlert
                request={requestToDelete}
                isOpen={!!requestToDelete}
                onOpenChange={() => setRequestToDelete(null)}
                onConfirm={handleDelete}
            />
        </div>
    );
}
