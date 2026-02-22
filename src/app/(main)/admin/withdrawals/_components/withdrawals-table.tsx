
"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { WithdrawalRequest } from "@/lib/types";
import { format } from "date-fns";
import { MoreHorizontal, CheckCircle, XCircle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { useSession } from "@/auth/SessionProvider";
import { DeleteWithdrawalAlert } from "./delete-withdrawal-alert";
import { PaymentMethodIcon } from "./payment-icons";

const statusVariant: { [key: string]: "default" | "secondary" | "destructive" } = {
  Completed: "default",
  Pending: "secondary",
  Rejected: "destructive",
};

const statusText: { [key: string]: string } = {
  Completed: "مدفوع",
  Pending: "قيد الانتظار",
  Rejected: "مرفوض",
};

interface WithdrawalsTableProps {
    requests: WithdrawalRequest[];
    onViewDetails: (request: WithdrawalRequest) => void;
    onStatusUpdate: (request: WithdrawalRequest, newStatus: 'Completed' | 'Rejected') => void;
    onDelete: (request: WithdrawalRequest) => void;
}

export function WithdrawalsTable({ requests, onViewDetails, onStatusUpdate, onDelete }: WithdrawalsTableProps) {
    const { isAdmin } = useSession();
    const [requestToDelete, setRequestToDelete] = useState<WithdrawalRequest | null>(null);

    const confirmDelete = () => {
        if (requestToDelete) {
            onDelete(requestToDelete);
            setRequestToDelete(null);
        }
    };

    if (requests.length === 0) {
        return <div className="text-center p-8 text-muted-foreground">لا توجد طلبات سحب تطابق هذه الفلاتر.</div>
    }

    return (
        <>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>المستخدم</TableHead>
                        <TableHead>المبلغ</TableHead>
                        <TableHead>طريقة الدفع</TableHead>
                        <TableHead>تاريخ الطلب</TableHead>
                        <TableHead>الحالة</TableHead>
                        <TableHead className="text-end">الإجراءات</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {requests.map(request => (
                        <TableRow key={request.id} className="hover:bg-muted/50">
                            <TableCell className="py-4">
                                <div className="font-medium">{request.userName}</div>
                                <div className="text-xs text-muted-foreground font-mono">{request.userId ? `${request.userId.substring(0, 10)}...` : ''}</div>
                            </TableCell>
                            <TableCell className="py-4 font-semibold text-lg">{request.amount.toFixed(2)} ج.م</TableCell>
                            <TableCell className="py-4">
                                <div className="flex items-center gap-2">
                                    <PaymentMethodIcon method={request.method} />
                                    <span>{request.method}</span>
                                </div>
                            </TableCell>
                            <TableCell className="py-4 text-muted-foreground">{request.createdAt && typeof request.createdAt.toDate === 'function' ? format(request.createdAt.toDate(), "yyyy-MM-dd") : 'N/A'}</TableCell>
                            <TableCell className="py-4">
                                <Badge variant={statusVariant[request.status]}>
                                    {statusText[request.status]}
                                </Badge>
                            </TableCell>
                            <TableCell className="py-4 text-end">
                                {request.status === 'Pending' && (
                                     <div className="flex items-center justify-end gap-2">
                                        <Button size="sm" variant="outline" onClick={() => onStatusUpdate(request, 'Rejected')}>رفض</Button>
                                        <Button size="sm" onClick={() => onStatusUpdate(request, 'Completed')}>اعتماد</Button>
                                    </div>
                                )}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button aria-haspopup="true" size="icon" variant="ghost">
                                            <MoreHorizontal className="h-4 w-4" />
                                            <span className="sr-only">Toggle menu</span>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>إجراءات إضافية</DropdownMenuLabel>
                                        <DropdownMenuItem onClick={() => onViewDetails(request)}>عرض التفاصيل</DropdownMenuItem>
                                        {isAdmin && (
                                            <>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem 
                                                    className="text-destructive" 
                                                    onClick={() => setRequestToDelete(request)}
                                                >
                                                    حذف الطلب
                                                </DropdownMenuItem>
                                            </>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            <DeleteWithdrawalAlert 
                request={requestToDelete}
                isOpen={!!requestToDelete}
                onOpenChange={(isOpen) => !isOpen && setRequestToDelete(null)}
                onConfirm={confirmDelete}
            />
        </>
    );
}

    


    