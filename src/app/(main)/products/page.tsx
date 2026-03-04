'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
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

    const productsQuery = useMemoFirebase(
        () => (firestore ? query(collection(firestore, 'products')) : null),
        [firestore]
    );
    const { data: products, isLoading: productsLoading, error } = useCollection<Product>(productsQuery);
    
    useEffect(() => {
        if (error) {
            toast({
                variant: 'destructive',
                title: 'فشل تحميل المنتجات',
                description: 'حدث خطأ أثناء جلب البيانات. الرجاء المحاولة مرة أخرى.',
                duration: 10000,
            });
            console.error("Product query error:", error);
        }
    }, [error, toast]);

    const filteredProducts = useMemo(() => {
        if (!products) return [];
        
        return products
            .filter(p => p.approvalStatus === 'Approved' && p.isAvailable)
            .filter(p => selectedCategory === 'all' || p.category === selectedCategory)
            .filter(p => !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase()));
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
                ) : filteredProducts.length > 0 ? (
                    filteredProducts.map(product => (
                        <ProductCard key={product.id} product={product} />
                    ))
                ) : (
                    <div className="col-span-full text-center py-16">
                        <h3 className="text-xl font-semibold">لا توجد منتجات متاحة للتسويق حاليًا</h3>
                        <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                            قد تكون المنتجات قيد المراجعة أو نفدت كميتها. حاول التحقق مرة أخرى قريبًا أو تواصل مع الإدارة.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
