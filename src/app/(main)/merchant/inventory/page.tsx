
'use client';

import { useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useSession } from '@/auth/SessionProvider';
import { collection, query, orderBy, where } from 'firebase/firestore';
import type { Product } from '@/lib/types';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import Image from 'next/image';
import { EditableStockCell } from '@/app/(main)/admin/inventory/_components/editable-stock-cell';
import { ClientRelativeTime } from '@/components/shared/client-relative-time';

const MINIMUM_STOCK_LEVEL = 3;

export default function MerchantInventoryPage() {
    const { user } = useSession();
    const firestore = useFirestore();
    const [searchTerm, setSearchTerm] = useState('');

    const productsQuery = useMemoFirebase(
        () => (firestore && user ? query(collection(firestore, 'products'), where('merchantId', '==', user.uid), orderBy('name', 'asc')) : null),
        [firestore, user]
    );
    const { data: products, isLoading: productsLoading, lastUpdated } = useCollection<Product>(productsQuery);

    const filteredProducts = useMemo(() => {
        if (!products) return [];
        const lowerCaseSearch = searchTerm.toLowerCase();
        return products.filter(p => p.name.toLowerCase().includes(lowerCaseSearch));
    }, [products, searchTerm]);

    const getStockStatus = (stock: number) => {
        if (stock === 0) return 'نفد المخزون';
        if (stock < MINIMUM_STOCK_LEVEL) return 'مخزون منخفض';
        return 'متوفر';
    };

    const getStockStatusColor = (stock: number) => {
        if (stock === 0) return 'text-destructive';
        if (stock < MINIMUM_STOCK_LEVEL) return 'text-amber-500';
        return 'text-green-600';
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">إدارة مخزون منتجاتي</h1>
                <p className="text-muted-foreground">تتبع وتحديث كميات منتجاتك في الوقت الفعلي.</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
                <div className="relative flex-1">
                    <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input 
                        placeholder="ابحث عن منتج..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full max-w-sm pr-9"
                    />
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>حالة مخزوني الحالية</CardTitle>
                            <CardDescription>
                                {filteredProducts.length} منتج مطابق للبحث.
                            </CardDescription>
                        </div>
                        <ClientRelativeTime date={lastUpdated} />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[80px]">الصورة</TableHead>
                                    <TableHead>اسم المنتج</TableHead>
                                    <TableHead>الكمية المتاحة</TableHead>
                                    <TableHead>حالة المخزون</TableHead>
                                    <TableHead>تاريخ آخر تحديث</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {productsLoading ? (
                                    Array.from({ length: 3 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-10 w-10" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : filteredProducts.length > 0 ? (
                                    filteredProducts.map(product => (
                                        <TableRow key={product.id}>
                                            <TableCell>
                                                <Image src={product.imageUrls?.[0] || '/placeholder.svg'} alt={product.name} width={40} height={40} className="rounded-md object-cover" />
                                            </TableCell>
                                            <TableCell className="font-medium">{product.name}</TableCell>
                                            <TableCell>
                                                <EditableStockCell product={product} />
                                            </TableCell>
                                            <TableCell>
                                                <span className={`font-semibold ${getStockStatusColor(product.stockQuantity)}`}>
                                                    {getStockStatus(product.stockQuantity)}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-xs">
                                                <ClientRelativeTime date={product.updatedAt?.toDate()} />
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center h-24">
                                            {searchTerm ? "لا توجد منتجات تطابق بحثك." : "لم تقم بإضافة منتجات بعد."}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
