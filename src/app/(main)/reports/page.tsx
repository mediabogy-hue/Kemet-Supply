
'use client';
export const dynamic = "force-dynamic";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from 'next/navigation';
import { useSession } from "@/auth/SessionProvider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Wallet, TrendingUp, CircleDollarSign, Hourglass } from "lucide-react";
import { useFirestore, useUser, useDoc, useMemoFirebase, useCollection } from "@/firebase";
import { collection, query, orderBy, Timestamp, doc, documentId } from "firebase/firestore";
import type { Order, WithdrawalRequest, UserProfile, Bonus } from "@/lib/types";
import { format } from 'date-fns';
import { WithdrawalDialog } from './_components/withdrawal-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const statusVariant: { [key: string]: "default" | "secondary" | "destructive" } = {
  Completed: "default",
  Pending: "secondary",
  Rejected: "destructive",
};

const statusText: { [key: string]: string } = {
    Completed: "مكتمل",
    Pending: "قيد المراجعة",
    Rejected: "مرفوض",
};

const typeText: { [key: string]: string } = {
    Sale: "ربح من طلب",
    Withdrawal: "سحب",
    Bonus: "مكافأة/خصم",
};

const typeColorClass: { [key: string]: string } = {
    Sale: "text-green-500",
    Withdrawal: "text-destructive",
    Bonus: "text-blue-500",
};

type Transaction = {
  id: string;
  type: 'Sale' | 'Withdrawal' | 'Bonus';
  details: string;
  amount: number;
  date: Timestamp;
  status: 'Completed' | 'Pending' | 'Rejected';
};

// This component holds all the logic and is only rendered for dropshippers.
function ReportsContent() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { isDropshipper, profile: userProfile, isLoading: profileLoading } = useSession();

    const allOrdersQuery = useMemoFirebase(() => {
        if (!user || !firestore || !isDropshipper) return null;
        return query(collection(firestore, `users/${user.uid}/orders`));
    }, [user, firestore, isDropshipper]);
    const { data: allUserOrders, isLoading: ordersLoading, error: ordersError } = useCollection<Order>(allOrdersQuery);
    
    const withdrawalRequestsQuery = useMemoFirebase(() => {
        if (!user || !firestore || !isDropshipper) return null;
        return query(
            collection(firestore, `users/${user.uid}/withdrawalRequests`),
            orderBy("createdAt", "desc")
        );
    }, [user, firestore, isDropshipper]);
    const { data: withdrawalRequests, isLoading: withdrawalsLoading, error: withdrawalsError } = useCollection<WithdrawalRequest>(withdrawalRequestsQuery);
    
    const bonusesQuery = useMemoFirebase(() => {
        if (!user || !firestore || !isDropshipper) return null;
        return query(
            collection(firestore, `users/${user.uid}/bonuses`),
            orderBy("createdAt", "desc")
        );
    }, [user, firestore, isDropshipper]);
    const { data: bonuses, isLoading: bonusesLoading, error: bonusesError } = useCollection<Bonus>(bonusesQuery);


    const error = ordersError || withdrawalsError || bonusesError;
    const isLoading = ordersLoading || withdrawalsLoading || profileLoading || bonusesLoading;
    
    const {
        availableForWithdrawal,
        totalProfit,
        withdrawnAmount,
        pendingWithdrawalAmount,
        transactions,
    } = useMemo(() => {
        const safeParseFloat = (val: any): number => {
            if (val === null || val === undefined) return 0;
            const num = parseFloat(val);
            return isNaN(num) ? 0 : num;
        };

        const deliveredOrders = (allUserOrders || []).filter(order => order.status === 'Delivered');

        const totalProfitFromSales = deliveredOrders.reduce((sum, order) => {
            const commission = order.totalCommission ?? ((order.unitCommission ?? 0) * (order.quantity ?? 0));
            return sum + safeParseFloat(commission);
        }, 0);

        const saleTransactions: Transaction[] = deliveredOrders.map(order => {
            const commission = order.totalCommission ?? ((order.unitCommission ?? 0) * (order.quantity ?? 0));
            return {
                id: order.id,
                type: 'Sale',
                details: `ربح من طلب ${order.productName || 'N/A'}`,
                amount: safeParseFloat(commission),
                date: order.updatedAt || order.createdAt,
                status: 'Completed'
            }
        }).filter(t => t.date && t.amount > 0) as Transaction[];


        const totalBonusAmount = (bonuses || []).reduce((sum, bonus) => sum + safeParseFloat(bonus?.amount), 0);
        const bonusTransactions: Transaction[] = (bonuses || []).map(bonus => ({
            id: bonus.id,
            type: 'Bonus',
            details: bonus.reason,
            amount: safeParseFloat(bonus.amount),
            date: bonus.createdAt,
            status: 'Completed'
        })).filter(t => t.date) as Transaction[];

        const totalWithdrawnAmount = (withdrawalRequests || []).filter(r => r.status === 'Completed').reduce((sum, req) => sum + safeParseFloat(req?.amount), 0);
        const totalPendingWithdrawalAmount = (withdrawalRequests || []).filter(r => r.status === 'Pending').reduce((sum, req) => sum + safeParseFloat(req?.amount), 0);
        const withdrawalTransactions: Transaction[] = (withdrawalRequests || []).map(req => ({
            id: req.id,
            type: 'Withdrawal',
            details: `سحب أرباح إلى ${req.method}`,
            amount: -safeParseFloat(req.amount),
            date: req.createdAt,
            status: req.status
        })).filter(t => t.date) as Transaction[];

        const finalTotalProfit = totalProfitFromSales + totalBonusAmount;
        const finalAvailable = finalTotalProfit - totalWithdrawnAmount - totalPendingWithdrawalAmount;

        const allTransactions = [...saleTransactions, ...bonusTransactions, ...withdrawalTransactions].sort((a, b) => (b.date?.toMillis() || 0) - (a.date?.toMillis() || 0));

        return {
            availableForWithdrawal: Math.max(0, finalAvailable),
            totalProfit: finalTotalProfit,
            withdrawnAmount: totalWithdrawnAmount,
            pendingWithdrawalAmount: totalPendingWithdrawalAmount,
            transactions: allTransactions
        };
    }, [allUserOrders, withdrawalRequests, bonuses]);

    const financialStats = [
        { title: "الرصيد القابل للسحب", value: `${availableForWithdrawal.toFixed(2)} ج.م`, icon: <Wallet className="h-5 w-5 text-muted-foreground" />, description: "الأرباح الجاهزة للسحب فور تسليم الطلبات" },
        { title: "طلبات سحب معلقة", value: `${pendingWithdrawalAmount.toFixed(2)} ج.م`, icon: <Hourglass className="h-5 w-5 text-muted-foreground" />, description: "مجموع المبالغ في طلبات السحب قيد المراجعة" },
        { title: "المبالغ المسحوبة", value: `${withdrawnAmount.toFixed(2)} ج.م`, icon: <CircleDollarSign className="h-5 w-5 text-muted-foreground" />, description: "مجموع المبالغ التي تم سحبها بنجاح" },
        { title: "إجمالي الأرباح", value: `${totalProfit.toFixed(2)} ج.م`, icon: <TrendingUp className="h-5 w-5 text-muted-foreground" />, description: "مجموع أرباحك بعد المكافآت والخصومات" },
    ];
    
    // This is the loading state specifically for the content, after we know the user is a dropshipper.
    if (isLoading) {
        return (
            <div className="flex flex-col gap-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4">
                  <div>
                      <h1 className="text-3xl font-bold tracking-tight">المحفظة المالية</h1>
                      <p className="text-muted-foreground mt-1">نظرة شاملة على أرباحك ومعاملاتك المالية.</p>
                  </div>
                   <Skeleton className="h-10 w-40" />
              </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
            </div>
            <Card>
              <CardHeader>
                <CardTitle>سجل المعاملات</CardTitle>
                <CardDescription>نظرة مفصلة على جميع معاملاتك المالية وأرباحك.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                  <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>النوع</TableHead>
                          <TableHead>التفاصيل</TableHead>
                          <TableHead>المبلغ</TableHead>
                          <TableHead>التاريخ</TableHead>
                          <TableHead>الحالة</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                          {Array.from({length: 5}).map((_, i) => (
                              <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                          ))}
                      </TableBody>
                  </Table>
              </CardContent>
            </Card>
          </div>
        );
    }
    
    // The actual UI for dropshippers
    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">المحفظة المالية</h1>
                    <p className="text-muted-foreground mt-1">نظرة شاملة على أرباحك ومعاملاتك المالية.</p>
                </div>
                <WithdrawalDialog availableBalance={availableForWithdrawal} userProfile={userProfile} />
            </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {financialStats.map((stat) => (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  {stat.icon}
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader>
              <CardTitle>سجل المعاملات</CardTitle>
              <CardDescription>نظرة مفصلة على جميع معاملاتك المالية وأرباحك.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>النوع</TableHead>
                    <TableHead>التفاصيل</TableHead>
                    <TableHead>المبلغ</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.length > 0 ? (
                    transactions.map((t) => (
                        <TableRow key={t.id} className="hover:bg-muted/50">
                         <TableCell className="py-4 font-medium">{typeText[t.type] || t.type}</TableCell>
                        <TableCell className="py-4 text-muted-foreground">{t.details}</TableCell>
                        <TableCell className={cn("py-4 font-semibold", typeColorClass[t.type] || 'text-foreground', t.amount > 0 && t.type !== 'Withdrawal' ? typeColorClass.Sale : '')}>{t.amount > 0 && t.type !== 'Withdrawal' ? '+' : ''}{t.amount.toFixed(2)} ج.م</TableCell>
                        <TableCell className="py-4 text-muted-foreground">{t.date && typeof t.date.toDate === 'function' ? format(t.date.toDate(), 'yyyy-MM-dd') : 'N/A'}</TableCell>
                        <TableCell className="py-4">
                            <Badge variant={statusVariant[t.status] || 'secondary'}>
                            {statusText[t.status] || t.status}
                            </Badge>
                        </TableCell>
                        </TableRow>
                    ))
                  ) : (
                    <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                            {error ? `خطأ: ${error.message}` : 'لا توجد معاملات لعرضها.'}
                        </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
    );
}


export default function ReportsPage() {
    const router = useRouter();
    const { isDropshipper, isLoading: roleIsLoading } = useSession();
    const { isUserLoading } = useUser();
    const isLoading = roleIsLoading || isUserLoading;

    useEffect(() => {
        if (!isLoading && !isDropshipper) {
            router.replace('/dashboard');
        }
    }, [isLoading, isDropshipper, router]);

    if (isLoading) {
        return (
          <div className="flex flex-col gap-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">المحفظة المالية</h1>
                    <p className="text-muted-foreground mt-1">نظرة شاملة على أرباحك ومعاملاتك المالية.</p>
                </div>
                 <Skeleton className="h-10 w-40" />
            </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>سجل المعاملات</CardTitle>
              <CardDescription>نظرة مفصلة على جميع معاملاتك المالية وأرباحك.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>النوع</TableHead>
                        <TableHead>التفاصيل</TableHead>
                        <TableHead>المبلغ</TableHead>
                        <TableHead>التاريخ</TableHead>
                        <TableHead>الحالة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                        {Array.from({length: 5}).map((_, i) => (
                            <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
          </Card>
        </div>
        );
    }

    if (!isDropshipper) {
        return null;
    }
    
    return <ReportsContent />;
}

    