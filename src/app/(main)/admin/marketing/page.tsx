
'use client';

import { useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, where, doc, deleteDoc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useSession } from '@/auth/SessionProvider';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable } from './_components/data-table';
import { getColumns } from './_components/columns';

// Reusing dialogs from the main users management page
import { AddUserDialog } from '@/app/(main)/admin/users/_components/add-user-dialog';
import { EditUserDialog } from '@/app/(main)/admin/users/_components/edit-user-dialog';
import { DeleteUserAlert } from '@/app/(main)/admin/users/_components/delete-user-alert';


export default function AdminMerchantsPage() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const { user: currentUser } = useSession();

    // State for dialogs
    const [userToEdit, setUserToEdit] = useState<UserProfile | null>(null);
    const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);

    // Fetch merchants
    const merchantsQuery = useMemoFirebase(
        () => (firestore ? query(collection(firestore, "users"), where("role", "==", "Merchant"), orderBy("createdAt", "desc")) : null),
        [firestore]
    );
    const { data: merchants, isLoading, error } = useCollection<UserProfile>(merchantsQuery);

    const handleDelete = async () => {
        if (!firestore || !userToDelete) return;
        
        if (userToDelete.id === currentUser?.uid) {
            toast({ variant: 'destructive', title: 'لا يمكن حذف الحساب', description: 'لا يمكنك حذف حسابك الخاص من هنا.' });
            setUserToDelete(null);
            return;
        }

        const userRef = doc(firestore, "users", userToDelete.id);
        
        try {
            await deleteDoc(userRef);
            toast({ title: "تم حذف التاجر بنجاح" });
            setUserToDelete(null);
        } catch (e) {
            console.error('Failed to delete user:', e);
            toast({ variant: 'destructive', title: 'فشل حذف التاجر' });
        }
    };
    
    // Memoize columns to prevent re-creation on every render
    const columns = useMemo(
        () => getColumns({
            onEdit: setUserToEdit,
            onDelete: setUserToDelete,
            onViewDetails: (user) => { /* Placeholder for future details page */ 
                toast({ title: 'قيد التطوير', description: `سيتم عرض تفاصيل التاجر ${user.firstName} هنا قريبًا.` });
            },
        }),
        []
    );

    if (error) {
        return <p className="text-destructive">خطأ في تحميل التجار: {error.message}</p>;
    }
    
    return (
        <div className="space-y-6">
             <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">إدارة التجار</h1>
                    <p className="text-muted-foreground">عرض وتعديل حسابات التجار وإدارة منتجاتهم ومبيعاتهم.</p>
                </div>
                <AddUserDialog />
            </div>

            <Card>
                <CardContent className="pt-6">
                    {isLoading ? (
                         <div className="space-y-4">
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-20 w-full" />
                            <Skeleton className="h-20 w-full" />
                        </div>
                    ) : (
                        <DataTable columns={columns} data={merchants || []} />
                    )}
                </CardContent>
            </Card>

            {/* Re-using dialogs for editing and deleting users */}
            <EditUserDialog 
                user={userToEdit}
                isOpen={!!userToEdit}
                onOpenChange={(isOpen) => !isOpen && setUserToEdit(null)}
            />
             <DeleteUserAlert
                user={userToDelete}
                isOpen={!!userToDelete}
                onOpenChange={(isOpen) => !isOpen && setUserToDelete(null)}
                onConfirm={handleDelete}
            />
        </div>
    );
}
