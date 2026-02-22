
"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useMemo, useRef, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Box, PackageX, Archive, Clock, Search, BarChart, AlertTriangle, PackagePlus, FileDown, Eye, Edit, Package, XCircle, Power, LayoutGrid, Trash2, CalendarClock, Send, RefreshCw, ExternalLink, ShieldAlert } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFirestore, errorEmitter, FirestorePermissionError, useCollection, useMemoFirebase } from "@/firebase";
import { collection, doc, deleteDoc, query, orderBy, updateDoc, serverTimestamp } from "firebase/firestore";
import type { Product, ProductCategory } from "@/lib/types";
import { Skeleton, RefreshIndicator } from "@/components/ui/skeleton";
import { format, formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useSession } from "@/auth/SessionProvider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Product-specific components
import { AddProductDialog } from "./_components/add-product-dialog";
import { EditProductDialog } from "./_components/edit-product-dialog";
import { DeleteProductAlert } from "./_components/delete-product-alert";
import { ProductAnalyticsDialog } from "./_components/product-analytics-dialog";
import { ProductStatCard } from "./_components/product-stat-card";
import { UpdateStockDialog } from "./_components/update-stock-dialog";
import { QuickStockUpdateDialog } from "../inventory/_components/quick-stock-update-dialog";

// Inventory-specific components
import { exportToExcel } from "@/lib/export";
import { EditableStockCell } from "../inventory/_components/editable-stock-cell";

// Category-specific components
import { AddCategoryDialog as AddCategoryDialogCat } from "../categories/_components/add-category-dialog";
import { EditCategoryDialog as EditCategoryDialogCat } from "../categories/_components/edit-category-dialog";
import { DeleteCategoryAlert as DeleteCategoryAlertCat } from "../categories/_components/delete-category-alert";


const MINIMUM_STOCK_LEVEL = 3;

function ProductManagementTab() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const { isAdmin, isProductManager, isLoading: isRoleLoading } = useSession();

    const [filter, setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [clientRendered, setClientRendered] = useState(false);

    const [productToEdit, setProductToEdit] = useState<Product | null>(null);
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);
    const [analyzingProduct, setAnalyzingProduct] = useState<Product | null>(null);
    const [productToUpdateStock, setProductToUpdateStock] = useState<Product | null>(null);

    useEffect(() => {
        setClientRendered(true);
    }, []);

    const canAccess = isAdmin || isProductManager;

    const productsQuery = useMemoFirebase(() => {
        if (!firestore || !canAccess) return null;
        // Simple query without complex ordering to avoid index requirements
        return query(collection(firestore, "products"));
    }, [firestore, canAccess]);
    
    const { data: allProducts, isLoading, error, lastUpdated } = useCollection<Product>(productsQuery);

    const { stats, warnings, filteredProducts } = useMemo(() => {
        const defaultData = { 
            stats: { total: 0, lowStock: 0, outOfStock: 0, recent: 0 },
            warnings: { lowStock: 0, noImages: 0, inactive: 0 },
            filteredProducts: [],
        };
        if (!allProducts) return defaultData;

        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        let lowStockCount = 0;
        let outOfStockCount = 0;
        let recentCount = 0;
        let noImagesCount = 0;
        let inactiveCount = 0;

        // Client-side sorting
        const sortedProducts = [...allProducts].sort((a, b) => (b.updatedAt?.toDate?.()?.getTime() || 0) - (a.updatedAt?.toDate?.()?.getTime() || 0));

        for (const p of sortedProducts) {
            if (p.stockQuantity > 0 && p.stockQuantity < MINIMUM_STOCK_LEVEL) lowStockCount++;
            if (p.stockQuantity === 0) outOfStockCount++;
            if (p.createdAt && p.createdAt.toDate() > sevenDaysAgo) recentCount++;
            if (!p.imageUrls || p.imageUrls.length === 0) noImagesCount++;
            if (!p.isAvailable) inactiveCount++;
        }
        
        const filtered = sortedProducts.filter(p => {
            const stockFilter = 
                filter === 'all' ||
                (filter === 'low-stock' && p.stockQuantity > 0 && p.stockQuantity < MINIMUM_STOCK_LEVEL) ||
                (filter === 'out-of-stock' && p.stockQuantity === 0);
            
            const searchFilter = searchTerm === '' || p.name.toLowerCase().includes(searchTerm.toLowerCase());

            return stockFilter && searchFilter;
        });

        return {
            stats: {
                total: allProducts.length,
                lowStock: lowStockCount,
                outOfStock: outOfStockCount,
                recent: recentCount,
            },
            warnings: {
                lowStock: lowStockCount,
                noImages: noImagesCount,
                inactive: inactiveCount,
            },
            filteredProducts: filtered,
        };

    }, [allProducts, filter, searchTerm]);

    const handleDeleteProduct = () => {
        if (!productToDelete || !firestore) return;
        const productDocRef = doc(firestore, "products", productToDelete.id);
        setProductToDelete(null);
        toast({ title: "جاري حذف المنتج..." });
        deleteDoc(productDocRef)
            .then(() => toast({ title: "تم حذف المنتج بنجاح" }))
            .catch(async (e) => {
                errorEmitter.emit('permission-error', new FirestorePermissionError({ path: productDocRef.path, operation: 'delete' }));
                toast({ variant: "destructive", title: "حدث خطأ أثناء الحذف" });
            });
    };

    const handleToggleAvailability = (product: Product) => {
        if (!firestore) return;
        const productDocRef = doc(firestore, "products", product.id);
        const newStatus = !product.isAvailable;
        toast({ title: newStatus ? "جاري تفعيل المنتج..." : "جاري تعطيل المنتج..."});
        updateDoc(productDocRef, { isAvailable: newStatus, updatedAt: serverTimestamp() })
            .then(() => toast({ title: "تم تحديث حالة المنتج بنجاح" }))
            .catch(async (e) => {
                errorEmitter.emit('permission-error', new FirestorePermissionError({ path: productDocRef.path, operation: 'update', requestResourceData: { isAvailable: newStatus } }));
                toast({ variant: "destructive", title: "فشل تحديث الحالة" });
            });
    }

    return (
        <div className="space-y-8 mt-6">
             <div className="flex flex-wrap items-center gap-4">
                <div className="flex-1">
                    <RefreshIndicator isLoading={isLoading} lastUpdated={lastUpdated} />
                </div>
                <AddProductDialog />
                 <QuickStockUpdateDialog triggerButton={<Button variant="secondary" size="lg"><PackagePlus className="me-2"/> تحديث المخزون</Button>} />
                <Button variant="secondary" size="lg" disabled><FileDown className="me-2"/> استيراد منتجات</Button>
                <Button variant="outline" size="lg" asChild>
                    <Link href="https://kemet-s.myeasyorders.com/" target="_blank" rel="noopener noreferrer">
                        <Eye /> عرض الكتالوج
                    </Link>
                </Button>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <ProductStatCard title="إجمالي المنتجات" value={stats.total} icon={<Box />} isLoading={isLoading} />
                <ProductStatCard title="مخزون منخفض" value={stats.lowStock} icon={<Archive />} isLoading={isLoading} description={`أقل من ${MINIMUM_STOCK_LEVEL} قطع`} />
                <ProductStatCard title="نفد من المخزون" value={stats.outOfStock} icon={<PackageX />} isLoading={isLoading} />
                <ProductStatCard title="أضيف حديثاً" value={stats.recent} icon={<Clock />} isLoading={isLoading} description="آخر 7 أيام" />
            </div>

            <div className="space-y-2">
                {warnings.lowStock > 0 && 
                    <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>تنبيه: مخزون منخفض</AlertTitle>
                        <AlertDescription>يوجد {warnings.lowStock} منتج على وشك النفاد. قم بمراجعة المخزون.</AlertDescription>
                    </Alert>
                }
                 {warnings.noImages > 0 && 
                    <Alert variant="destructive">
                        <XCircle className="h-4 w-4" />
                        <AlertTitle>تنبيه: منتجات بدون صور</AlertTitle>
                        <AlertDescription>يوجد {warnings.noImages} منتج لا يحتوي على صور. الرجاء إضافة صور لظهورها للمسوقين.</AlertDescription>
                    </Alert>
                }
            </div>
            
            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                        <CardTitle>نظرة سريعة على المنتجات</CardTitle>
                        <div className="flex gap-2 w-full md:w-auto">
                            <div className="relative flex-1">
                                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="ابحث عن منتج..." className="pr-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                            </div>
                            <Select value={filter} onValueChange={setFilter}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="فلتر المخزون" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">كل المنتجات</SelectItem>
                                    <SelectItem value="low-stock">مخزون منخفض</SelectItem>
                                    <SelectItem value="out-of-stock">نفد المخزون</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[80px]">الصورة</TableHead>
                                <TableHead>الاسم</TableHead>
                                <TableHead>السعر</TableHead>
                                <TableHead>العمولة</TableHead>
                                <TableHead>المخزون</TableHead>
                                <TableHead>الحالة</TableHead>
                                <TableHead>آخر تحديث</TableHead>
                                <TableHead className="text-end">إجراءات</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading && Array.from({length: 5}).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-12 w-12 rounded-md" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                    <TableCell className="text-end"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                                </TableRow>
                            ))}
                            {filteredProducts.map(product => {
                                 const stockLevel = product.stockQuantity;
                                 const stockIndicatorColor =
                                    stockLevel === 0 ? "bg-destructive"
                                    : stockLevel < MINIMUM_STOCK_LEVEL ? "bg-yellow-500" : "bg-green-500";
                                return (
                                    <TableRow key={product.id}>
                                        <TableCell>
                                            <Image
                                                alt={product.name}
                                                className="aspect-square rounded-md object-cover"
                                                height="64"
                                                src={product.imageUrls?.[0] || `https://picsum.photos/seed/${product.id}/64/64`}
                                                width="64"
                                            />
                                        </TableCell>
                                        <TableCell className="font-medium">{product.name}</TableCell>
                                        <TableCell>{product.price.toFixed(2)} ج.م</TableCell>
                                        <TableCell className="font-semibold text-primary">{product.commission.toFixed(2)} ج.م</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <span className={cn("h-2.5 w-2.5 rounded-full", stockIndicatorColor)} />
                                                <span>{stockLevel}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={product.isAvailable && product.stockQuantity > 0 ? "default" : "destructive"}>
                                                {product.isAvailable && product.stockQuantity > 0 ? "نشط" : "غير نشط"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-xs">
                                            {clientRendered && product.updatedAt?.toDate ? (
                                                formatDistanceToNow(product.updatedAt.toDate(), { addSuffix: true, locale: ar })
                                            ) : (
                                                <Skeleton className="h-4 w-20" />
                                            )}
                                        </TableCell>
                                        <TableCell className="text-end">
                                             <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button aria-haspopup="true" size="icon" variant="ghost">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                        <span className="sr-only">Toggle menu</span>
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>إجراءات سريعة</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => setProductToEdit(product)}><Edit className="me-2"/> تعديل المنتج</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => setProductToUpdateStock(product)}><Package className="me-2"/> تحديث المخزون</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleToggleAvailability(product)}><Power className="me-2"/> {product.isAvailable ? 'تعطيل المنتج' : 'تفعيل المنتج'}</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => setAnalyzingProduct(product)}><BarChart className="me-2"/> تحليلات</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                     {!isLoading && filteredProducts.length === 0 && (
                         <div className="text-center p-8 text-muted-foreground">
                            {error ? "حدث خطأ أثناء تحميل المنتجات" : "لا توجد منتجات تطابق بحثك."}
                        </div>
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
                onConfirm={handleDeleteProduct}
            />
            <ProductAnalyticsDialog
                product={analyzingProduct}
                isOpen={!!analyzingProduct}
                onOpenChange={(isOpen) => !isOpen && setAnalyzingProduct(null)}
            />
            <UpdateStockDialog
                product={productToUpdateStock}
                isOpen={!!productToUpdateStock}
                onOpenChange={(isOpen) => !isOpen && setProductToUpdateStock(null)}
            />
        </div>
    );
}

function InventoryTab() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { isAdmin, isProductManager, isLoading: isRoleLoading } = useSession();

  // State for filters and search
  const [stockFilter, setStockFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Product; direction: 'ascending' | 'descending' } | null>({ key: 'stockQuantity', direction: 'ascending' });
  const [clientRendered, setClientRendered] = useState(false);

  // State for dialogs
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);

  useEffect(() => {
    setClientRendered(true);
  }, []);

  const canAccess = isAdmin || isProductManager;

  const productsQuery = useMemoFirebase(() => {
    if (!firestore || !canAccess) return null;
    return query(collection(firestore, "products"));
  }, [firestore, canAccess]);
  
  const categoriesQuery = useMemoFirebase(() => {
    if (!firestore || !canAccess) return null;
    return query(collection(firestore, "productCategories"), orderBy("name", "asc"));
  }, [firestore, canAccess]);

  const { data: allProducts, isLoading: productsLoading, error: productsError, lastUpdated } = useCollection<Product>(productsQuery);
  const { data: categories, isLoading: categoriesLoading } = useCollection<ProductCategory>(categoriesQuery);

  const isLoading = productsLoading || categoriesLoading || isRoleLoading;

  const { filteredAndSortedProducts } = useMemo(() => {
    const defaultData = { 
        filteredAndSortedProducts: [],
    };
    if (!allProducts) return defaultData;
    
    let filtered = allProducts.filter(p => {
        const matchesStock = 
            stockFilter === 'all' ||
            (stockFilter === 'low-stock' && p.stockQuantity > 0 && p.stockQuantity < MINIMUM_STOCK_LEVEL) ||
            (stockFilter === 'out-of-stock' && p.stockQuantity === 0) ||
            (stockFilter === 'in-stock' && p.stockQuantity >= MINIMUM_STOCK_LEVEL);
        
        const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
        
        const matchesSearch = searchTerm === '' || 
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.id.toLowerCase().includes(searchTerm.toLowerCase());

        return matchesStock && matchesCategory && matchesSearch;
    });

    if (sortConfig !== null) {
      filtered.sort((a, b) => {
        const aVal = a[sortConfig.key as keyof Product] as number;
        const bVal = b[sortConfig.key as keyof Product] as number;
        if (typeof aVal === 'number' && typeof bVal === 'number') {
            if (aVal < bVal) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }

    return {
        filteredAndSortedProducts: filtered,
    };
  }, [allProducts, stockFilter, categoryFilter, searchTerm, sortConfig]);

  const handleToggleAvailability = (product: Product) => {
    if (!firestore) return;
    const productDocRef = doc(firestore, "products", product.id);
    const newStatus = !product.isAvailable;
    toast({ title: newStatus ? "جاري تفعيل المنتج..." : "جاري تعطيل المنتج..."});
    updateDoc(productDocRef, { isAvailable: newStatus, updatedAt: serverTimestamp() })
        .then(() => toast({ title: "تم تحديث حالة المنتج بنجاح" }))
        .catch(async (e) => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: productDocRef.path, operation: 'update', requestResourceData: { isAvailable: newStatus } }));
            toast({ variant: "destructive", title: "فشل تحديث الحالة" });
        });
  }

  const handleExport = () => {
    if (filteredAndSortedProducts.length === 0) {
        toast({
            variant: "destructive",
            title: "لا توجد بيانات للتصدير",
            description: "لا توجد منتجات مطابقة للفلاتر الحالية.",
        });
        return;
    }

    const dataToExport = filteredAndSortedProducts.map(product => ({
        id: product.id,
        name: product.name,
        category: product.category || 'N/A',
        stockQuantity: product.stockQuantity,
        price: product.price,
        isAvailable: product.isAvailable ? 'نشط' : 'غير نشط',
        updatedAt: product.updatedAt && typeof product.updatedAt.toDate === 'function' ? format(product.updatedAt.toDate(), 'yyyy-MM-dd') : 'N/A',
    }));

    const headers = {
        id: 'SKU',
        name: 'اسم المنتج',
        category: 'الفئة',
        stockQuantity: 'الكمية الحالية',
        price: 'السعر',
        isAvailable: 'الحالة',
        updatedAt: 'آخر تحديث',
    };

    exportToExcel(dataToExport, `Inventory_Report_${new Date().toISOString().split('T')[0]}`, 'Inventory', headers);
  };
    
    return (
        <div className="space-y-8 mt-6">
            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                        <CardTitle>جدول المخزون</CardTitle>
                        <div className="flex gap-2 w-full md:w-auto">
                            <div className="relative flex-1">
                                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="ابحث بالاسم أو SKU..." className="pr-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                            </div>
                            <Select value={stockFilter} onValueChange={setStockFilter}>
                                <SelectTrigger className="w-[150px]">
                                    <SelectValue placeholder="فلتر الحالة" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">كل الحالات</SelectItem>
                                    <SelectItem value="in-stock">في المخزون</SelectItem>
                                    <SelectItem value="low-stock">مخزون منخفض</SelectItem>
                                    <SelectItem value="out-of-stock">نفد المخزون</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={categoryFilter} onValueChange={setCategoryFilter} disabled={categoriesLoading}>
                                <SelectTrigger className="w-[150px]">
                                    <SelectValue placeholder="فلتر الفئة" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">كل الفئات</SelectItem>
                                    {categories?.map(cat => (
                                        <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                     <div className="mt-4 flex justify-end gap-2">
                        <Button variant="secondary" onClick={handleExport}><FileDown className="me-2" /> تصدير الجدول</Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[80px]">الصورة</TableHead>
                                <TableHead>الاسم / SKU</TableHead>
                                <TableHead>الفئة</TableHead>
                                <TableHead
                                  className="cursor-pointer"
                                  onClick={() => setSortConfig({ key: 'stockQuantity', direction: sortConfig?.direction === 'ascending' ? 'descending' : 'ascending' })}
                                >
                                  المخزون الحالي
                                </TableHead>
                                <TableHead>حد أدنى للمخزون</TableHead>
                                <TableHead>الحالة</TableHead>
                                <TableHead>آخر تحديث</TableHead>
                                <TableHead className="text-end">إجراءات</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? Array.from({length: 8}).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-12 w-12 rounded-md" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                                    <TableCell className="text-end"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                                </TableRow>
                            )) : filteredAndSortedProducts.map(product => {
                                 const stockLevel = product.stockQuantity;
                                 let stockStatus: 'in-stock' | 'low-stock' | 'out-of-stock' = 'in-stock';
                                 if (stockLevel === 0) {
                                     stockStatus = 'out-of-stock';
                                 } else if (stockLevel < MINIMUM_STOCK_LEVEL) {
                                     stockStatus = 'low-stock';
                                 }
                                return (
                                    <TableRow key={product.id}>
                                        <TableCell>
                                            <Image
                                                alt={product.name}
                                                className="aspect-square rounded-md object-cover"
                                                height="64"
                                                src={product.imageUrls?.[0] || `https://picsum.photos/seed/${product.id}/64/64`}
                                                width="64"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">{product.name}</div>
                                            <div className="text-xs text-muted-foreground font-mono">{product.id.substring(0, 10)}...</div>
                                        </TableCell>
                                        <TableCell>{product.category}</TableCell>
                                        <TableCell>
                                            <EditableStockCell product={product} />
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">{MINIMUM_STOCK_LEVEL}</TableCell>
                                        <TableCell>
                                            <Badge variant={
                                                stockStatus === 'out-of-stock' ? 'destructive' :
                                                stockStatus === 'low-stock' ? 'secondary' : 'default'
                                            }>
                                                {stockStatus === 'in-stock' ? 'في المخزون' : stockStatus === 'low-stock' ? 'منخفض' : 'نفد'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-xs">
                                            {clientRendered && product.updatedAt?.toDate ? (
                                                formatDistanceToNow(product.updatedAt.toDate(), { addSuffix: true, locale: ar })
                                            ) : (
                                                <Skeleton className="h-4 w-20" />
                                            )}
                                        </TableCell>
                                        <TableCell className="text-end">
                                             <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button aria-haspopup="true" size="icon" variant="ghost">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>إجراءات سريعة</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => setProductToEdit(product)}><Edit className="me-2"/> تعديل المنتج</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleToggleAvailability(product)}><Power className="me-2"/> {product.isAvailable ? 'تعطيل' : 'تفعيل'}</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                     {!isLoading && filteredAndSortedProducts.length === 0 && (
                         <div className="text-center p-8 text-muted-foreground">
                            {productsError ? "حدث خطأ أثناء تحميل المنتجات" : "لا توجد منتجات تطابق بحثك."}
                        </div>
                     )}
                </CardContent>
            </Card>
             <EditProductDialog
                product={productToEdit}
                isOpen={!!productToEdit}
                onOpenChange={(isOpen) => !isOpen && setProductToEdit(null)}
            />
        </div>
    );
}

function CategoriesTab() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { isAdmin, isProductManager, isLoading: isRoleLoading } = useSession();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [clientRendered, setClientRendered] = useState(false);

  const [categoryToEdit, setCategoryToEdit] = useState<ProductCategory | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<ProductCategory | null>(null);

  useEffect(() => {
    setClientRendered(true);
  }, []);

  const canAccess = !isRoleLoading && (isAdmin || isProductManager);

  const categoriesQuery = useMemoFirebase(() => (firestore && canAccess) ? query(collection(firestore, "productCategories")) : null, [firestore, canAccess]);
  const productsQuery = useMemoFirebase(() => (firestore && canAccess) ? collection(firestore, "products") : null, [firestore, canAccess]);

  const { data: categories, isLoading: categoriesLoading, error: categoriesError, lastUpdated } = useCollection<ProductCategory>(categoriesQuery);
  const { data: allProducts, isLoading: productsLoading } = useCollection<Product>(productsQuery);
  
  const isLoading = categoriesLoading || productsLoading || isRoleLoading;

  const categoriesWithProductCount = useMemo(() => {
    if (!categories) return [];
    const productCounts = (allProducts || []).reduce((acc, product) => {
        if (product.category) {
            acc[product.category] = (acc[product.category] || 0) + 1;
        }
        return acc;
    }, {} as Record<string, number>);

    const sortedCategories = [...categories].sort((a, b) => a.name.localeCompare(b.name));

    return sortedCategories.map(category => ({
        ...category,
        productCount: productCounts[category.name] || 0
    }));
  }, [categories, allProducts]);

  const filteredCategories = useMemo(() => {
    return categoriesWithProductCount.filter(category => {
        const searchMatch = searchTerm === '' || category.name.toLowerCase().includes(searchTerm.toLowerCase());
        const statusMatch = statusFilter === 'all' || 
            (statusFilter === 'active' && (category.isAvailable ?? true)) ||
            (statusFilter === 'hidden' && !(category.isAvailable ?? true));
        
        return searchMatch && statusMatch;
    });
  }, [categoriesWithProductCount, searchTerm, statusFilter]);

  const handleToggleAvailability = (category: ProductCategory) => {
    if (!firestore) return;
    const categoryDocRef = doc(firestore, "productCategories", category.id);
    const newStatus = !(category.isAvailable ?? true);
    toast({ title: newStatus ? "جاري تفعيل الفئة..." : "جاري إخفاء الفئة..."});
    updateDoc(categoryDocRef, { isAvailable: newStatus, updatedAt: serverTimestamp() })
        .then(() => toast({ title: "تم تحديث حالة الفئة بنجاح" }))
        .catch(async (e) => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: categoryDocRef.path, operation: 'update', requestResourceData: { isAvailable: newStatus } }));
            toast({ variant: "destructive", title: "فشل تحديث الحالة" });
        });
  }

  const handleDeleteCategory = () => {
    if (!categoryToDelete || !firestore) return;

    const categoryDocRef = doc(firestore, "productCategories", categoryToDelete.id);
    
    setCategoryToDelete(null);
    toast({ title: "جاري حذف الفئة..." });
    
    deleteDoc(categoryDocRef)
        .then(() => {
            toast({ title: "تم حذف الفئة بنجاح" });
        })
        .catch(async (e) => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: categoryDocRef.path, operation: 'delete' }));
            toast({ variant: "destructive", title: "حدث خطأ أثناء الحذف" });
        });
  };

  if (!isRoleLoading && !canAccess) {
    return (
        <Card className="mt-8">
            <CardHeader> <CardTitle>غير مصرح بالدخول</CardTitle> </CardHeader>
            <CardContent>
                <Alert variant="destructive">
                    <ShieldAlert className="h-4 w-4" />
                    <AlertTitle>ليس لديك الصلاحية!</AlertTitle>
                    <AlertDescription> عفواً، ليس لديك الصلاحيات اللازمة للوصول إلى هذه الصفحة. </AlertDescription>
                </Alert>
            </CardContent>
        </Card>
    );
  }

  return (
    <div className='space-y-6 mt-6'>
      <div className="flex items-center justify-between">
        <AddCategoryDialogCat />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 justify-between items-start">
            <div className="space-y-1 flex-1">
                <CardTitle>قائمة الفئات</CardTitle>
                <CardDescription>
                  جميع الفئات المسجلة في النظام ({filteredCategories.length} فئة).
                </CardDescription>
            </div>
            <RefreshIndicator isLoading={isLoading} lastUpdated={lastUpdated} />
          </div>
          <div className="mt-6 flex flex-col md:flex-row gap-2">
              <div className="relative flex-1">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="ابحث عن فئة..." className="pr-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-[180px]">
                      <SelectValue placeholder="فلتر الحالة" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">كل الحالات</SelectItem>
                      <SelectItem value="active">مرئية</SelectItem>
                      <SelectItem value="hidden">مخفية</SelectItem>
                  </SelectContent>
              </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {isLoading ? (
                Array.from({length: 8}).map((_, i) => (
                    <Card key={i} className="overflow-hidden">
                        <Skeleton className="aspect-[4/3] w-full" />
                        <CardContent className="p-4 space-y-2">
                            <Skeleton className="h-6 w-3/4" />
                            <div className="flex justify-between items-center">
                                <Skeleton className="h-5 w-1/3" />
                                <Skeleton className="h-6 w-1/4" />
                            </div>
                            <Skeleton className="h-4 w-1/2 pt-2" />
                        </CardContent>
                    </Card>
                ))
              ) : categoriesError ? (
                  <div className="col-span-full">
                    <Alert variant="destructive" className="w-max mx-auto"><AlertTitle>حدث خطأ</AlertTitle><AlertDescription>{categoriesError.message}</AlertDescription></Alert>
                  </div>
              ) : filteredCategories.length === 0 ? (
                  <div className="col-span-full flex flex-col items-center justify-center gap-4 py-16 text-muted-foreground">
                       <LayoutGrid className="h-16 w-16" />
                       <p>لا توجد فئات تطابق بحثك.</p>
                  </div>
              ) : (
                filteredCategories.map(category => (
                  <Card key={category.id} className="group flex flex-col overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1">
                    <div className="relative">
                        <div className="absolute top-3 right-3 z-10">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                <Button aria-haspopup="true" size="icon" variant="secondary" className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm hover:bg-background/80">
                                    <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                <DropdownMenuLabel>إجراءات</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => setCategoryToEdit(category)}><Edit className="me-2"/> تعديل</DropdownMenuItem>
                                <DropdownMenuItem asChild><Link href={`/admin/products?category=${encodeURIComponent(category.name)}`}><Eye className="me-2"/> إدارة المنتجات</Link></DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleToggleAvailability(category)}><Power className="me-2"/> {(category.isAvailable ?? true) ? 'إخفاء' : 'إظهار'}</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive" onClick={() => setCategoryToDelete(category)}><Trash2 className="me-2"/> حذف</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
                            <Image 
                                alt={category.name} 
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                                height="300" 
                                src={category.imageUrl || `https://picsum.photos/seed/${category.id}/400/300`} 
                                width="400"
                            />
                        </div>
                    </div>
                    <CardContent className="p-4 flex-grow flex flex-col justify-between">
                        <div>
                            <CardTitle className="text-lg">{category.name}</CardTitle>
                            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                                <Package className="h-4 w-4" />
                                <span>{category.productCount || 0} منتج</span>
                            </div>
                        </div>
                        <div className="mt-4 flex justify-between items-center">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <CalendarClock className="h-3.5 w-3.5" />
                                {clientRendered && category.updatedAt?.toDate ? (
                                    <span>{formatDistanceToNow(category.updatedAt.toDate(), { addSuffix: true, locale: ar })}</span>
                                ) : (
                                    <Skeleton className="h-4 w-20" />
                                )}
                            </div>
                             <Badge variant={(category.isAvailable ?? true) ? 'default' : 'destructive'} className={cn("text-xs", (category.isAvailable ?? true) ? "bg-green-500/10 text-green-400 border-green-500/20" : "")}>
                                {(category.isAvailable ?? true) ? 'مرئية' : 'مخفية'}
                            </Badge>
                        </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
        </CardContent>
      </Card>

      <EditCategoryDialogCat
          category={categoryToEdit}
          isOpen={!!categoryToEdit}
          onOpenChange={(isOpen) => !isOpen && setCategoryToEdit(null)}
      />
      <DeleteCategoryAlertCat
          category={categoryToDelete}
          isOpen={!!categoryToDelete}
          onOpenChange={(isOpen) => !isOpen && setCategoryToDelete(null)}
          onConfirm={handleDeleteCategory}
      />
    </div>
  );
}


export default function ProductsCatalogPage() {
    return (
    <div className="space-y-8">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">الكتالوج</h1>
            <p className="text-muted-foreground">إدارة شاملة للمنتجات والمخزون والفئات من مكان واحد.</p>
        </div>
        <Tabs defaultValue="products" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="products">إدارة المنتجات</TabsTrigger>
                <TabsTrigger value="inventory">إدارة المخزون</TabsTrigger>
                <TabsTrigger value="categories">إدارة الفئات</TabsTrigger>
            </TabsList>
            <TabsContent value="products">
                <ProductManagementTab />
            </TabsContent>
            <TabsContent value="inventory">
                <InventoryTab />
            </TabsContent>
            <TabsContent value="categories">
                <CategoriesTab />
            </TabsContent>
        </Tabs>
    </div>
    )
}
