

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useFirestore, errorEmitter, FirestorePermissionError, useCollection, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, doc, updateDoc, serverTimestamp, deleteDoc, orderBy, limit, writeBatch } from "firebase/firestore";
import type { WithdrawalRequest } from "@/lib/types";
import { useMemo, useState } from "react";
import { useSession } from "@/auth/SessionProvider";
import { KpiCard } from "./_components/kpi-card";
import { FiltersPanel } from "./_components/filters-panel";
import { WithdrawalsTable } from "./_components/withdrawals-table";
import { WithdrawalDetailsDrawer } from "./_components/withdrawal-details-drawer";
import { DollarSign, Hourglass, CheckCircle, XCircle, List, ShieldAlert } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


export default function AdminWithdrawalsPage() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const { isAdmin, isFinanceManager, isLoading: isRoleLoading } = useSession();
    const { user } = useUser();
    
    const [selectedRequest, setSelectedRequest] = useState<WithdrawalRequest | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    
    const [statusFilter, setStatusFilter] = useState('all');
    const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');

    const canAccess = isAdmin || isFinanceManager;

    const requestsQuery = useMemoFirebase(() => {
        if (!firestore || !canAccess) return null;
        return query(collection(firestore, 'adminWithdrawalRequests'), orderBy('createdAt', 'desc'), limit(100));
    }, [firestore, canAccess]);
    
    const { data: requests, isLoading: requestsLoading, error, setData: setRequests } = useCollection<WithdrawalRequest>(requestsQuery);
    
    const isLoading = isRoleLoading || requestsLoading;

    const filteredRequests = useMemo(() => {
        if (!requests) return [];
        return requests.filter(req => {
            const statusMatch = statusFilter === 'all' || req.status === statusFilter;
            const paymentMethodMatch = paymentMethodFilter === 'all' || req.method === paymentMethodFilter;
            return statusMatch && paymentMethodMatch;
        }).sort((a, b) => (b.createdAt?.toDate?.()?.getTime() || 0) - (a.createdAt?.toDate?.()?.getTime() || 0));
    }, [requests, statusFilter, paymentMethodFilter]);

    const kpiData = useMemo(() => {
        if (!requests) return { totalCount: 0, totalAmount: 0, paid: 0, pending: 0, rejected: 0 };
        return requests.reduce((acc, req) => {
            acc.totalCount++;
            acc.totalAmount += req.amount;
            if (req.status === 'Completed') acc.paid++;
            if (req.status === 'Pending') acc.pending++;
            if (req.status === 'Rejected') acc.rejected++;
            return acc;
        }, { totalCount: 0, totalAmount: 0, paid: 0, pending: 0, rejected: 0 });
    }, [requests]);
    
    const handleViewDetails = (request: WithdrawalRequest) => {
        setSelectedRequest(request);
        setIsDrawerOpen(true);
    };

    const handleStatusUpdate = (request: WithdrawalRequest, newStatus: 'Completed' | 'Rejected') => {
        if (!firestore || !requests) return;
        
        const batch = writeBatch(firestore);
        const adminRequestRef = doc(firestore, `adminWithdrawalRequests/${request.id}`);
        const userRequestRef = doc(firestore, `users/${request.userId}/withdrawalRequests/${request.id}`);

        const updatedData = {
            status: newStatus,
            updatedAt: serverTimestamp(),
        };
        
        batch.update(adminRequestRef, updatedData);
        batch.update(userRequestRef, updatedData);

        const originalRequests = [...requests];
        setRequests(prev => (prev || []).map(r => r.id === request.id ? { ...r, status: newStatus } : r));
        toast({ title: "تم تحديث حالة الطلب بنجاح" });

        batch.commit()
            .catch(async (e: any) => {
                setRequests(originalRequests); // Revert
                toast({ variant: "destructive", title: "فشل تحديث الحالة", description: "قد لا تملك الصلاحيات الكافية." });
            });
    };

    const handleDeleteRequest = (request: WithdrawalRequest) => {
        if (!firestore || !requests) return;

        const batch = writeBatch(firestore);
        const adminRequestRef = doc(firestore, `adminWithdrawalRequests/${request.id}`);
        const userRequestRef = doc(firestore, `users/${request.userId}/withdrawalRequests/${request.id}`);

        batch.delete(adminRequestRef);
        batch.delete(userRequestRef);

        const originalRequests = [...requests];
        setRequests(prev => (prev || []).filter(r => r.id !== request.id));
        toast({ title: "تم حذف طلب السحب بنجاح" });
        
        batch.commit()
            .catch(async (e) => {
                setRequests(originalRequests); // Revert
                toast({ variant: "destructive", title: "فشل حذف الطلب", description: "قد لا تملك الصلاحيات الكافية." });
            });
    };

    return (
        <>
            <div className="space-y-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">طلبات السحب</h1>
                    <p className="text-muted-foreground mt-1">مراجعة واعتماد طلبات سحب الأرباح للمسوقين والتجار.</p>
                </div>
                
                <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
                    <KpiCard title="إجمالي الطلبات" value={kpiData.totalCount} icon={<List />} isLoading={isLoading} />
                    <KpiCard title="إجمالي المبالغ" value={`${kpiData.totalAmount.toFixed(2)} ج.م`} icon={<DollarSign />} isLoading={isLoading} />
                    <KpiCard title="قيد المراجعة" value={kpiData.pending} icon={<Hourglass />} isLoading={isLoading} />
                    <KpiCard title="تم الدفع" value={kpiData.paid} icon={<CheckCircle />} isLoading={isLoading} />
                    <KpiCard title="مرفوض" value={kpiData.rejected} icon={<XCircle />} isLoading={isLoading} />
                </div>

                <Card>
                    <CardHeader>
                        <FiltersPanel
                            onStatusChange={setStatusFilter}
                            onPaymentMethodChange={setPaymentMethodFilter}
                        />
                    </CardHeader>
                    {error && (
                         <Alert variant="destructive" className="mx-6 mb-4">
                            <ShieldAlert className="h-4 w-4" />
                            <AlertTitle>خطأ في جلب البيانات</AlertTitle>
                            <AlertDescription>
                                لم نتمكن من تحميل قائمة السحوبات. قد يكون السبب عدم وجود صلاحيات كافية أو مشكلة في قاعدة البيانات.
                                 <p className="mt-2 text-xs font-mono">{error.message}</p>
                            </AlertDescription>
                        </Alert>
                    )}
                    <CardContent className="p-0">
                         {isLoading ? (
                            <div className="p-6 space-y-2">
                                {Array.from({length: 5}).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                            </div>
                         ) : error ? (
                             <div className="p-6 text-center text-destructive">
                                 <p>فشل تحميل البيانات</p>
                             </div>
                         ) : (
                            <WithdrawalsTable
                                requests={filteredRequests}
                                onViewDetails={handleViewDetails}
                                onStatusUpdate={handleStatusUpdate}
                                onDelete={handleDeleteRequest}
                            />
                         )}
                    </CardContent>
                </Card>
            </div>
            
            <WithdrawalDetailsDrawer
                request={selectedRequest}
                isOpen={isDrawerOpen}
                onOpenChange={setIsDrawerOpen}
            />
        </>
    );
}

    

    

    


    

    

    
