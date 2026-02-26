
'use client';

import { useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, where } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { useSession } from '@/auth/SessionProvider';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

const roleText: Record<string, string> = {
  'Admin': 'أدمن',
  'OrdersManager': 'مدير طلبات',
  'FinanceManager': 'مدير مالي',
  'Dropshipper': 'مسوق',
  'Merchant': 'تاجر',
};

export default function AdminMerchantsPage() {
    const firestore = useFirestore();
    const { user: currentUser } = useSession();

    const merchantsQuery = useMemoFirebase(
        () => (firestore ? query(collection(firestore, "users"), where("role", "==", "Merchant"), orderBy("createdAt", "desc")) : null),
        [firestore]
    );
    const { data: merchants, isLoading, error } = useCollection<UserProfile>(merchantsQuery);
    
    if (error) {
        return <p className="text-destructive">خطأ في تحميل التجار: {error.message}</p>;
    }
    
    return (
        <div className="space-y-6">
             <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">إدارة التجار</h1>
                    <p className="text-muted-foreground">عرض حسابات التجار في المنصة.</p>
                </div>
                {/* Add button will be added back later */}
            </div>

            <Card>
                <CardContent className="pt-6">
                    {isLoading ? (
                         <div className="space-y-4">
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-16 w-full" />
                        </div>
                    ) : (
                        <div className="divide-y divide-border">
                            {merchants?.length === 0 ? (
                                <div className="text-center py-16">
                                    <h3 className="text-lg font-semibold">لا يوجد تجار</h3>
                                    <p className="text-muted-foreground mt-2">لم يتم إضافة أي تجار بعد.</p>
                                </div>
                            ) : (
                                merchants?.map(user => (
                                    <div key={user.id} className="flex items-center justify-between p-4 hover:bg-muted/50">
                                        <div className="flex items-center gap-4">
                                            <Avatar className="h-12 w-12 border">
                                                {user.photoURL && <AvatarImage src={user.photoURL} alt={`${user.firstName} ${user.lastName}`} />}
                                                <AvatarFallback>{`${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-semibold">{user.firstName} {user.lastName}</p>
                                                <p className="text-sm text-muted-foreground">{user.email}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                             <div className="text-center hidden md:block">
                                                <p className="text-sm font-medium">{roleText[user.role] || user.role}</p>
                                                <p className="text-xs text-muted-foreground">الدور</p>
                                            </div>
                                            <div className="text-center hidden lg:block">
                                                 <Badge variant={user.isActive ? 'default' : 'destructive'}>
                                                    {user.isActive ? 'نشط' : 'غير نشط'}
                                                </Badge>
                                                <p className="text-xs text-muted-foreground mt-1">الحالة</p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
