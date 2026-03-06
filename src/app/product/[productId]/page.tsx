'use client';

import { useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { doc } from 'firebase/firestore';
import type { Product, UserProfile } from '@/lib/types';
import { ProductView } from './_components/product-view';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function PublicProductPage({ 
    params,
    searchParams 
}: { 
    params: { productId: string };
    searchParams: { [key: string]: string | string[] | undefined };
}) {
    const { productId } = params;
    const refId = typeof searchParams.ref === 'string' ? searchParams.ref : null;
    
    const firestore = useFirestore();

    const productRef = useMemoFirebase(
        () => (firestore && productId) ? doc(firestore, 'products', productId) : null,
        [firestore, productId]
    );

    const dropshipperRef = useMemoFirebase(
        () => (firestore && refId) ? doc(firestore, 'users', refId) : null,
        [firestore, refId]
    );

    const { data: product, isLoading: isProductLoading } = useDoc<Product>(productRef);
    const { data: dropshipperProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(dropshipperRef);
    
    const isLoading = isProductLoading || isProfileLoading;
    const dropshipperName = dropshipperProfile ? `${dropshipperProfile.firstName} ${dropshipperProfile.lastName}`.trim() : null;

    if (isLoading) {
        return (
            <div className="container mx-auto p-4 md:p-8 max-w-6xl">
                <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-start">
                    <div className="space-y-4">
                        <Skeleton className="aspect-square w-full rounded-lg" />
                    </div>
                    <div className="space-y-6">
                        <div className="space-y-3">
                            <Skeleton className="h-4 w-1/4" />
                            <Skeleton className="h-10 w-3/4" />
                            <Skeleton className="h-8 w-1/3" />
                        </div>
                        <Skeleton className="h-px w-full" />
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-5/6" />
                        </div>
                        <Skeleton className="h-96 w-full rounded-xl" />
                    </div>
                </div>
            </div>
        );
    }
    
    if (!product) {
        return (
             <div className="container mx-auto p-4 md:p-8 max-w-6xl">
                <Card className="bg-destructive/10 border-destructive/30">
                    <CardHeader>
                        <CardTitle className="text-destructive">عفواً، المنتج غير موجود</CardTitle>
                        <CardDescription className="text-destructive/80">
                            الرابط الذي تتبعه غير صحيح أو أن المنتج قد تم حذفه.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }
    
    return (
        <div className="container mx-auto p-4 md:p-8 max-w-6xl">
            <ProductView 
                product={product}
                refId={refId}
                dropshipperName={dropshipperName}
            />
        </div>
    );
}
