
"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Link as LinkIcon, Box, CircleDollarSign, Download, Loader2, Search, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUser, useFirestore } from "@/firebase";
import { collection, query, where, getDocs, orderBy, limit, startAfter, DocumentSnapshot, documentId } from "firebase/firestore";
import type { Product } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { downloadAsset } from "@/lib/utils";
import { useState, useEffect, useCallback, useMemo } from "react";
import { CategoryBrowser } from "./_components/category-browser";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const PAGE_SIZE = 8;

export default function ProductsPage() {
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastVisible, setLastVisible] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [linkToCopy, setLinkToCopy] = useState<string | null>(null);

  const fetchProducts = useCallback(async (loadMore = false) => {
    if (!firestore || !user) return;
    
    if(loadMore) {
        setIsLoadingMore(true);
    } else {
        setIsLoading(true);
    }
    setError(null);

    try {
      let productsQuery = query(
        collection(firestore, "products"), 
        where("isAvailable", "==", true),
        orderBy(documentId()),
        limit(PAGE_SIZE)
      );

      if (loadMore && lastVisible) {
        productsQuery = query(productsQuery, startAfter(lastVisible));
      }

      const documentSnapshots = await getDocs(productsQuery);
      
      const newProducts = documentSnapshots.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      
      const lastDoc = documentSnapshots.docs[documentSnapshots.docs.length - 1];
      setLastVisible(lastDoc);

      if (documentSnapshots.docs.length < PAGE_SIZE) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }
      
      setProducts(prevProducts => loadMore ? [...prevProducts, ...newProducts] : newProducts);

    } catch (e: any) {
        console.error("Failed to fetch products:", e);
        setError(e);
        toast({
            variant: "destructive",
            title: "خطأ في تحميل المنتجات",
            description: e.message || "حدث خطأ غير متوقع أثناء تحميل المنتجات."
        });
    } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
    }
  }, [firestore, user, lastVisible, toast]);


  useEffect(() => {
    if (!isUserLoading && user && firestore) {
        fetchProducts(false);
    } else if (!isUserLoading && !user) {
        setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUserLoading, user, firestore]); 

  const filteredProducts = useMemo(() => {
    return (products || [])
      .filter(product =>
        (selectedCategory === 'all' || product.category === selectedCategory) &&
        (searchTerm === '' || product.name.toLowerCase().includes(searchTerm.toLowerCase()) || product.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
  }, [products, selectedCategory, searchTerm]);


  const handleCopyLink = (productId: string) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "يجب عليك تسجيل الدخول لنسخ الرابط.",
      });
      return;
    }

    const link = `${window.location.origin}/product/${productId}?ref=${user.uid}`;
    navigator.clipboard.writeText(link).then(() => {
      toast({
        title: "تم نسخ رابط التسويق الخاص بك",
        description: "يمكنك الآن مشاركة رابط المنتج لتتبع مبيعاتك.",
      });
    }).catch(err => {
      console.error('Failed to copy: ', err);
      // Fallback to showing the dialog
      setLinkToCopy(link);
    });
  };

  const handleDownloadAssets = async (product: Product) => {
    if (!product.imageUrls?.length && !product.videoUrl) {
      toast({
        variant: "destructive",
        title: "لا توجد مرفقات",
        description: "لا توجد صور أو فيديوهات متاحة للتحميل لهذا المنتج.",
      });
      return;
    }

    toast({
      title: "بدأ تحميل المرفقات",
      description: "تحقق من مجلد التنزيلات في جهازك.",
    });

    try {
      if (product.imageUrls) {
        for (const [index, url] of product.imageUrls.entries()) {
          const originalFilename = url.split('?')[0].split('/').pop() || `image-${index}`;
          const decodedFilename = decodeURIComponent(originalFilename);
          const extension = decodedFilename.split('.').pop() || 'jpg';
          await downloadAsset(url, `${product.name.replace(/ /g, '_')}_image_${index + 1}.${extension}`);
        }
      }
      if (product.videoUrl) {
        const originalFilename = product.videoUrl.split('?')[0].split('/').pop() || `video`;
        const decodedFilename = decodeURIComponent(originalFilename);
        const extension = decodedFilename.split('.').pop() || 'mp4';
        await downloadAsset(product.videoUrl, `${product.name.replace(/ /g, '_')}_video.${extension}`);
      }
    } catch (error) {
        console.error('Download assets error:', error);
        toast({
            variant: "destructive",
            title: "فشل تحميل المرفقات",
            description: "حدث خطأ أثناء محاولة تحميل الملفات. قد تكون هناك مشكلة في إعدادات CORS على خادم التخزين.",
        });
    }
  };


  return (
    <div className="flex flex-col gap-8">
      <CategoryBrowser 
        selectedCategory={selectedCategory}
        onSelectCategory={(category) => {
          setSelectedCategory(category);
          setSearchTerm('');
        }}
      />

      <div className="relative mt-4">
        <Search className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input 
            placeholder={`ابحث في فئة "${selectedCategory === 'all' ? 'الكل' : selectedCategory}"...`} 
            className="w-full pr-12 h-12 text-base" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {error && (
         <Alert variant="destructive">
            <AlertTitle>حدث خطأ</AlertTitle>
            <AlertDescription>
                لم نتمكن من تحميل المنتجات. قد تكون هناك مشكلة في صلاحيات الوصول أو أن فهرس قاعدة البيانات المطلوب غير موجود.
                <p className="mt-2 text-xs font-mono">{error.message}</p>
            </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {isLoading && !isLoadingMore && Array.from({ length: PAGE_SIZE }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="p-0">
              <Skeleton className="rounded-t-lg w-full aspect-square" />
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-5 w-1/3" />
            </CardContent>
            <CardFooter className="p-4 pt-0">
              <Skeleton className="h-10 w-full" />
            </CardFooter>
          </Card>
        ))}
        {filteredProducts.map((product) => (
          <Card key={product.id} className="group overflow-hidden flex flex-col">
            <CardHeader className="p-0 bg-muted/30">
                <div className="aspect-square w-full overflow-hidden">
                    <Image
                        src={product.imageUrls?.[0] || `https://picsum.photos/seed/${product.id}/600/600`}
                        alt={product.name}
                        width={600}
                        height={600}
                        className="rounded-t-lg object-contain w-full h-full transition-transform duration-300 group-hover:scale-105"
                    />
                </div>
            </CardHeader>
            <CardContent className="p-4 flex-grow">
              <CardTitle className="text-lg leading-tight">{product.name}</CardTitle>
              <CardDescription className="text-primary font-bold text-xl mt-2">
                {product.price?.toFixed(2)} ج.م
              </CardDescription>
              {(product.commission || 0) > 0 && (
                <div className="flex items-center text-sm text-green-500 font-semibold mt-2">
                    <CircleDollarSign className="me-2 h-5 w-5 text-primary" />
                    <span className="text-base text-primary">ربحك: {product.commission?.toFixed(2)} ج.م</span>
                </div>
              )}
            </CardContent>
            <CardFooter className="p-4 pt-0 grid grid-cols-2 gap-2">
              <Button variant="outline" className="w-full h-11" onClick={() => handleCopyLink(product.id)}>
                <LinkIcon className="me-2 h-4 w-4" />
                نسخ رابط
              </Button>
              <Button variant="secondary" className="w-full h-11" onClick={() => handleDownloadAssets(product)}>
                <Download className="me-2 h-4 w-4" />
                المرفقات
              </Button>
            </CardFooter>
          </Card>
        ))}
         {isLoadingMore && Array.from({ length: 4 }).map((_, i) => (
          <Card key={`more-${i}`}>
            <CardHeader className="p-0">
              <Skeleton className="rounded-t-lg w-full aspect-square" />
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-5 w-1/3" />
            </CardContent>
            <CardFooter className="p-4 pt-0">
              <Skeleton className="h-10 w-full" />
            </CardFooter>
          </Card>
        ))}
      </div>

      {!isLoading && !error && products.length > 0 && filteredProducts.length === 0 && (
        <Card className="col-span-full mt-4">
            <CardContent className="flex flex-col items-center justify-center gap-4 p-12">
                <Box className="h-16 w-16 text-muted-foreground" />
                <p className="text-muted-foreground">لا توجد منتجات تطابق بحثك أو الفلتر المحدد.</p>
            </CardContent>
        </Card>
      )}
      
      {!isLoading && !error && products.length === 0 && (
         <Card className="col-span-full mt-4">
            <CardContent className="flex flex-col items-center justify-center gap-4 p-12">
                <Box className="h-16 w-16 text-muted-foreground" />
                <p className="text-muted-foreground">لا توجد منتجات متاحة للعرض حاليًا.</p>
            </CardContent>
        </Card>
      )}

      <div className="mt-8 flex justify-center">
        {hasMore && !searchTerm && (
            <Button onClick={() => fetchProducts(true)} disabled={isLoadingMore}>
                {isLoadingMore ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        جاري التحميل...
                    </>
                ) : (
                    'تحميل المزيد'
                )}
            </Button>
        )}
      </div>

      <Dialog open={!!linkToCopy} onOpenChange={(open) => !open && setLinkToCopy(null)}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>انسخ رابط التسويق</DialogTitle>
              <DialogDescription>
                لم نتمكن من النسخ تلقائياً بسبب قيود المتصفح. الرجاء نسخ الرابط يدوياً من الحقل أدناه.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="fallback-link" className="sr-only">Link</Label>
              <Input
                  id="fallback-link"
                  defaultValue={linkToCopy || ''}
                  readOnly
                  onFocus={(e) => e.target.select()}
                  className="text-left"
                  dir="ltr"
              />
            </div>
            <DialogFooter className="sm:justify-start mt-4">
              <DialogClose asChild>
                  <Button type="button" variant="secondary">
                  إغلاق
                  </Button>
              </DialogClose>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

    