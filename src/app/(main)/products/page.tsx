
'use client';

import { useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, where } from 'firebase/firestore';
import type { Product } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { CategoryBrowser } from './_components/category-browser';
import { ProductCard } from './_components/product-card';

export default function ProductsPage() {
    const firestore = useFirestore();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');

    const productsQuery = useMemoFirebase(() => {
        if (!firestore) return null;

        let q = query(collection(firestore, 'products'), where('isAvailable', '==', true), orderBy('name', 'asc'));

        if (selectedCategory !== 'all') {
            q = query(q, where('category', '==', selectedCategory));
        }

        return q;
    }, [firestore, selectedCategory]);

    const { data: products, isLoading: productsLoading } = useCollection<Product>(productsQuery);

    const filteredProducts = useMemo(() => {
        if (!products) return [];
        if (!searchTerm) return products;
        const lowerCaseSearch = searchTerm.toLowerCase();
        return products.filter(p => p.name.toLowerCase().includes(lowerCaseSearch));
    }, [products, searchTerm]);

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
                ) : filteredProducts.length > 0 ? (
                    filteredProducts.map(product => (
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
