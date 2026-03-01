'use client';

import { useState, useMemo } from 'react';
import { useCollection, useMemoFirebase } from '@/firebase';
import { useSession } from '@/auth/SessionProvider';
import { collection, query, orderBy, where } from 'firebase/firestore';
import type { Product } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { CategoryBrowser } from './_components/category-browser';
import { ProductCard } from './_components/product-card';

export default function ProductsPage() {
    const { user, firestore } = useSession();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');

    // Fetch all products and filter/sort on the client to avoid indexing issues.
    const productsQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return collection(firestore, 'products');
    }, [firestore, user]);

    const { data: products, isLoading: productsLoading } = useCollection<Product>(productsQuery);

    const filteredAndSortedProducts = useMemo(() => {
        if (!products) return [];
        
        let processedProducts = products
            // 1. Filter for available products
            .filter(p => p.isAvailable)
            // 2. Filter by selected category
            .filter(p => selectedCategory === 'all' || p.category === selectedCategory)
            // 3. Filter by search term
            .filter(p => !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase()));
            
        // 4. Sort by creation date (newest first)
        processedProducts.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));

        return processedProducts;
    }, [products, searchTerm, selectedCategory]);

    return (
        <div className="space-y-6">
            <CategoryBrowser 
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
                firestore={firestore}
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
