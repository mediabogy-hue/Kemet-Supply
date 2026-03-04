
'use client';

import { useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, doc, deleteDoc, orderBy, limit, updateDoc, serverTimestamp } from 'firebase/firestore';
import type { Product } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Edit, Trash2, Package, Check, X, BarChart2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

import { AddProductDialog } from './_components/add-product-dialog';
import { EditProductDialog } from './_components/edit-product-dialog';
import { DeleteProductAlert } from './_components/delete-product-alert';
import { ProductAnalyticsDialog } from './_components/product-analytics-dialog';
import { UpdateStockDialog } from './_components/update-stock-dialog';

export default function AdminProductsPage() {
    const firestore = useFirestore();
    const { toast } = useToast();

    // Dialogs State
    const [productToEdit, setProductToEdit] = useState<Product | null>(null);
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);
    const [productToAnalyze, setProductToAnalyze] = useState<Product | null>(null);
    const [productToUpdateStock, setProductToUpdateStock] = useState<Product | null>(null);
    
    // Use real-time listener for products, limited for performance
    const productsQuery = useMemoFirebase(
        () => (firestore ? query(collection(firestore, "products"), orderBy("createdAt", "desc"), limit(100)) : null),
        [firestore]
    );
    const { data: products, isLoading, error } = useCollection<Product>(productsQuery);

    // Data is already sorted by the query
    const sortedProducts = useMemo(() => {
        if (!products) return [];
        return products;
    }, [products]);


    const handleDelete = async () => {
        if (!firestore || !productToDelete) return;
        const productRef = doc(firestore, "products", productToDelete.id);
        
        try {
            await deleteDoc(productRef);
            setProductToDelete(null);
            toast({ title: "تم حذف المنتج بنجاح." });
        } catch (e) {
            console.error('Failed to delete product:', e);
            toast({ variant: 'destructive', title: 'فشل حذف المنتج' });
        }
    };
    
    const handleApproval = async (product: Product, newStatus: 'Approved' | 'Rejected') => {
        if (!firestore) return;
        const isApproving = newStatus === 'Approved';
        toast({ title: isApproving ? 'جاري قبول المنتج...' : 'جاري رفض المنتج...' });

        const productRef = doc(firestore, 'products', product.id);
        try {
            await updateDoc(productRef, {
                approvalStatus: newStatus,
                isAvailable: isApproving && product.stockQuantity > 0, // Make available only on approval AND if stock exists
                updatedAt: serverTimestamp(),
            });
            toast({ title: `تم ${isApproving ? 'قبول' : 'رفض'} المنتج بنجاح` });
        } catch(e) {
            console.error("Failed to update approval status:", e);
            toast({ variant: 'destructive', title: 'فشل تحديث الحالة' });
        }
    }

    if (error) {
        return <p className="text-destructive">خطأ في تحميل المنتجات: {error.message}</p>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">إدارة المنتجات</h1>
                    <p className="text-muted-foreground">إضافة وتعديل جميع المنتجات في المنصة.</p>
                </div>
                <AddProductDialog />
            </div>

            <Card>
                <CardContent className="pt-6">
                    {isLoading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-96" />)}
                        </div>
                    ) : (
                         sortedProducts?.length === 0 ? (
                            <div className="text-center py-16">
                                <h3 className="text-lg font-semibold">لا توجد منتجات</h3>
                                <p className="text-muted-foreground mt-2">ابدأ بإضافة أول منتج إلى المنصة.</p>
                                <div className="mt-6"><AddProductDialog /></div>
                            </div>
                        ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {sortedProducts?.map((product) => (
                                <Card key={product.id} className="overflow-hidden flex flex-col group">
                                    <div className="relative">
                                        <Image
                                            src={product.imageUrls?.[0] || `https://picsum.photos/seed/${product.id}/400`}
                                            alt={product.name}
                                            width={400}
                                            height={400}
                                            className="aspect-square object-contain w-full"
                                        />
                                        <Badge
                                            variant={
                                                product.approvalStatus === 'Approved' ? 'default' :
                                                product.approvalStatus === 'Rejected' ? 'destructive' :
                                                'secondary'
                                            }
                                            className="absolute top-2 right-2"
                                        >
                                            {
                                                product.approvalStatus === 'Approved' ? 'مقبول' :
                                                product.approvalStatus === 'Rejected' ? 'مرفوض' :
                                                'قيد المراجعة'
                                            }
                                        </Badge>
                                        {product.approvalStatus === 'Approved' && (
                                             <Badge className="absolute top-2 left-2" variant={product.isAvailable ? 'default' : 'destructive'}>
                                                {product.isAvailable ? "متاح" : "غير متاح"}
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="p-4 flex-grow flex flex-col">
                                        <h3 className="font-semibold text-lg leading-tight h-12 flex-grow">{product.name}</h3>
                                        <p className="text-sm text-muted-foreground">{product.category}</p>
                                        
                                        <div className="mt-4 space-y-2 text-sm">
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
                                        </div>
                                    </div>
                                    <div className="p-2 border-t flex items-center justify-end">
                                        {product.approvalStatus === 'Pending' ? (
                                            <div className="flex gap-2 w-full p-2">
                                                <Button variant="destructive" size="sm" className="flex-1" onClick={() => handleApproval(product, 'Rejected')}>
                                                    <X className="me-2 h-4 w-4" /> رفض
                                                </Button>
                                                <Button size="sm" className="flex-1" onClick={() => handleApproval(product, 'Approved')}>
                                                    <Check className="me-2 h-4 w-4" /> قبول
                                                </Button>
                                            </div>
                                        ) : (
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
                                                    <DropdownMenuItem onClick={() => setProductToAnalyze(product)}><BarChart2 className="me-2"/> تحليلات</DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={() => setProductToDelete(product)} className="text-destructive"><Trash2 className="me-2"/> حذف المنتج</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
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
