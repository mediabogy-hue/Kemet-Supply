
'use client';
import { useState } from "react";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, doc, deleteDoc } from "firebase/firestore";
import type { ProductCategory } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import Image from "next/image";
import { AddCategoryDialog } from "./_components/add-category-dialog";
import { EditCategoryDialog } from "./_components/edit-category-dialog";
import { DeleteCategoryAlert } from "./_components/delete-category-alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function AdminCategoriesPage() {
    const firestore = useFirestore();
    const { toast } = useToast();

    // State for dialogs
    const [categoryToEdit, setCategoryToEdit] = useState<ProductCategory | null>(null);
    const [categoryToDelete, setCategoryToDelete] = useState<ProductCategory | null>(null);

    // Fetch categories
    const categoriesQuery = useMemoFirebase(
        () => (firestore ? query(collection(firestore, "productCategories"), orderBy("createdAt", "desc")) : null),
        [firestore]
    );
    const { data: categories, isLoading, error } = useCollection<ProductCategory>(categoriesQuery);

    const handleDelete = async () => {
        if (!firestore || !categoryToDelete) return;
        const categoryRef = doc(firestore, "productCategories", categoryToDelete.id);
        
        try {
            await deleteDoc(categoryRef);
            setCategoryToDelete(null);
        } catch (e) {
            console.error('Failed to delete category:', e);
            toast({ variant: 'destructive', title: 'فشل حذف الفئة', description: 'قد تكون هناك منتجات مرتبطة بهذه الفئة.' });
        }
    };

    if (error) {
        return <p className="text-destructive">خطأ في تحميل الفئات: {error.message}</p>;
    }

    return (
        <div className="space-y-6">
             <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">إدارة الفئات</h1>
                    <p className="text-muted-foreground">إضافة وتعديل فئات المنتجات في المنصة.</p>
                </div>
                <AddCategoryDialog />
            </div>

            <Card>
                <CardContent className="pt-6">
                    {isLoading ? (
                         <div className="space-y-2">
                             <Skeleton className="h-12 w-full" />
                             <Skeleton className="h-12 w-full" />
                             <Skeleton className="h-12 w-full" />
                         </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>الصورة</TableHead>
                                    <TableHead>الاسم</TableHead>
                                    <TableHead>الحالة</TableHead>
                                    <TableHead>الإجراءات</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {categories?.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center h-24">
                                            لا توجد فئات. قم بإضافة فئة جديدة.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    categories?.map((category) => (
                                        <TableRow key={category.id}>
                                            <TableCell>
                                                <Image src={category.imageUrl} alt={category.name} width={40} height={40} className="rounded-md object-cover"/>
                                            </TableCell>
                                            <TableCell className="font-medium">{category.name}</TableCell>
                                            <TableCell>
                                                 <Badge variant={category.isAvailable ? "default" : "destructive"}>
                                                    {category.isAvailable ? "متاحة" : "مخفية"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="flex gap-2">
                                                <Button variant="outline" size="icon" onClick={() => setCategoryToEdit(category)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button variant="destructive" size="icon" onClick={() => setCategoryToDelete(category)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <EditCategoryDialog 
                category={categoryToEdit}
                isOpen={!!categoryToEdit}
                onOpenChange={(isOpen) => !isOpen && setCategoryToEdit(null)}
            />

            <DeleteCategoryAlert 
                category={categoryToDelete}
                isOpen={!!categoryToDelete}
                onOpenChange={(isOpen) => !isOpen && setCategoryToDelete(null)}
                onConfirm={handleDelete}
            />
        </div>
    );
}
