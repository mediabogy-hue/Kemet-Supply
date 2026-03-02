'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import type { WithdrawalRequest } from "@/lib/types";
import { format } from "date-fns";
import { WithdrawalStatusBadge } from "./withdrawal-status-badge";
import { PaymentMethodIcon } from "@/app/(main)/admin/withdrawals/_components/payment-icons";

interface WithdrawalHistoryTableProps {
    requests: WithdrawalRequest[] | null;
    isLoading: boolean;
}

export function WithdrawalHistoryTable({ requests, isLoading }: WithdrawalHistoryTableProps) {
    if (isLoading) {
        return (
            <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
            </div>
        );
    }
    
    if (!requests || requests.length === 0) {
        return <p className="text-center py-8 text-muted-foreground">لم تقم بأي طلبات سحب بعد.</p>
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>المبلغ</TableHead>
                        <TableHead>طريقة الدفع</TableHead>
                        <TableHead>الحالة</TableHead>
                        <TableHead>تاريخ الطلب</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {requests.map(request => (
                        <TableRow key={request.id}>
                            <TableCell className="font-semibold text-lg">{request.amount.toFixed(2)} ج.م</TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    <PaymentMethodIcon method={request.method} />
                                    <span>{request.method}</span>
                                </div>
                            </TableCell>
                            <TableCell>
                                <WithdrawalStatusBadge status={request.status} />
                            </TableCell>
                            <TableCell>{request.createdAt?.toDate ? format(request.createdAt.toDate(), "yyyy-MM-dd") : 'N/A'}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
