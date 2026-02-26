'use client';

import { useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, where, doc, deleteDoc } from 'firebase/firestore';
import type { Product } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useSession } from '@/auth/SessionProvider';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Edit, Trash2, BarChart2, Package } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

// Re-using admin components
import { AddProductDialog } from '@/app/(main)/admin/products/_components/add-product-dialog';
import { EditProductDialog } from '@/app/(main)/admin/products/_components/edit-product-dialog';
import { DeleteProductAlert } from '@/app/(main)/admin/products/_components/delete-product-alert';
import { ProductAnalyticsDialog } from '@/app/(main)/admin/products/_components/product-analytics-dialog';
import { UpdateStockDialog } from '@/app/(main)/admin/products/_components/update-stock-dialog';


export default function MerchantProductsPage() {
    const { firestore, user } = useSession();
    const { toast } = useToast();

    // Dialogs State
    const [productToEdit, setProductToEdit] = useState<Product | null>(null);
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);
    const [productToAnalyze, setProductToAnalyze] = useState<Product | null>(null);
    const [productToUpdateStock, setProductToUpdateStock] = useState<Product | null>(null);

    const productsQuery = useMemoFirebase(
        () => (firestore && user) ? query(
            collection(firestore, "products"), 
            where("merchantId", "==", user.uid),
            orderBy("createdAt", "desc")
        ) : null,
        [firestore, user]
    );
    const { data: products, isLoading, error } = useCollection<Product>(productsQuery);

    const handleDelete = async () => {
        if (!firestore || !productToDelete) return;
        const productRef = doc(firestore, "products", productToDelete.id);
        toast({ title: 'جاري حذف المنتج...' });
        try {
            await deleteDoc(productRef);
            toast({ title: 'تم حذف المنتج بنجاح' });
            setProductToDelete(null);
        } catch (e) {
            console.error('Failed to delete product:', e);
            toast({ variant: 'destructive', title: 'فشل حذف المنتج' });
        }
    };
    
     if (error) {
        return <p className="text-destructive">خطأ في تحميل المنتجات: {error.message}</p>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">إدارة منتجاتي</h1>
                    <p className="text-muted-foreground">إضافة وتعديل المنتجات الخاصة بك في المنصة.</p>
                </div>
                <AddProductDialog />
            </div>

            <Card>
                <CardContent className="pt-6">
                    {isLoading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-96" />)}
                        </div>
                    ) : (
                         products?.length === 0 ? (
                            <div className="text-center py-16">
                                <h3 className="text-lg font-semibold">لم تقم بإضافة أي منتجات بعد</h3>
                                <p className="text-muted-foreground mt-2">ابدأ بإضافة منتجك الأول لعرضه على المسوقين.</p>
                                <div className="mt-6"><AddProductDialog /></div>
                            </div>
                        ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {products?.map((product) => (
                                <Card key={product.id} className="overflow-hidden flex flex-col">
                                    <div className="relative">
                                        <Image
                                            src={product.imageUrls?.[0] || `https://picsum.photos/seed/${product.id}/400`}
                                            alt={product.name}
                                            width={400}
                                            height={400}
                                            className="aspect-square object-contain w-full"
                                        />
                                        <Badge className="absolute top-2 right-2" variant={product.isAvailable ? 'default' : 'destructive'}>
                                            {product.isAvailable ? "متاح" : "غير متاح"}
                                        </Badge>
                                    </div>
                                    <CardHeader className="flex-grow">
                                        <CardTitle className="text-lg leading-tight h-12">{product.name}</CardTitle>
                                        <CardDescription>{product.category}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <div className="flex justify-between items-center font-semibold">
                                            <span>السعر:</span>
                                            <span className="text-primary">{product.price.toFixed(2)} ج.م</span>
                                        </div>
                                         <div className="flex justify-between items-center font-semibold">
                                            <span>العمولة:</span>
                                            <span className="text-green-600">{product.commission.toFixed(2)} ج.م</span>
                                        </div>
                                        <div className="flex justify-between items-center font-semibold">
                                            <span>المخزون:</span>
                                            <span>{product.stockQuantity}</span>
                                        </div>
                                    </CardContent>
                                    <div className="p-4 border-t flex items-center justify-end">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>الإجراءات</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => setProductToEdit(product)}><Edit className="me-2"/> تعديل المنتج</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setProductToUpdateStock(product)}><Package className="me-2"/> تحديث المخزون</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setProductToAnalyze(product)}><BarChart2 className="me-2"/> عرض التحليلات</DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => setProductToDelete(product)} className="text-destructive"><Trash2 className="me-2"/> حذف المنتج</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </Card>
                            ))}
                        </div>
                        )
                    )}
                </CardContent>
            </Card>

             <EditProductDialog 
                product={productToEdit}
                isOpen={!!productToEdit}
                onOpenChange={(isOpen) => !isOpen && setProductToEdit(null)}
            />
            <DeleteProductAlert
                product={productToDelete}
                isOpen={!!productToDelete}
                onOpenChange={(isOpen) => !isOpen && setProductToDelete(null)}
                onConfirm={handleDelete}
            />
            <ProductAnalyticsDialog
                product={productToAnalyze}
                isOpen={!!productToAnalyze}
                onOpenChange={(isOpen) => !isOpen && setProductToAnalyze(null)}
            />
             <UpdateStockDialog
                product={productToUpdateStock}
                isOpen={!!productToUpdateStock}
                onOpenChange={(isOpen) => !isOpen && setProductToUpdateStock(null)}
            />
        </div>
    );
}
