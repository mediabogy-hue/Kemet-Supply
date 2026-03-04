'use client';

import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Product } from '@/lib/types';
import { ProductView } from './product-view';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface ProductPageClientProps {
    productId: string;
    refId: string | null;
    dropshipperName: string | null;
}

function ProductPageSkeleton() {
    return (
        <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-start">
            <div className="space-y-4">
                <Skeleton className="w-full aspect-square rounded-lg" />
            </div>
            <div className="space-y-6">
                <Skeleton className="h-6 w-1/4" />
                <Skeleton className="h-10 w-3/4" />
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-px w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-48 w-full" />
            </div>
        </div>
    );
}


export function ProductPageClient({ productId, refId, dropshipperName }: ProductPageClientProps) {
    const firestore = useFirestore();

    const productRef = useMemoFirebase(
        () => (firestore ? doc(firestore, 'products', productId) : null),
        [firestore, productId]
    );

    const { data: product, isLoading, error } = useDoc<Product>(productRef);

    if (isLoading) {
        return <ProductPageSkeleton />;
    }

    if (error) {
        console.error("Product fetch error (client):", error);
        return (
            <Card className="bg-destructive/10 border-destructive/30">
                <CardHeader>
                    <CardTitle className="text-destructive">حدث خطأ</CardTitle>
                    <CardDescription className="text-destructive/80">
                        لم نتمكن من تحميل بيانات المنتج. الرجاء المحاولة مرة أخرى.
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }
    
    if (!product) {
         return (
            <Card className="bg-destructive/10 border-destructive/30">
                <CardHeader>
                    <CardTitle className="text-destructive">عفواً، المنتج غير متوفر</CardTitle>
                    <CardDescription className="text-destructive/80">
                       قد يكون الرابط الذي تتبعه غير صحيح أو أن المنتج لم يعد متاحاً للعرض.
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }
    
    return <ProductView product={product} refId={refId} dropshipperName={dropshipperName} />;
}
