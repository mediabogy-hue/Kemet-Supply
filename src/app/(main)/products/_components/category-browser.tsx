'use client';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { LayoutGrid } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, where } from 'firebase/firestore';
import type { ProductCategory } from '@/lib/types';
import { useSession } from '@/auth/SessionProvider';
import { useMemo } from 'react';


interface CategoryBrowserProps {
    selectedCategory: string;
    onSelectCategory: (category: string) => void;
}

export function CategoryBrowser({ selectedCategory, onSelectCategory }: CategoryBrowserProps) {
    const firestore = useFirestore();
    const { user } = useSession();
    
    // Fetch all categories and filter/sort on the client to avoid indexing issues.
    const categoriesQuery = useMemoFirebase(() => (firestore && user) ? collection(firestore, "productCategories") : null, [firestore, user]);
    const { data: categories, isLoading } = useCollection<ProductCategory>(categoriesQuery);

    const availableCategories = useMemo(() => {
        if (!categories) return [];
        return categories
            .filter(cat => cat.isAvailable)
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [categories]);

    return (
        <div className="py-8">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold tracking-tight">اختر من مجموعة متنوعة من الفئات</h2>
                <p className="text-muted-foreground mt-2">تصفح المنتجات حسب الفئة للعثور على ما تبحث عنه بسهولة.</p>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-9 gap-x-4 gap-y-6 justify-center">
                 <div className="flex flex-col items-center gap-2 group">
                    <button
                        onClick={() => onSelectCategory('all')}
                        className={cn(
                            'w-28 h-28 rounded-full bg-muted flex items-center justify-center border-2 transition-all duration-300 transform group-hover:scale-105',
                            selectedCategory === 'all' ? 'border-primary shadow-lg shadow-primary/20' : 'border-transparent hover:border-primary/50'
                        )}
                    >
                        <LayoutGrid className="h-10 w-10 text-muted-foreground transition-colors group-hover:text-primary" />
                    </button>
                    <span className="text-sm font-medium text-center">كل الفئات</span>
                </div>
                {isLoading && Array.from({length: 8}).map((_, i) => (
                    <div key={i} className="flex flex-col items-center gap-2">
                        <Skeleton className="w-28 h-28 rounded-full" />
                        <Skeleton className="h-4 w-20" />
                    </div>
                ))}
                {!isLoading && availableCategories?.map((category) => (
                     <div key={category.id} className="flex flex-col items-center gap-2 group">
                        <button
                             onClick={() => onSelectCategory(category.name)}
                             className={cn(
                                 'w-28 h-28 rounded-full overflow-hidden border-2 transition-all duration-300 transform group-hover:scale-105',
                                 selectedCategory === category.name ? 'border-primary shadow-lg shadow-primary/20' : 'border-transparent hover:border-primary/50'
                             )}
                        >
                            <Image
                                src={category.imageUrl}
                                alt={category.name}
                                width={112}
                                height={112}
                                className="w-full h-full object-cover"
                                data-ai-hint={category.dataAiHint || ''}
                            />
                        </button>
                        <span className="text-sm font-medium text-center">{category.name}</span>
                    </div>
                ))}
                {!isLoading && availableCategories.length === 0 && (
                    <div className="col-span-full text-center py-8 text-muted-foreground">
                        <p>لم يتم إضافة فئات للمنتجات بعد.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
