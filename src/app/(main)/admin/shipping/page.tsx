
'use client';

import { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreHorizontal,
  Truck,
  Package,
  CheckCircle,
  XCircle,
  Hourglass,
  DollarSign,
  Printer,
  Search,
  FileText,
  RefreshCw,
  Info,
} from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, Timestamp, where } from 'firebase/firestore';
import type { Shipment, ShipmentEvent, Order } from '@/lib/types';
import { useSession } from '@/auth/SessionProvider';
import { Skeleton, RefreshIndicator } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmedOrdersTable } from './_components/confirmed-orders-table';
import { ShipmentDetailsDrawer } from '@/components/shared/shipment-details-drawer';

// Helper components
const StatCard = ({ title, value, icon, isLoading }: { title: string; value: string | number; icon: React.ReactNode; isLoading: boolean }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            {icon}
        </CardHeader>
        <CardContent>
            {isLoading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{value}</div>}
        </CardContent>
    </Card>
);

const statusText: { [key: string]: string } = {
  CREATED: 'تم الإنشاء',
  PICKUP_SCHEDULED: 'في انتظار المندوب',
  IN_TRANSIT: 'قيد النقل',
  OUT_FOR_DELIVERY: 'خرجت للتوصيل',
  DELIVERED: 'تم التوصيل',
  FAILED: 'فشل التوصيل',
  RETURNED: 'مرتجع',
  CANCELED: 'ملغاة',
};

const statusColorClass: { [key: string]: string } = {
  DELIVERED: 'bg-green-500',
  IN_TRANSIT: 'bg-blue-500',
  OUT_FOR_DELIVERY: 'bg-sky-500',
  PICKUP_SCHEDULED: 'bg-yellow-500',
  CREATED: 'bg-gray-400',
  FAILED: 'bg-orange-500',
  RETURNED: 'bg-red-500',
  CANCELED: 'bg-zinc-600',
};


export default function ShippingManagementPage() {
    const firestore = useFirestore();
    const { isAdmin, isOrdersManager, isLoading: isRoleLoading } = useSession();
    const canAccess = isAdmin || isOrdersManager;
    
    const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    
    const [activeTab, setActiveTab] = useState('confirmed-orders');
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    const shipmentsQuery = useMemoFirebase(() => {
        if (!firestore || !canAccess) return null;
        return query(collection(firestore, 'shipments'));
    }, [firestore, canAccess]);

    const { data: shipments, isLoading: shipmentsLoading, error, lastUpdated } = useCollection<Shipment>(shipmentsQuery);

     // Fetch confirmed orders
    const confirmedOrdersQuery = useMemoFirebase(() => {
        if (!firestore || !canAccess) return null;
        return query(collection(firestore, 'orders'), where('status', '==', 'Confirmed'), orderBy('createdAt', 'desc'));
    }, [firestore, canAccess]);
    const { data: confirmedOrders, isLoading: ordersLoading } = useCollection<Order>(confirmedOrdersQuery);
    
    const isLoading = isRoleLoading || shipmentsLoading || ordersLoading;

    const summaryStats = useMemo(() => {
        if (!shipments) return { pending: 0, inTransit: 0, delivered: 0, failed: 0 };
        return {
            pending: shipments.filter(s => s.status === 'CREATED' || s.status === 'PICKUP_SCHEDULED').length,
            inTransit: shipments.filter(s => s.status === 'IN_TRANSIT' || s.status === 'OUT_FOR_DELIVERY').length,
            delivered: shipments.filter(s => s.status === 'DELIVERED').length,
            failed: shipments.filter(s => s.status === 'FAILED' || s.status === 'RETURNED' || s.status === 'CANCELED').length,
        };
    }, [shipments]);

    const filteredShipments = useMemo(() => {
        if (!shipments) return [];
        const sortedShipments = [...shipments].sort((a,b) => (b.createdAt?.toDate?.()?.getTime() || 0) - (a.createdAt?.toDate?.()?.getTime() || 0));
        return sortedShipments.filter(s => {
            const statusMatch = statusFilter === 'all' || s.status === statusFilter;
            const searchMatch = searchTerm === '' || s.orderId.includes(searchTerm) || s.bostaTrackingNumber.includes(searchTerm);
            return statusMatch && searchMatch;
        });
    }, [shipments, statusFilter, searchTerm]);

    const handleViewDetails = (shipment: Shipment) => {
        setSelectedShipment(shipment);
        setIsDrawerOpen(true);
    };

    const handleShipmentCreated = () => {
        setStatusFilter('all');
        setSearchTerm('');
        setActiveTab('current-shipments');
    };
    
    if (!canAccess && !isLoading) {
        return <p>You do not have permission to view this page.</p>;
    }

    return (
        <>
            <div className="space-y-8">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">إدارة الشحن</h1>
                        <p className="text-muted-foreground mt-1">تتبع وإدارة جميع الشحنات الخاصة بك من مكان واحد.</p>
                    </div>
                    <RefreshIndicator isLoading={isLoading} lastUpdated={lastUpdated} />
                </div>
                
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <StatCard title="في انتظار المندوب" value={summaryStats.pending} icon={<Hourglass />} isLoading={isLoading} />
                    <StatCard title="قيد النقل" value={summaryStats.inTransit} icon={<Truck />} isLoading={isLoading} />
                    <StatCard title="تم التوصيل" value={summaryStats.delivered} icon={<CheckCircle />} isLoading={isLoading} />
                    <StatCard title="فشل/مرتجع" value={summaryStats.failed} icon={<XCircle />} isLoading={isLoading} />
                </div>

                 <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="confirmed-orders">
                            طلبات جاهزة للشحن ({confirmedOrders?.length || 0})
                        </TabsTrigger>
                        <TabsTrigger value="current-shipments">
                            الشحنات الحالية ({shipments?.length || 0})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="confirmed-orders" className="mt-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>الطلبات المؤكدة</CardTitle>
                                <CardDescription>هذه الطلبات تم تأكيدها وجاهزة لإنشاء بوليصة شحن لها عبر بوسطة.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ConfirmedOrdersTable 
                                    orders={confirmedOrders || []} 
                                    isLoading={ordersLoading} 
                                    onShipmentCreated={handleShipmentCreated}
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="current-shipments" className="mt-6">
                        <Card>
                            <CardHeader>
                                <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                                     <CardTitle>قائمة الشحنات</CardTitle>
                                     <div className="flex gap-2 w-full md:w-auto">
                                        <div className="relative flex-1">
                                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input placeholder="ابحث برقم الطلب أو التتبع..." className="pr-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                                        </div>
                                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                                            <SelectTrigger className="w-[180px]">
                                                <SelectValue placeholder="فلترة حسب الحالة" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">كل الحالات</SelectItem>
                                                {Object.keys(statusText).map(key => (
                                                    <SelectItem key={key} value={key}>{statusText[key]}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                     </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                 <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>رقم الطلب</TableHead>
                                            <TableHead>رقم التتبع</TableHead>
                                            <TableHead>تاريخ الإنشاء</TableHead>
                                            <TableHead>مبلغ التحصيل</TableHead>
                                            <TableHead>الحالة</TableHead>
                                            <TableHead className="text-end">الإجراءات</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoading ? Array.from({length: 5}).map((_, i) => (
                                            <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-10" /></TableCell></TableRow>
                                        )) : filteredShipments.map((shipment) => (
                                            <TableRow key={shipment.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => handleViewDetails(shipment)}>
                                                <TableCell className="font-medium">#{shipment.orderId.substring(0,7).toUpperCase()}</TableCell>
                                                <TableCell className="text-muted-foreground">{shipment.bostaTrackingNumber}</TableCell>
                                                <TableCell>{shipment.createdAt && format(shipment.createdAt.toDate(), 'yyyy-MM-dd')}</TableCell>
                                                <TableCell className="font-semibold">{shipment.codAmount?.toFixed(2)} ج.م</TableCell>
                                                <TableCell>
                                                    <Badge style={{ backgroundColor: statusColorClass[shipment.status] }} className="text-white text-xs">
                                                        {statusText[shipment.status] || shipment.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-end">
                                                     <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button aria-haspopup="true" size="icon" variant="ghost" onClick={(e) => e.stopPropagation()}>
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuLabel>إجراءات</DropdownMenuLabel>
                                                            <DropdownMenuItem onClick={() => handleViewDetails(shipment)}>عرض التفاصيل</DropdownMenuItem>
                                                            <DropdownMenuItem onClick={(e) => {e.stopPropagation(); window.open(shipment.labelUrl, '_blank')}}>طباعة البوليصة</DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {!isLoading && filteredShipments.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={6} className="h-24 text-center">
                                                    {error ? `خطأ: ${error.message}` : 'لا توجد شحنات تطابق الفلاتر المحددة.'}
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                 </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
            
            <ShipmentDetailsDrawer
                shipment={selectedShipment}
                isOpen={isDrawerOpen}
                onOpenChange={setIsDrawerOpen}
            />
        </>
    );
}

    