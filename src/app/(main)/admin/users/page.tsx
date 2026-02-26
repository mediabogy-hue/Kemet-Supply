
'use client';

import { useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, deleteDoc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useSession } from '@/auth/SessionProvider';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Edit, Trash2, ShieldCheck, Award, UserPlus } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

import { AddUserDialog } from './_components/add-user-dialog';
import { EditUserDialog } from './_components/edit-user-dialog';
import { DeleteUserAlert } from './_components/delete-user-alert';
import { SetTargetDialog } from './_components/set-target-dialog';
import { GrantBonusDialog } from './_components/grant-bonus-dialog';

const roleText: Partial<Record<UserProfile['role'], string>> = {
  'Admin': 'أدمن',
  'OrdersManager': 'مدير طلبات',
  'FinanceManager': 'مدير مالي',
  'Dropshipper': 'مسوق',
};

const levelText: Record<NonNullable<UserProfile['level']>, string> = {
    'Beginner Marketer': 'مسوق مبتدئ',
    'Professional Marketer': 'مسوق محترف',
    'Gold Partner': 'شريك ذهبي',
    'Platinum Partner': 'شريك بلاتيني',
};

export default function AdminUsersPage() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const { user: currentUser } = useSession();

    const [userToEdit, setUserToEdit] = useState<UserProfile | null>(null);
    const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
    const [userToSetTarget, setUserToSetTarget] = useState<UserProfile | null>(null);
    const [userToGrantBonus, setUserToGrantBonus] = useState<UserProfile | null>(null);

    const usersQuery = useMemoFirebase(
        () => (firestore ? query(collection(firestore, "users"), orderBy("createdAt", "desc")) : null),
        [firestore]
    );
    const { data: users, isLoading, error } = useCollection<UserProfile>(usersQuery);

    const handleDelete = async () => {
        if (!firestore || !userToDelete) return;
        
        // As an extra precaution, Admins cannot delete themselves
        if (userToDelete.id === currentUser?.uid) {
            toast({ variant: 'destructive', title: 'لا يمكن حذف الحساب', description: 'لا يمكنك حذف حسابك الخاص من هنا.' });
            setUserToDelete(null);
            return;
        }

        // NOTE: This only deletes the Firestore user profile. The Auth user remains.
        // A robust implementation would use a Cloud Function to delete the Auth user too.
        const userRef = doc(firestore, "users", userToDelete.id);
        
        try {
            await deleteDoc(userRef);
            setUserToDelete(null);
        } catch (e) {
            console.error('Failed to delete user:', e);
            toast({ variant: 'destructive', title: 'فشل حذف المستخدم', description: 'قد لا تملك الصلاحيات الكافية.' });
        }
    };
    
    if (error) {
        return <p className="text-destructive">خطأ في تحميل المستخدمين: {error.message}</p>;
    }
    
    return (
        <div className="space-y-6">
             <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">إدارة المستخدمين</h1>
                    <p className="text-muted-foreground">عرض وتعديل صلاحيات جميع مستخدمي المنصة.</p>
                </div>
                <AddUserDialog />
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
                            {users?.length === 0 ? (
                                <div className="text-center py-16">
                                    <h3 className="text-lg font-semibold">لا يوجد مستخدمون</h3>
                                    <p className="text-muted-foreground mt-2">ابدأ بإضافة مستخدم جديد.</p>
                                </div>
                            ) : (
                                users?.map(user => (
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
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon"><MoreHorizontal /></Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>الإجراءات</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => setUserToEdit(user)}><Edit className="me-2"/> تعديل البيانات والصلاحيات</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => setUserToSetTarget(user)}><ShieldCheck className="me-2"/> تحديد الهدف</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => setUserToGrantBonus(user)}><Award className="me-2"/> منح مكافأة / خصم</DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem 
                                                        className="text-destructive" 
                                                        onClick={() => setUserToDelete(user)}
                                                        disabled={user.id === currentUser?.uid}
                                                    >
                                                        <Trash2 className="me-2"/> حذف المستخدم
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

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
            <SetTargetDialog
                user={userToSetTarget}
                isOpen={!!userToSetTarget}
                onOpenChange={(isOpen) => !isOpen && setUserToSetTarget(null)}
            />
             <GrantBonusDialog
                user={userToGrantBonus}
                isOpen={!!userToGrantBonus}
                onOpenChange={(isOpen) => !isOpen && setUserToGrantBonus(null)}
            />
        </div>
    );
}
