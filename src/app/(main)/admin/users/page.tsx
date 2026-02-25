
'use client';

import { useState, useMemo, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AddUserDialog } from "./_components/add-user-dialog"
import { EditUserDialog } from "./_components/edit-user-dialog";
import { DeleteUserAlert } from "./_components/delete-user-alert";
import { SetTargetDialog } from "./_components/set-target-dialog";
import { useFirestore, errorEmitter, FirestorePermissionError, useCollection, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, doc, updateDoc, deleteDoc, writeBatch, Timestamp, limit, orderBy } from "firebase/firestore";
import type { UserProfile } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSession } from "@/auth/SessionProvider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MoreHorizontal, Wifi, WifiOff, Gift, Activity } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { GrantBonusDialog } from "./_components/grant-bonus-dialog";
import { cn } from "@/lib/utils";


const levelTranslation: Record<string, string> = {
    'Beginner Marketer': 'مسوق مبتدئ',
    'Professional Marketer': 'مسوق محترف',
    'Gold Partner': 'شريك ذهبي',
    'Platinum Partner': 'شريك بلاتيني'
};

const levelColor: Record<string, string> = {
    'Beginner Marketer': 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    'Professional Marketer': 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    'Gold Partner': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    'Platinum Partner': 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20'
};

const OnlineStatus = ({ lastSeen }: { lastSeen?: Timestamp }) => {
    const [isOnline, setIsOnline] = useState<boolean | null>(null);

    useEffect(() => {
        if (!lastSeen) {
            setIsOnline(false);
            return;
        }

        const updateStatus = () => {
            const isCurrentlyOnline = lastSeen.toDate() > new Date(Date.now() - 5 * 60 * 1000);
            setIsOnline(isCurrentlyOnline);
        };

        updateStatus();
        const intervalId = setInterval(updateStatus, 60000); // Check every minute

        return () => clearInterval(intervalId);
    }, [lastSeen]);

    if (isOnline === null) {
        return <Skeleton className="h-5 w-20" />;
    }

    return (
        <div className="flex items-center gap-2 font-semibold">
            {isOnline
                ? <><Wifi className="h-4 w-4 text-green-500" /><span>متصل</span></>
                : <><WifiOff className="h-4 w-4 text-red-500" /><span>غير متصل</span></>
            }
        </div>
    );
};


export default function AdminUsersPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { isAdmin, isLoading: isRoleLoading } = useSession();
  const { user } = useUser();

  const [userToEdit, setUserToEdit] = useState<UserProfile | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [userToSetTarget, setUserToSetTarget] = useState<UserProfile | null>(null);
  const [userToGrantBonus, setUserToGrantBonus] = useState<UserProfile | null>(null);

  const canAccess = !isRoleLoading && isAdmin;

  const usersQuery = useMemoFirebase(() => (canAccess && firestore && user) ? query(collection(firestore, "users"), orderBy('createdAt', 'desc'), limit(100)) : null, [firestore, canAccess, user]);

  const { data: allUsers, isLoading: usersLoading, setData: setAllUsers } = useCollection<UserProfile>(usersQuery);

  const isLoading = isRoleLoading || usersLoading;

  const { dropshippers, staff } = useMemo(() => {
    if (!allUsers) {
        return { dropshippers: [], staff: [] };
    }
    const staffRoles: UserProfile['role'][] = ['Admin', 'OrdersManager', 'FinanceManager', 'ProductManager'];
    const dropshippersList = allUsers.filter(u => u.role === 'Dropshipper');
    const staffList = allUsers.filter(u => staffRoles.includes(u.role));
    return { dropshippers: dropshippersList, staff: staffList };
  }, [allUsers]);

  const handleToggleUserStatus = (userId: string, newStatus: boolean) => {
    if (!firestore || !allUsers) return;
    const userDocRef = doc(firestore, "users", userId);
    
    setAllUsers(prev => (prev || []).map(u => u.id === userId ? { ...u, isActive: newStatus } : u));
    toast({ title: newStatus ? "جاري تفعيل الحساب..." : "جاري إيقاف الحساب..." });
    
    updateDoc(userDocRef, { isActive: newStatus })
        .then(() => {
            toast({ title: "تم تحديث حالة المستخدم بنجاح" });
        })
        .catch(async (e) => {
            setAllUsers(allUsers);
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: userDocRef.path, operation: 'update', requestResourceData: { isActive: newStatus }}));
            toast({ variant: "destructive", title: "حدث خطأ", description: "قد لا تملك الصلاحيات الكافية." });
        });
  };

  const handleDeleteUser = () => {
    if (!userToDelete || !firestore || !allUsers) return;

    const userToDeleteCache = userToDelete;
    setAllUsers(prev => (prev || []).filter(u => u.id !== userToDeleteCache.id));
    setUserToDelete(null);
    toast({ title: "تم حذف المستخدم بنجاح" });

    const userDocRef = doc(firestore, "users", userToDeleteCache.id);
    const batch = writeBatch(firestore);

    batch.delete(userDocRef);

    if (userToDeleteCache.role !== 'Dropshipper') {
        let roleCollectionName = '';
        if (userToDeleteCache.role === 'Admin') roleCollectionName = 'roles_admin';
        else if (userToDeleteCache.role === 'OrdersManager') roleCollectionName = 'roles_orders_manager';
        else if (userToDeleteCache.role === 'FinanceManager') roleCollectionName = 'roles_finance_manager';
        else if (userToDeleteCache.role === 'ProductManager') roleCollectionName = 'roles_product_manager';
        
        if (roleCollectionName) {
            const roleDocRef = doc(firestore, roleCollectionName, userToDeleteCache.id);
            batch.delete(roleDocRef);
        }
    }
    
    batch.commit()
        .catch(async (e) => {
            setAllUsers(allUsers);
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `batch delete for user ${userToDeleteCache.id}`, operation: 'delete' }));
            toast({ variant: "destructive", title: "حدث خطأ أثناء الحذف" });
        });
  };

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">إدارة المستخدمين</h1>
            <p className="text-muted-foreground">نظرة شاملة على أداء وحسابات جميع المستخدمين.</p>
        </div>
        <AddUserDialog />
      </div>

       <Tabs defaultValue="dropshippers" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dropshippers">المسوقين ({isLoading ? '...' : dropshippers.length})</TabsTrigger>
            <TabsTrigger value="staff">الموظفين ({isLoading ? '...' : staff.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="dropshippers" className="mt-8">
            <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
                {isLoading && Array.from({length: 3}).map((_, i) => (<Card key={i} className="rounded-2xl"><CardHeader className="p-6"><Skeleton className="h-16 w-16 rounded-full" /></CardHeader><CardContent className="p-6 pt-0"><Skeleton className="h-24 w-full" /></CardContent></Card>))}
                {!isLoading && dropshippers.length > 0 ? (
                  dropshippers.map((profile) => {
                    const userLevel = profile.level || 'Beginner Marketer';
                    
                    return (
                    <Card key={profile.id} className="flex flex-col bg-card/60 backdrop-blur-sm border-border/30 rounded-2xl shadow-lg transition-all duration-300 hover:shadow-primary/10 hover:-translate-y-1">
                       <CardHeader className="flex flex-col items-center text-center p-6">
                           <Avatar className="h-20 w-20 border-2 border-primary/50"><AvatarImage src={profile.photoURL || `https://avatar.vercel.sh/${profile.id}.png`} alt={profile.firstName} /><AvatarFallback>{profile.firstName?.[0]}{profile.lastName?.[0]}</AvatarFallback></Avatar>
                           <h2 className="text-2xl font-bold pt-4">{profile.firstName} {profile.lastName}</h2>
                           <p className="text-base text-muted-foreground">{profile.email}</p>
                           <div className="pt-4 flex gap-2 justify-center flex-wrap">
                                <Badge variant={profile.isActive ? 'default' : 'secondary'} className={cn(profile.isActive ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-zinc-700/50 text-zinc-400 border-zinc-500/20', "text-sm")}>{profile.isActive ? 'نشط' : 'غير نشط'}</Badge>
                                <Badge variant="outline" className={cn("font-semibold text-sm", levelColor[userLevel] || levelColor['Beginner Marketer'])}>{levelTranslation[userLevel] || userLevel}</Badge>
                            </div>
                       </CardHeader>
                       <CardContent className="p-6 pt-0 flex-grow">
                            <div className="flex items-center justify-between text-base p-3 rounded-lg bg-muted/50">
                                <span className="text-muted-foreground">حالة الاتصال</span>
                                <OnlineStatus lastSeen={profile.lastSeen} />
                            </div>
                       </CardContent>
                       <CardFooter className="p-6 pt-0">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button aria-haspopup="true" size="icon" variant="ghost" className="ms-auto">
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">Toggle menu</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>إجراءات</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => setUserToEdit(profile)}>تعديل البيانات</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setUserToSetTarget(profile)}>تحديد التارجت</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setUserToGrantBonus(profile)}>
                                        <Gift className="me-2 h-4 w-4" />
                                        منح مكافأة/خصم
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleToggleUserStatus(profile.id, !profile.isActive)}>
                                    {profile.isActive ? 'إيقاف الحساب' : 'تفعيل الحساب'}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-destructive" onClick={() => setUserToDelete(profile)}>
                                    حذف الحساب
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                       </CardFooter>
                    </Card>
                  )})
                ) : (
                  !isLoading && <Card className="md:col-span-2 xl:col-span-3"><CardContent className="p-8 text-center text-muted-foreground">لا يوجد مسوقين لعرضهم.</CardContent></Card>
                )}
            </div>
        </TabsContent>
        <TabsContent value="staff" className="mt-8">
           <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
                {isLoading && Array.from({length: 2}).map((_, i) => (<Card key={i} className="rounded-2xl"><CardHeader className="p-6"><Skeleton className="h-16 w-16 rounded-full" /></CardHeader><CardContent className="p-6 pt-0"><Skeleton className="h-24 w-full" /></CardContent></Card>))}
                {!isLoading && staff.length > 0 ? (
                  staff.map((profile) => {
                    return (
                    <Card key={profile.id} className="flex flex-col bg-card/60 backdrop-blur-sm border-border/30 rounded-2xl shadow-lg transition-all duration-300 hover:shadow-primary/10 hover:-translate-y-1">
                        <CardHeader className="flex-row items-start gap-4 p-6">
                            <Avatar className="h-16 w-16 border-2 border-primary/50"><AvatarImage src={profile.photoURL || `https://avatar.vercel.sh/${profile.id}.png`} alt={profile.firstName} /><AvatarFallback>{profile.firstName?.[0]}{profile.lastName?.[0]}</AvatarFallback></Avatar>
                            <div className="flex-1 space-y-1">
                                <h2 className="text-2xl font-bold">{profile.firstName} {profile.lastName}</h2>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-sm border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-400">{profile.role}</Badge>
                                  <Badge variant={profile.isActive ? 'default' : 'secondary'} className={cn(profile.isActive ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-zinc-700/50 text-zinc-400 border-zinc-500/20', 'text-sm')}>{profile.isActive ? 'نشط' : 'غير نشط'}</Badge>
                                </div>
                            </div>
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button aria-haspopup="true" size="icon" variant="ghost">
                                        <MoreHorizontal className="h-4 w-4" />
                                        <span className="sr-only">Toggle menu</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>إجراءات</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => setUserToEdit(profile)}>تعديل البيانات</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setUserToSetTarget(profile)}>
                                        <Activity className="me-2 h-4 w-4" />
                                        تحديد الهدف
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setUserToGrantBonus(profile)}>
                                        <Gift className="me-2 h-4 w-4" />
                                        منح مكافأة/خصم
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleToggleUserStatus(profile.id, !profile.isActive)}>{profile.isActive ? 'إيقاف الحساب' : 'تفعيل الحساب'}</DropdownMenuItem>
                                    <DropdownMenuItem className="text-destructive" onClick={() => setUserToDelete(profile)}>حذف الحساب</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </CardHeader>
                        <CardContent className="space-y-4 p-6 pt-0">
                            <div className="flex items-center justify-between text-base p-4 rounded-lg bg-muted/50">
                                <span className="text-muted-foreground">حالة الوردية</span>
                                <Badge variant={profile.shiftStatus === 'on' ? "default" : "outline"} className={cn(profile.shiftStatus === 'on' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-zinc-700/50 text-zinc-400 border-zinc-500/20')}>{profile.shiftStatus === 'on' ? 'في وردية' : 'خارج وردية'}</Badge>
                            </div>
                            <div className="flex items-center justify-between text-base p-4 rounded-lg bg-muted/50">
                                <span className="text-muted-foreground">حالة الاتصال</span>
                                <OnlineStatus lastSeen={profile.lastSeen} />
                            </div>
                        </CardContent>
                    </Card>
                )})
                ) : (
                  !isLoading && <Card className="md:col-span-2 xl:col-span-3"><CardContent className="p-8 text-center text-muted-foreground">لا يوجد موظفين لعرضهم.</CardContent></Card>
                )}
           </div>
        </TabsContent>
      </Tabs>

      <EditUserDialog user={userToEdit} isOpen={!!userToEdit} onOpenChange={(isOpen) => !isOpen && setUserToEdit(null)} />
      <DeleteUserAlert user={userToDelete} isOpen={!!userToDelete} onOpenChange={(isOpen) => !isOpen && setUserToDelete(null)} onConfirm={handleDeleteUser} />
      <SetTargetDialog user={userToSetTarget} isOpen={!!userToSetTarget} onOpenChange={(isOpen) => !isOpen && setUserToSetTarget(null)} />
      <GrantBonusDialog user={userToGrantBonus} isOpen={!!userToGrantBonus} onOpenChange={(isOpen) => !isOpen && setUserToGrantBonus(null)} />
    </>
  )
}
