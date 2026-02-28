'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { db as firestore } from '@/lib/firebaseClient';
import { doc, getDoc } from 'firebase/firestore';
import type { Product } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';

export default function PublicProductPage() {
    const params = useParams();
    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const productId = params.productId as string;

    useEffect(() => {
        if (!productId || !firestore) {
            setLoading(false);
            if (!productId) {
                setError("Product ID not found in URL.");
            }
            if (!firestore) {
                 setError("Firestore service is not available.");
            }
            return;
        }

        const fetchProduct = async () => {
            setLoading(true);
            setError(null);
            try {
                const productRef = doc(firestore, 'products', productId);
                const docSnap = await getDoc(productRef);
                
                if (docSnap.exists()) {
                    setProduct({ id: docSnap.id, ...docSnap.data() } as Product);
                } else {
                    setError("عذراً، لم نتمكن من العثور على هذا المنتج. قد يكون الرابط غير صحيح أو تمت إزالة المنتج.");
                    setProduct(null);
                }
            } catch (e: any) {
                console.error("Product fetch failed:", e);
                setError("حدث خطأ أثناء تحميل المنتج. الرجاء المحاولة مرة أخرى.");
            } finally {
                setLoading(false);
            }
        };

        fetchProduct();
    }, [productId, firestore]);

    if (loading) {
        return (
            <div className="container mx-auto p-4 md:p-8">
                <div className="grid md:grid-cols-2 gap-8">
                    <Skeleton className="w-full aspect-square rounded-lg" />
                    <div className="space-y-4">
                        <Skeleton className="h-10 w-3/4" />
                        <Skeleton className="h-8 w-1/4" />
                        <Skeleton className="h-20 w-full" />
                    </div>
                </div>
            </div>
        );
    }

    if (error || !product) {
         return (
            <div className="container mx-auto flex flex-col items-center justify-center min-h-[80vh] p-4">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>خطأ في عرض المنتج</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-destructive">{error || "لم يتم العثور على المنتج."}</p>
                    </CardContent>
                </Card>
            </div>
        );
    }
    
    return (
        <div className="container mx-auto p-4 md:p-8">
            <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-start">
                <div className="space-y-4">
                    <div className="aspect-square w-full bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                        <Image
                            src={product.imageUrls?.[0] || `https://picsum.photos/seed/${product.id}/800/800`}
                            alt={product.name}
                            width={800}
                            height={800}
                            className="w-full h-full object-contain"
                            priority
                        />
                    </div>
                </div>

                <div className="space-y-6">
                    <h1 className="text-3xl lg:text-4xl font-bold">{product.name}</h1>
                    <p className="text-2xl font-bold text-primary mt-2">{product.price.toFixed(2)} ج.م</p>
                    <p className="text-muted-foreground whitespace-pre-wrap">{product.description}</p>
                    <Card>
                        <CardHeader>
                           <CardTitle>الطلب غير متاح مؤقتاً</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">نحن نعمل على إصلاح مشكلة في نموذج الطلب. سيتم إعادة تفعيله قريباً. شكراً لتفهمكم.</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}