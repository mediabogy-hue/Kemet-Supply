
'use client';

import { useSession } from "@/auth/SessionProvider";
import { useDoc, useCollection, useMemoFirebase, useFirestore } from "@/firebase";
import { doc, collection, query, orderBy } from "firebase/firestore";
import type { Wallet, WithdrawalRequest } from "@/lib/types";

import { WalletStats } from "@/components/shared/wallet-stats";
import { WithdrawalHistoryTable } from "@/components/shared/withdrawal-history-table";
import { WithdrawalDialog } from "@/app/(main)/reports/_components/withdrawal-dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";


export default function MerchantWalletPage() {
    const { user, profile, isLoading: sessionLoading } = useSession();
    const firestore = useFirestore();

    const walletRef = useMemoFirebase(() => (firestore && user) ? doc(firestore, 'wallets', user.uid) : null, [firestore, user]);
    const { data: wallet, isLoading: walletLoading } = useDoc<Wallet>(walletRef);
    
    const withdrawalsQuery = useMemoFirebase(() => (firestore && user) ? query(collection(firestore, `users/${user.uid}/withdrawalRequests`), orderBy('createdAt', 'desc')) : null, [firestore, user]);
    const { data: withdrawals, isLoading: withdrawalsLoading } = useCollection<WithdrawalRequest>(withdrawalsQuery);

    const isLoading = sessionLoading || walletLoading || withdrawalsLoading;
    const availableBalance = wallet?.availableBalance || 0;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">المحفظة المالية</h1>
                    <p className="text-muted-foreground">
                        هنا يمكنك متابعة أرباحك وطلب سحب مستحقاتك.
                    </p>
                </div>
                <div className="flex gap-2">
                     <Button variant="secondary" asChild>
                        <Link href="/policy">
                            <ShieldCheck className="me-2"/>
                            سياسة السحب
                        </Link>
                    </Button>
                    <WithdrawalDialog availableBalance={availableBalance} userProfile={profile} />
                </div>
            </div>

            <WalletStats wallet={wallet} isLoading={isLoading} />

            <Card>
                <CardHeader>
                    <CardTitle>سجل طلبات السحب</CardTitle>
                    <CardDescription>
                        قائمة بجميع طلبات سحب الأرباح الخاصة بك وحالتها.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <WithdrawalHistoryTable requests={withdrawals} isLoading={isLoading} />
                </CardContent>
            </Card>
        </div>
    );
}
