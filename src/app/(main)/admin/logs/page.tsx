
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, FirestoreError } from 'firebase/firestore';
import type { AuditLog, UserProfile } from '@/lib/types';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Skeleton, RefreshIndicator } from "@/components/ui/skeleton";
import { useSession } from '@/auth/SessionProvider';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, File, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { exportToExcel } from '@/lib/export';
import { useToast } from '@/hooks/use-toast';

type EnrichedAuditLog = AuditLog & { userName: string; userRole?: UserProfile['role'] };

type ActionBadgeVariant = "default" | "secondary" | "destructive" | "outline";

const getActionBadgeVariant = (action: string): ActionBadgeVariant => {
    const lowerCaseAction = action.toLowerCase();
    if (lowerCaseAction.includes('create') || lowerCaseAction.includes('add')) return 'default';
    if (lowerCaseAction.includes('update') || lowerCaseAction.includes('set') || lowerCaseAction.includes('edit')) return 'secondary';
    if (lowerCaseAction.includes('delete') || lowerCaseAction.includes('remove') || lowerCaseAction.includes('reject')) return 'destructive';
    if (lowerCaseAction.includes('login') || lowerCaseAction.includes('sign-in')) return 'outline';
    return 'outline';
};

const LogDetailsDialog = ({ log }: { log: EnrichedAuditLog | null }) => {
    if (!log) return null;
    let oldValue, newValue;
    try {
        oldValue = log.oldValue ? JSON.parse(log.oldValue) : null;
        newValue = log.newValue ? JSON.parse(log.newValue) : null;
    } catch (e) {
        // Keep as string if parsing fails
        oldValue = log.oldValue;
        newValue = log.newValue;
    }

    return (
        <DialogContent className="max-w-2xl">
            <DialogHeader>
                <DialogTitle>تفاصيل النشاط</DialogTitle>
                <DialogDescription>تفاصيل كاملة حول الإجراء الذي تم.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 text-sm">
                 <div className="flex justify-between"><span className="text-muted-foreground">المستخدم:</span><span className="font-medium">{log.userName} ({log.userRole})</span></div>
                 <div className="flex justify-between"><span className="text-muted-foreground">الإجراء:</span><Badge variant={getActionBadgeVariant(log.action)}>{log.action}</Badge></div>
                 <div className="flex justify-between"><span className="text-muted-foreground">الكيان:</span><span className="font-medium">{log.entityType}</span></div>
                 <div className="flex justify-between"><span className="text-muted-foreground">معرف الكيان:</span><span className="font-mono text-xs">{log.entityId}</span></div>
                 <div className="flex justify-between"><span className="text-muted-foreground">الوقت:</span><span className="font-medium">{log.createdAt && typeof log.createdAt.toDate === 'function' ? format(log.createdAt.toDate(), 'PPPp', { locale: ar }) : 'N/A'}</span></div>
                 
                 {(oldValue || newValue) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                        {oldValue && (
                            <div className="space-y-2">
                                <h3 className="font-semibold">القيم قبل التعديل</h3>
                                <pre className="p-2 bg-muted rounded-md text-xs max-h-60 overflow-auto">{typeof oldValue === 'object' ? JSON.stringify(oldValue, null, 2) : oldValue}</pre>
                            </div>
                        )}
                        {newValue && (
                            <div className="space-y-2">
                                <h3 className="font-semibold">القيم بعد التعديل</h3>
                                <pre className="p-2 bg-muted rounded-md text-xs max-h-60 overflow-auto">{typeof newValue === 'object' ? JSON.stringify(newValue, null, 2) : newValue}</pre>
                            </div>
                        )}
                    </div>
                 )}
            </div>
        </DialogContent>
    );
};


export default function AdminLogsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { isAdmin, isLoading: isRoleLoading } = useSession();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [selectedLog, setSelectedLog] = useState<EnrichedAuditLog | null>(null);

  const auditLogsQuery = useMemoFirebase(() => {
    if (isRoleLoading || !firestore || !isAdmin) return null;
    return query(collection(firestore, 'auditLogs'));
  }, [firestore, isAdmin, isRoleLoading]);
  
  const usersQuery = useMemoFirebase(() => {
    if (isRoleLoading || !firestore || !isAdmin) return null;
    return collection(firestore, 'users');
  }, [firestore, isAdmin, isRoleLoading]);

  const { data: logs, isLoading: logsLoading, error: logsError, lastUpdated: logsLastUpdated } = useCollection<AuditLog>(auditLogsQuery);
  const { data: usersData, isLoading: usersLoading, error: usersError, lastUpdated: usersLastUpdated } = useCollection<UserProfile>(usersQuery);

  const usersMap = useMemo(() => {
    const map = new Map<string, { name: string; role: UserProfile['role'] }>();
    if (usersData) {
        usersData.forEach(user => {
            const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'مستخدم غير معروف';
            map.set(user.id, { name: userName, role: user.role });
        });
    }
    return map;
  }, [usersData]);

  const enrichedLogs = useMemo((): EnrichedAuditLog[] => {
    if (!logs || usersLoading) return [];
    const sortedLogs = [...logs].sort((a, b) => (b.createdAt?.toDate?.()?.getTime() || 0) - (a.createdAt?.toDate?.()?.getTime() || 0));
    return sortedLogs.map(log => ({
        ...log,
        userName: usersMap.get(log.userId)?.name || `مستخدم (${log.userId.substring(0,5)})`,
        userRole: usersMap.get(log.userId)?.role
    }));
  }, [logs, usersMap, usersLoading]);

  const uniqueActionTypes = useMemo(() => {
      const actions = new Set(enrichedLogs.map(log => log.action));
      return ['all', ...Array.from(actions)];
  }, [enrichedLogs]);
  
  const filteredLogs = useMemo(() => {
      const staffRoles: UserProfile['role'][] = ['Admin', 'OrdersManager', 'FinanceManager', 'ProductManager'];
      return enrichedLogs.filter(log => {
          const searchLower = searchTerm.toLowerCase();
          const role = log.userRole;

          const searchMatch = !searchTerm || 
              log.userName.toLowerCase().includes(searchLower) ||
              log.action.toLowerCase().includes(searchLower) ||
              log.entityType.toLowerCase().includes(searchLower) ||
              log.entityId.toLowerCase().includes(searchLower);

          const roleMatch = roleFilter === 'all' ||
              (roleFilter === 'staff' && role && staffRoles.includes(role)) ||
              (roleFilter === 'dropshipper' && role === 'Dropshipper') ||
              (roleFilter === 'admin' && role === 'Admin');
              
          const actionMatch = actionFilter === 'all' || log.action === actionFilter;

          return searchMatch && roleMatch && actionMatch;
      });
  }, [enrichedLogs, searchTerm, roleFilter, actionFilter]);

  const isLoading = isRoleLoading || logsLoading || usersLoading;
  const combinedError = logsError || usersError;
  const lastUpdated = useMemo(() => {
    const timestamps = [logsLastUpdated, usersLastUpdated].filter(Boolean) as Date[];
    if (timestamps.length === 0) return null;
    return new Date(Math.max(...timestamps.map(t => t.getTime())));
  }, [logsLastUpdated, usersLastUpdated]);
  
  const handleExport = () => {
    if (!filteredLogs || filteredLogs.length === 0) {
      toast({
        variant: "destructive",
        title: "لا توجد بيانات للتصدير",
        description: "الرجاء تغيير الفلاتر للحصول على بيانات.",
      });
      return;
    }
    
    const dataToExport = filteredLogs.map(log => ({
        timestamp: log.createdAt && typeof log.createdAt.toDate === 'function' ? format(log.createdAt.toDate(), 'yyyy-MM-dd HH:mm:ss') : 'N/A',
        userName: log.userName,
        userRole: log.userRole,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
    }));

     exportToExcel(dataToExport, `ActivityLog_${new Date().toISOString().split('T')[0]}`, 'Logs', {
      timestamp: 'الوقت',
      userName: 'المستخدم',
      userRole: 'الدور',
      action: 'الإجراء',
      entityType: 'النوع',
      entityId: 'المعرف',
    });
  }

  return (
    <Dialog onOpenChange={(open) => !open && setSelectedLog(null)}>
        <Card>
        <CardHeader>
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <div className="space-y-1">
                    <CardTitle>سجل النشاط</CardTitle>
                    <CardDescription>عرض سجل بجميع الإجراءات المهمة التي تمت في النظام.</CardDescription>
                </div>
                <RefreshIndicator isLoading={isLoading} lastUpdated={lastUpdated} />
            </div>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="relative">
                    <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="ابحث..." className="w-full pr-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger><SelectValue placeholder="فلتر الدور" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">كل الأدوار</SelectItem>
                        <SelectItem value="admin">الأدمن فقط</SelectItem>
                        <SelectItem value="staff">كل الموظفين</SelectItem>
                        <SelectItem value="dropshipper">المسوقين فقط</SelectItem>
                    </SelectContent>
                </Select>
                 <Select value={actionFilter} onValueChange={setActionFilter}>
                    <SelectTrigger><SelectValue placeholder="فلتر الإجراء" /></SelectTrigger>
                    <SelectContent>
                        {uniqueActionTypes.map(action => (
                             <SelectItem key={action} value={action}>{action === 'all' ? 'كل الإجراءات' : action}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                 <Button variant="outline" onClick={handleExport}><File className="me-2" /> تصدير</Button>
            </div>
        </CardHeader>
        <CardContent>
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead>المستخدم</TableHead>
                <TableHead>الإجراء</TableHead>
                <TableHead>الكيان</TableHead>
                <TableHead>الوقت والتاريخ</TableHead>
                <TableHead className="text-end">التفاصيل</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {isLoading ? (
                Array.from({length: 8}).map((_, i) => (
                    <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                        <TableCell className="text-end"><Skeleton className="h-8 w-16 ms-auto" /></TableCell>
                    </TableRow>
                ))
                ) : combinedError ? (
                    <TableRow>
                        <TableCell colSpan={5} className="text-center text-destructive">
                        فشل تحميل السجلات: {combinedError.message}
                        </TableCell>
                    </TableRow>
                ) : filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-muted/50">
                    <TableCell>
                        <div className="font-medium">{log.userName}</div>
                        <div className="text-xs text-muted-foreground">{log.userRole || 'غير محدد'}</div>
                    </TableCell>
                    <TableCell><Badge variant={getActionBadgeVariant(log.action)}>{log.action}</Badge></TableCell>
                    <TableCell>
                         <div className="font-medium">{log.entityType}</div>
                         <div className="text-xs text-muted-foreground font-mono">{log.entityId}</div>
                    </TableCell>
                    <TableCell className="text-end">
                        {log.createdAt && typeof log.createdAt.toDate === 'function' 
                        ? format(log.createdAt.toDate(), 'yyyy/MM/dd hh:mm a') 
                        : 'N/A'}
                    </TableCell>
                    <TableCell className="text-end">
                         <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => setSelectedLog(log)}>
                                <Eye className="h-4 w-4" />
                            </Button>
                        </DialogTrigger>
                    </TableCell>
                    </TableRow>
                ))
                ) : (
                <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">
                        لا توجد سجلات تطابق الفلاتر المحددة.
                    </TableCell>
                </TableRow>
                )}
            </TableBody>
            </Table>
        </CardContent>
        </Card>
        <LogDetailsDialog log={selectedLog} />
    </Dialog>
  );
}

    