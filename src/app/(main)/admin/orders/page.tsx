

'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { File, MoreHorizontal, ListOrdered, Search, DollarSign, ShoppingCart, Hourglass, Truck, Ban, MessageSquare, Phone, CheckCircle, PackageCheck, AlertTriangle, List, Trash2, Link as LinkIcon, Loader2, FileSearch, Briefcase, ShieldAlert } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent
} from "@/components/ui/dropdown-menu";
import { useFirebase, errorEmitter, FirestorePermissionError, useCollection, useMemoFirebase } from "@/firebase";
import { collection, doc, serverTimestamp, query, deleteDoc, updateDoc, runTransaction, addDoc, writeBatch, orderBy, limit, where } from "firebase/firestore";
import type { Order, UserProfile, Product, StockLedger, Shipment } from "@/lib/types";
import { Skeleton, RefreshIndicator } from "@/components/ui/skeleton";
import { format, isToday } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { exportToExcel } from '@/lib/export';
import { useSession } from '@/auth/SessionProvider';
import { DeleteOrderAlert } from './_components/delete-order-alert';
import { cn } from "@/lib/utils";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { BostaManualShipmentDialog } from './_components/bosta-manual-shipment-dialog';
import { ShipmentDetailsDrawer } from '@/components/shared/shipment-details-drawer';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ClientRelativeTime } from '@/components/shared/client-relative-time';


const statusColorClass: { [key: string]: string } = {
  Delivered: "bg-green-500",
  Shipped: "bg-blue-500",
  'Ready to Ship': 'bg-sky-500',
  Pending: "bg-yellow-500",
  Returned: "bg-red-500",
  Confirmed: "bg-indigo-500",
  Canceled: "bg-gray-500",
};

const statusText: { [key: string]: string } = {
  Pending: "قيد الانتظار",
  Confirmed: "مؤكد",
  'Ready to Ship': 'جاهز للشحن',
  Shipped: "تم الشحن",
  Delivered: "تم التوصيل",
  Returned: "مرتجع",
  Canceled: "ملغي",
};

const paymentMethodText: { [key: string]: string } = {
    'Cash on Delivery': 'عند الاستلام',
    'Vodafone Cash': 'فودافون كاش',
    'InstaPay': 'انستا باي',
    'Telda': 'تيلدا',
    'Bank Transfer': 'تحويل بنكي',
};

const paymentStatusColorClass: { [key: string]: string } = {
    Verified: 'bg-green-500',
    Pending: 'bg-yellow-500',
    Rejected: 'bg-red-500',
};

const paymentStatusText: { [key: string]: string } = {
    Verified: 'مدفوع',
    Pending: 'قيد المراجعة',
    Rejected: 'مرفوض',
};


type OrderWithDropshipper = Order;

const StatCard = ({ title, value, icon, isLoading }: { title: string, value: string | number, icon: React.ReactNode, isLoading: boolean }) => (
    <Card className="bg-card/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
            {icon}
        </CardHeader>
        <CardContent>
            {isLoading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-3xl font-bold">{value}</div>}
        </CardContent>
    </Card>
);

export default function AdminOrdersPage() {
  const { firestore } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();
  const { role, isAdmin, isOrdersManager, isProductManager, isLoading: isRoleLoading, profile, user } = useSession();
  
  const [orderToDelete, setOrderToDelete] = useState<OrderWithDropshipper | null>(null);
  const [orderForBosta, setOrderForBosta] = useState<Order | null>(null);
  const [shipmentToView, setShipmentToView] = useState<Shipment | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [marketerFilter, setMarketerFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const canAccess = isAdmin || isOrdersManager || isProductManager;
  
  const allOrdersQuery = useMemoFirebase(() => {
    if (!firestore || !canAccess || !user) return null;
    
    const baseQuery = query(collection(firestore, 'adminOrders'), orderBy('createdAt', 'desc'), limit(200));

    if (isProductManager) {
        return query(baseQuery, where('merchantId', '==', user.uid));
    }
    
    return baseQuery;
  }, [firestore, canAccess, isAdmin, isOrdersManager, isProductManager, user]);
  
  const { data: allOrders, isLoading: ordersLoading, error: queryError, setData: setAllOrders, lastUpdated } = useCollection<Order>(allOrdersQuery);
  
  const shipmentsQuery = useMemoFirebase(() => (isRoleLoading || !firestore || !canAccess) ? null : query(collection(firestore, 'shipments')), [firestore, canAccess, isRoleLoading]);
  const { data: allShipments, isLoading: shipmentsLoading } = useCollection<Shipment>(shipmentsQuery);

  const isLoading = isRoleLoading || ordersLoading || shipmentsLoading;

  const shipmentsMap = useMemo(() => {
    if (!allShipments) return new Map<string, Shipment>();
    const map = new Map<string, Shipment>();
    allShipments.forEach(shipment => {
      map.set(shipment.orderId, shipment);
    });
    return map;
  }, [allShipments]);


  const dropshippers = useMemo(() => {
    if (!allOrders) return [];
    const uniqueDropshippers = new Map<string, { id: string, name: string }>();
    allOrders.forEach(order => {
        if (!uniqueDropshippers.has(order.dropshipperId)) {
            uniqueDropshippers.set(order.dropshipperId, {
                id: order.dropshipperId,
                name: order.dropshipperName || `مسوق (${order.dropshipperId.substring(0,5)})`
            });
        }
    });
    return Array.from(uniqueDropshippers.values()).sort((a,b) => a.name.localeCompare(b.name));
  }, [allOrders]);


   const filteredOrders = useMemo(() => {
    if (!allOrders) return [];
    return allOrders.filter(order => {
        const searchMatch = searchTerm.trim() === '' || 
            order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (order.customerName && order.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (order.customerPhone && order.customerPhone.includes(searchTerm));
            
        const statusMatch = statusFilter === 'all' || order.status === statusFilter;
        const marketerMatch = marketerFilter === 'all' || order.dropshipperId === marketerFilter;
        const paymentMatch = paymentFilter === 'all' || order.customerPaymentMethod === paymentFilter;

        return searchMatch && statusMatch && marketerMatch && paymentMatch;
    });
  }, [allOrders, searchTerm, statusFilter, marketerFilter, paymentFilter]);

  useEffect(() => {
    setSelectedOrders([]);
  }, [searchTerm, statusFilter, marketerFilter, paymentFilter]);
  
  const summaryStats = useMemo(() => {
    if (!allOrders || !isClient) return { revenueToday: 0, ordersToday: 0 };
    const todaysLoadedOrders = allOrders.filter(o => o.createdAt && typeof o.createdAt.toDate === 'function' && isToday(o.createdAt.toDate()));
    const revenueToday = todaysLoadedOrders.filter(o => o.status === 'Delivered').reduce((sum, o) => sum + o.totalAmount, 0);
    return {
        revenueToday: revenueToday,
        ordersToday: todaysLoadedOrders.length,
    }
  }, [allOrders, isClient]);

  const handleStatusUpdate = useCallback(async (order: Order, newStatus: string) => {
    if (!firestore || !user || !role || !profile || !allOrders) return;
    
    const originalOrders = [...allOrders];
    setAllOrders(prevOrders => (prevOrders || []).map(o => o.id === order.id ? { ...o, status: newStatus } : o));
    toast({ title: "جاري تحديث حالة الطلب..." });

    const batch = writeBatch(firestore);
    const adminOrderRef = doc(firestore, `adminOrders/${order.id}`);
    const userOrderRef = doc(firestore, `users/${order.dropshipperId}/orders/${order.id}`);

    try {
        if (newStatus === 'Confirmed') {
            if (order.status !== 'Pending') {
                setAllOrders(originalOrders);
                toast({ variant: "destructive", title: "لا يمكن تأكيد الطلب", description: `هذا الطلب في حالة "${statusText[order.status] || order.status}" بالفعل.` });
                return;
            }
            await runTransaction(firestore, async (transaction) => {
                const productRef = doc(firestore, 'products', order.productId);
                const orderDoc = await transaction.get(adminOrderRef);
                const productDoc = await transaction.get(productRef);

                if (!orderDoc.exists()) throw new Error("لم يتم العثور على الطلب.");
                if (!productDoc.exists()) throw new Error("لم يتم العثور على المنتج المرتبط بالطلب.");

                const orderData = orderDoc.data() as Order;
                const productData = productDoc.data() as Product;

                if (orderData.stockApplied) return;

                if (productData.stockQuantity < orderData.quantity) {
                    const stockError = {
                        code: 'INSUFFICIENT_STOCK',
                        message: `الكمية غير كافية للمنتج: ${productData.name}`,
                        item: { productId: productData.id, needed: orderData.quantity, available: productData.stockQuantity }
                    };
                    transaction.update(adminOrderRef, { stockError });
                    transaction.update(userOrderRef, { stockError });
                    throw new Error(stockError.message);
                }

                const newStock = productData.stockQuantity - orderData.quantity;
                transaction.update(productRef, { stockQuantity: newStock, updatedAt: serverTimestamp() });
                
                const stockLedgerRef = doc(collection(firestore, "stockLedger"));
                transaction.set(stockLedgerRef, {
                    id: stockLedgerRef.id, productId: productData.id, orderId: order.id, changeQty: -orderData.quantity,
                    type: 'DEDUCT', reason: 'ORDER_CONFIRMED', createdAt: serverTimestamp(),
                    actor: { userId: user.uid, role: role },
                });
                
                const updatePayload = {
                    status: 'Confirmed', confirmedAt: serverTimestamp(),
                    confirmedBy: { userId: user.uid, role: role },
                    stockApplied: true, stockAppliedAt: serverTimestamp(), stockError: null,
                };
                transaction.update(adminOrderRef, updatePayload);
                transaction.update(userOrderRef, updatePayload);
            });
            toast({ title: "تم تأكيد الطلب وخصم المخزون بنجاح!" });
        } else if (newStatus === 'Canceled' || newStatus === 'Returned') {
            await runTransaction(firestore, async (transaction) => {
                const orderDoc = await transaction.get(adminOrderRef);
                if (!orderDoc.exists()) throw new Error("لم يتم العثور على الطلب.");
                
                const orderData = orderDoc.data() as Order;
                let statusAndStockUpdate: any = { status: newStatus, updatedAt: serverTimestamp() };
                
                if (orderData.stockApplied && !orderData.stockRestored) {
                    const productRef = doc(firestore, 'products', orderData.productId);
                    const productDoc = await transaction.get(productRef);
                    if (productDoc.exists()) {
                        const productData = productDoc.data() as Product;
                        const newStock = productData.stockQuantity + orderData.quantity;
                        transaction.update(productRef, { stockQuantity: newStock, updatedAt: serverTimestamp() });

                        const stockLedgerRef = doc(collection(firestore, "stockLedger"));
                        transaction.set(stockLedgerRef, {
                            id: stockLedgerRef.id, productId: productData.id, orderId: order.id, changeQty: +orderData.quantity,
                            type: 'RESTORE', reason: newStatus === 'Canceled' ? 'ORDER_CANCELLED' : 'ORDER_RETURNED',
                            createdAt: serverTimestamp(), actor: { userId: user.uid, role: role },
                        });
                    }
                    statusAndStockUpdate.stockRestored = true;
                }
                
                transaction.update(adminOrderRef, statusAndStockUpdate);
                transaction.update(userOrderRef, statusAndStockUpdate);
            });
            toast({ title: `تم تحديث حالة الطلب إلى "${statusText[newStatus]}"` });
        } else {
            batch.update(adminOrderRef, { status: newStatus, updatedAt: serverTimestamp() });
            batch.update(userOrderRef, { status: newStatus, updatedAt: serverTimestamp() });
            await batch.commit();
            toast({ title: "تم تحديث حالة الطلب بنجاح" });
        }

        addDoc(collection(firestore, "auditLogs"), {
            userId: user.uid,
            userName: `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() || user.email,
            userRole: role,
            action: `Order status changed`,
            entityType: 'Order',
            entityId: order.id,
            oldValue: JSON.stringify({ status: order.status }),
            newValue: JSON.stringify({ status: newStatus }),
            createdAt: serverTimestamp(),
        }).catch(err => console.error("Failed to write audit log:", err));

    } catch (error: any) {
        setAllOrders(originalOrders); // Revert UI
        toast({ 
            variant: "destructive", 
            title: "فشل تحديث الحالة", 
            description: error.message || "حدث خطأ غير متوقع." 
        });
    }
  }, [firestore, user, role, toast, setAllOrders, allOrders, profile]);
  
  const handleDeleteOrder = async () => {
    if (!orderToDelete || !firestore || !allOrders) return;

    const orderToDeleteCache = { ...orderToDelete };
    const originalOrders = [...allOrders];

    setAllOrders(prev => (prev || []).filter(o => o.id !== orderToDeleteCache.id));
    setOrderToDelete(null); 
    
    const batch = writeBatch(firestore);
    batch.delete(doc(firestore, 'adminOrders', orderToDeleteCache.id));
    batch.delete(doc(firestore, `users/${orderToDeleteCache.dropshipperId}/orders/${orderToDeleteCache.id}`));
    
    try {
        await batch.commit();
        toast({ title: "تم حذف الطلب بنجاح" });
    } catch (error) {
        setAllOrders(originalOrders);
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: `batch delete for order ${orderToDeleteCache.id}`,
            operation: 'delete',
        }));
        toast({ variant: "destructive", title: "فشل حذف الطلب", description: "قد لا تملك الصلاحيات الكافية." });
    }
  };

  const handleShipmentCreated = () => {
    toast({
      title: "تم إنشاء الشحنة بنجاح",
      description: "جاري توجيهك إلى صفحة إدارة الشحن لمتابعة الحالة.",
    });
    router.push('/admin/shipping');
  };

  const handleExport = () => {
    const ordersToExport = selectedOrders.length > 0
        ? (allOrders || []).filter(order => selectedOrders.includes(order.id))
        : filteredOrders;

    if (ordersToExport.length === 0) {
        toast({
            variant: "destructive",
            title: "لا توجد بيانات للتصدير",
            description: "الرجاء تحديد طلبات أولاً أو تغيير الفلاتر.",
        });
        return;
    }

    const dataToExport = ordersToExport.map(order => ({
        id: order.id,
        dropshipperName: order.dropshipperName || 'N/A',
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        customerAddress: order.customerAddress,
        customerCity: order.customerCity,
        productName: order.productName,
        quantity: order.quantity,
        totalAmount: order.totalAmount,
        totalCommission: order.totalCommission || 0,
        status: statusText[order.status] || order.status,
        createdAt: order.createdAt && typeof order.createdAt.toDate === 'function' ? format(order.createdAt.toDate(), 'yyyy-MM-dd') : 'N/A',
    }));

    const headers = {
        id: 'رقم الطلب',
        dropshipperName: 'المسوق',
        customerName: 'العميل',
        customerPhone: 'هاتف العميل',
        customerAddress: 'عنوان العميل',
        customerCity: 'مدينة العميل',
        productName: 'المنتج',
        quantity: 'الكمية',
        totalAmount: 'الإجمالي',
        totalCommission: 'العمولة',
        status: 'الحالة',
        createdAt: 'تاريخ الإنشاء',
    };

    exportToExcel(dataToExport, `Orders_${new Date().toISOString().split('T')[0]}`, 'Orders', headers);
  };
  
  return (
    <TooltipProvider>
      <div className="space-y-8">
        <div className="no-print">
            <h1 className="text-3xl font-bold tracking-tight">إدارة الطلبات</h1>
            <p className="text-muted-foreground">
                عرض وتحديث حالة جميع الطلبات في النظام.
            </p>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2 no-print">
            <StatCard title="إجمالي الإيرادات اليوم (الطلبات المحملة)" value={`${summaryStats.revenueToday.toFixed(2)} ج.م`} icon={<DollarSign className="h-5 w-5 text-muted-foreground" />} isLoading={isLoading} />
            <StatCard title="الطلبات الجديدة اليوم (الطلبات المحملة)" value={summaryStats.ordersToday} icon={<ShoppingCart className="h-5 w-5 text-muted-foreground" />} isLoading={isLoading} />
        </div>

        <Card>
            <CardHeader className="flex-col md:flex-row gap-4 no-print">
                <div className="flex-1 space-y-2">
                    <h3 className="text-lg font-semibold">قائمة الطلبات</h3>
                     <div className="relative">
                        <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input 
                            placeholder="ابحث برقم الطلب، اسم العميل، أو الهاتف..."
                            className="w-full md:w-96 pr-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <div className="grid grid-cols-2 sm:flex gap-2 items-end">
                    <div className="space-y-2">
                        <Label className="text-xs">الحالة</Label>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-full sm:w-36 h-9">
                                <SelectValue placeholder="الحالة" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">الكل</SelectItem>
                                {Object.keys(statusText).map(key => (
                                    <SelectItem key={key} value={key}>{statusText[key]}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label className="text-xs">المسوق</Label>
                        <Select value={marketerFilter} onValueChange={setMarketerFilter}>
                            <SelectTrigger className="w-full sm:w-36 h-9">
                                <SelectValue placeholder="المسوق" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">الكل</SelectItem>
                                {dropshippers.map(user => (
                                    <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button size="sm" variant="outline" className="h-9 gap-1" onClick={handleExport} disabled={isLoading}>
                        <File className="h-4 w-4" />
                        <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                         تصدير
                        </span>
                    </Button>
                </div>
            </CardHeader>
            
            {queryError && (
                <Alert variant="destructive" className="mx-6">
                    <ShieldAlert className="h-4 w-4" />
                    <AlertTitle>خطأ في جلب البيانات</AlertTitle>
                    <AlertDescription>
                        فشل تحميل قائمة الطلبات. قد يكون السبب مشكلة في الصلاحيات أو أن فهرس قاعدة البيانات المطلوب غير موجود.
                        <p className="mt-2 text-xs font-mono">{queryError.message}</p>
                    </AlertDescription>
                </Alert>
            )}


            {selectedOrders.length > 0 && (
                <div className="border-t border-b bg-muted/50 no-print">
                    <div className="container mx-auto flex h-14 items-center gap-4 px-4 sm:px-6">
                        <p className="text-sm font-medium">{selectedOrders.length} طلبات مختارة</p>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-8">تغيير الحالة</Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                                <DropdownMenuLabel>تغيير جماعي للحالة</DropdownMenuLabel>
                                <DropdownMenuItem disabled>لم يتم التنفيذ بعد</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <div className="ms-auto">
                            <Button variant="ghost" size="sm" onClick={() => setSelectedOrders([])}>إلغاء التحديد</Button>
                        </div>
                    </div>
                </div>
            )}
            
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-10 text-center no-print">
                                <Checkbox
                                    checked={filteredOrders.length > 0 && selectedOrders.length === filteredOrders.length}
                                    onCheckedChange={(checked) => {
                                        setSelectedOrders(checked ? filteredOrders.map(o => o.id) : []);
                                    }}
                                />
                            </TableHead>
                            <TableHead>الطلب</TableHead>
                            <TableHead>العميل</TableHead>
                            <TableHead>المسوق</TableHead>
                            <TableHead>التاريخ</TableHead>
                            <TableHead>الحالة</TableHead>
                            <TableHead>الدفع</TableHead>
                            <TableHead className="text-end">الإجمالي</TableHead>
                            <TableHead className="no-print"><span className="sr-only">Actions</span></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && Array.from({length: 8}).map((_, i) => (
                             <TableRow key={i}>
                                <TableCell className="py-4"><Skeleton className="h-5 w-5" /></TableCell>
                                <TableCell className="py-4"><Skeleton className="h-5 w-24" /></TableCell>
                                <TableCell className="py-4"><Skeleton className="h-5 w-32" /></TableCell>
                                <TableCell className="py-4"><Skeleton className="h-5 w-32" /></TableCell>
                                <TableCell className="py-4"><Skeleton className="h-5 w-28" /></TableCell>
                                <TableCell className="py-4"><Skeleton className="h-6 w-24" /></TableCell>
                                <TableCell className="py-4"><Skeleton className="h-6 w-24" /></TableCell>
                                <TableCell className="text-end py-4"><Skeleton className="h-5 w-20 ms-auto" /></TableCell>
                                <TableCell className="py-4 text-end"><Skeleton className="h-8 w-8 ms-auto" /></TableCell>
                           </TableRow>
                        ))}
                        {filteredOrders.map((order) => {
                            const orderDate = order.createdAt?.toDate();
                            const existingShipment = shipmentsMap.get(order.id);

                            return (
                                <TableRow key={order.id} className="hover:bg-muted/50" data-state={selectedOrders.includes(order.id) && 'selected'}>
                                    <TableCell className="text-center no-print">
                                        <Checkbox
                                            checked={selectedOrders.includes(order.id)}
                                            onCheckedChange={(checked) => {
                                                setSelectedOrders(
                                                    checked
                                                    ? [...selectedOrders, order.id]
                                                    : selectedOrders.filter((id) => id !== order.id)
                                                );
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell className="font-medium py-4">
                                        <div className="font-semibold">{order.id.substring(0,7).toUpperCase()}</div>
                                        <div className="text-xs text-muted-foreground">{order.productName}</div>
                                    </TableCell>
                                    <TableCell className="py-4">
                                        <div className="flex items-center gap-2">
                                            <span>{order.customerName}</span>
                                            {order.merchantInfo && (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Briefcase className="h-4 w-4 text-primary cursor-pointer"/>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <div className="space-y-2 p-1 text-sm">
                                                            <p className="font-bold border-b pb-1 mb-1">بيانات التاجر</p>
                                                            <p><strong>الاسم:</strong> {order.merchantInfo.name}</p>
                                                            <p><strong>الهاتف:</strong> <a href={`tel:${order.merchantInfo.phone}`} className="hover:underline">{order.merchantInfo.phone}</a></p>
                                                            <p><strong>واتساب:</strong> <a href={`https://wa.me/${order.merchantInfo.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="hover:underline">{order.merchantInfo.whatsapp}</a></p>
                                                        </div>
                                                    </TooltipContent>
                                                </Tooltip>
                                            )}
                                        </div>
                                        <div className="text-xs text-muted-foreground">{order.customerPhone}</div>
                                    </TableCell>
                                    <TableCell className="py-4">{order.dropshipperName || `مسوق غير معروف (${order.dropshipperId.substring(0,5)})`}</TableCell>
                                    <TableCell className="py-4">
                                        <div className="font-medium">{orderDate ? format(orderDate, 'yyyy/MM/dd') : 'N/A'}</div>
                                        <div className="text-xs text-muted-foreground">
                                            <ClientRelativeTime date={orderDate} />
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-4">
                                      <div className="flex items-center gap-1">
                                        <Badge variant="outline" className="flex items-center gap-2 text-xs">
                                          <span className={cn("h-2 w-2 rounded-full", statusColorClass[order.status] || 'bg-gray-400')} />
                                          <span>{statusText[order.status] || order.status}</span>
                                        </Badge>
                                        {order.stockError && (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <AlertTriangle className="h-4 w-4 text-destructive" />
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>خطأ في المخزون: {order.stockError.message}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell className="py-4">
                                        {order.customerPaymentMethod === 'Cash on Delivery' ? (
                                            <Badge variant="outline">عند الاستلام</Badge>
                                        ) : (
                                            <div className="flex items-center gap-1">
                                                <Badge variant="outline" className="flex items-center gap-2 text-xs">
                                                  <span className={cn("h-2 w-2 rounded-full", paymentStatusColorClass[order.customerPaymentStatus || ''] || 'bg-gray-400')} />
                                                  <span>{paymentStatusText[order.customerPaymentStatus || ''] || order.customerPaymentStatus || 'N/A'}</span>
                                                </Badge>
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-end py-4 font-semibold">{order.totalAmount.toFixed(2)} ج.م</TableCell>
                                    <TableCell className="py-4 text-end no-print">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                            <Button aria-haspopup="true" size="icon" variant="ghost">
                                                <MoreHorizontal className="h-4 w-4" />
                                                <span className="sr-only">Toggle menu</span>
                                            </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>إجراءات سريعة</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => window.open(`https://wa.me/${order.customerPhone.replace(/\D/g, '')}`, '_blank')}><MessageSquare className="me-2 h-4 w-4" />واتساب</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => window.open(`tel:${order.customerPhone.replace(/\D/g, '')}`)}><Phone className="me-2 h-4 w-4" />اتصال</DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                
                                                {order.status === 'Pending' && (
                                                    <DropdownMenuItem onClick={() => handleStatusUpdate(order, 'Confirmed')}>
                                                        <CheckCircle className="me-2 h-4 w-4 text-green-500" />
                                                        تأكيد الطلب وخصم المخزون
                                                    </DropdownMenuItem>
                                                )}

                                                {existingShipment ? (
                                                    <DropdownMenuItem onClick={() => setShipmentToView(existingShipment)}>
                                                        <FileSearch className="me-2 h-4 w-4" />
                                                        عرض تفاصيل الشحنة
                                                    </DropdownMenuItem>
                                                ) : (
                                                    order.status === 'Confirmed' && (
                                                        <DropdownMenuItem onClick={() => setOrderForBosta(order)}>
                                                            <Truck className="me-2 h-4 w-4 text-blue-500" />
                                                            إنشاء شحنة (بوسطة)
                                                        </DropdownMenuItem>
                                                    )
                                                )}

                                                <DropdownMenuSub>
                                                    <DropdownMenuSubTrigger>
                                                        <List className="me-2 h-4 w-4" />
                                                        <span>تغيير حالة (يدوي)</span>
                                                    </DropdownMenuSubTrigger>
                                                    <DropdownMenuPortal>
                                                        <DropdownMenuSubContent>
                                                            {order.status !== 'Delivered' && <DropdownMenuItem onClick={() => handleStatusUpdate(order, 'Delivered')}>تم التوصيل</DropdownMenuItem>}
                                                            <DropdownMenuSeparator />
                                                            {order.status !== 'Returned' && <DropdownMenuItem className="text-destructive" onClick={() => handleStatusUpdate(order, 'Returned')}>مرتجع</DropdownMenuItem>}
                                                            {order.status !== 'Canceled' && <DropdownMenuItem className="text-destructive" onClick={() => handleStatusUpdate(order, 'Canceled')}>ملغي</DropdownMenuItem>}
                                                        </DropdownMenuSubContent>
                                                    </DropdownMenuPortal>
                                                </DropdownMenuSub>

                                                {isAdmin && (
                                                <>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem 
                                                    className="text-destructive" 
                                                    onClick={() => setOrderToDelete(order)}
                                                >
                                                    <Trash2 className="me-2 h-4 w-4" />
                                                    حذف الطلب
                                                </DropdownMenuItem>
                                                </>
                                            )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                         {(!isLoading && filteredOrders.length === 0 && !queryError) && (
                            <TableRow>
                                <TableCell colSpan={9} className="text-center py-16">
                                    <div className="flex flex-col items-center justify-center gap-4">
                                         <ListOrdered className="h-16 w-16 text-muted-foreground/50" />
                                         <p className="text-muted-foreground">
                                          {'لم يتم العثور على طلبات.'}
                                         </p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </div>
      <DeleteOrderAlert
        order={orderToDelete}
        isOpen={!!orderToDelete}
        onOpenChange={(isOpen) => !isOpen && setOrderToDelete(null)}
        onConfirm={handleDeleteOrder}
      />
       <BostaManualShipmentDialog 
        order={orderForBosta}
        link="https://business.bosta.co/signin"
        isOpen={!!orderForBosta}
        onOpenChange={(isOpen) => !isOpen && setOrderForBosta(null)}
        onShipmentCreated={handleShipmentCreated}
    />
      <ShipmentDetailsDrawer
        shipment={shipmentToView}
        isOpen={!!shipmentToView}
        onOpenChange={(isOpen) => !isOpen && setShipmentToView(null)}
      />
    </TooltipProvider>
  );
}
