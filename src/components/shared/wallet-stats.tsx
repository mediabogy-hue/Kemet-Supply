'use client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Wallet } from "@/lib/types";
import { Wallet as WalletIcon, Hourglass, CheckCircle } from "lucide-react";

interface WalletStatsProps {
    wallet: Wallet | null;
    isLoading: boolean;
}

const StatCard = ({ title, value, icon, isLoading }: { title: string; value: string | number; icon: React.ReactNode, isLoading: boolean }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            {icon}
        </CardHeader>
        <CardContent>
            {isLoading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold">{value} ج.م</div>}
        </CardContent>
    </Card>
);

export function WalletStats({ wallet, isLoading }: WalletStatsProps) {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <StatCard 
                title="الرصيد القابل للسحب"
                value={wallet?.availableBalance?.toFixed(2) || '0.00'}
                icon={<WalletIcon className="h-4 w-4 text-primary" />}
                isLoading={isLoading}
            />
            <StatCard 
                title="طلبات سحب معلقة"
                value={wallet?.pendingWithdrawals?.toFixed(2) || '0.00'}
                icon={<Hourglass className="h-4 w-4 text-primary" />}
                isLoading={isLoading}
            />
            <StatCard 
                title="إجمالي ما تم سحبه"
                value={wallet?.totalWithdrawn?.toFixed(2) || '0.00'}
                icon={<CheckCircle className="h-4 w-4 text-primary" />}
                isLoading={isLoading}
            />
        </div>
    );
}
