'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Product } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { CategoryBrowser } from './_components/category-browser';
import { ProductCard } from './_components/product-card';
import { useToast } from '@/hooks/use-toast';

export default function ProductsPage() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');

    // Fetch only available products for better performance
    const productsQuery = useMemoFirebase(
        () => (firestore ? query(collection(firestore, 'products'), where('isAvailable', '==', true)) : null),
        [firestore]
    );
    const { data: products, isLoading: productsLoading, error } = useCollection<Product>(productsQuery);
    
    // Display error toast if fetching fails
    useEffect(() => {
        if (error) {
            toast({
                variant: 'destructive',
                title: 'فشل تحميل المنتجات',
                description: error.message,
            });
        }
    }, [error, toast]);


    const filteredAndSortedProducts = useMemo(() => {
        if (!products) return [];
        
        let processedProducts = products
            // isAvailable filter is now done in the query
            .filter(p => selectedCategory === 'all' || p.category === selectedCategory)
            .filter(p => !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase()));
            
        // The type assertion is needed because Firestore's Timestamp and JS Date are different
        processedProducts.sort((a, b) => {
            const timeA = (a.createdAt as any)?.toMillis?.() || 0;
            const timeB = (b.createdAt as any)?.toMillis?.() || 0;
            return timeB - timeA;
        });

        return processedProducts;
    }, [products, searchTerm, selectedCategory]);

    return (
        <div className="space-y-6">
            <CategoryBrowser 
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
            />
            
            <div className="relative mx-auto w-full max-w-lg">
                <Search className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input 
                    placeholder="ابحث عن منتج محدد..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pr-10 text-base h-12 rounded-full shadow-md"
                />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {productsLoading ? (
                    Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-96 rounded-lg" />)
                ) : filteredAndSortedProducts.length > 0 ? (
                    filteredAndSortedProducts.map(product => (
                        <ProductCard key={product.id} product={product} />
                    ))
                ) : (
                    <div className="col-span-full text-center py-16">
                        <h3 className="text-lg font-semibold">لا توجد منتجات</h3>
                        <p className="text-muted-foreground mt-2">لا توجد منتجات تطابق بحثك أو الفئة المحددة حاليًا.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
