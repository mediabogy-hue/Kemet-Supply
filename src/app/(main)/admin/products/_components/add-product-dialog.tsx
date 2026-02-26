

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, errorEmitter, FirestorePermissionError, useCollection, useMemoFirebase } from "@/firebase";
import { collection, doc, setDoc, serverTimestamp, query, orderBy, writeBatch } from "firebase/firestore";
import type { Product, ProductCategory } from "@/lib/types";
import { Loader2, PlusCircle, Briefcase } from "lucide-react";
import { scrapeProductFromUrl } from "@/ai/flows/scrape-product-flow";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useSession } from "@/auth/SessionProvider";


export function AddProductDialog() {
  const { firestore, user, profile } = useSession();
  const { toast } = useToast();

  const categoriesQuery = useMemoFirebase(() => (firestore && user) ? query(collection(firestore, "productCategories"), orderBy("name", "asc")) : null, [firestore, user]);
  const { data: categories, isLoading: categoriesLoading } = useCollection<ProductCategory>(categoriesQuery);

  // Product fields
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [commission, setCommission] = useState("");
  const [stockQuantity, setStockQuantity] = useState("");
  const [imageUrls, setImageUrls] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [purchaseUrl, setPurchaseUrl] = useState("");
  const [isAvailable, setIsAvailable] = useState(true);
  
  // Control state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [isImporting, setIsImporting] = useState(false);


  const resetForm = () => {
      setName("");
      setCategory("");
      setDescription("");
      setPrice("");
      setCommission("");
      setStockQuantity("");
      setImageUrls("");
      setVideoUrl("");
      setPurchaseUrl("");
      setIsAvailable(true);
      setImportUrl("");
  };

  const handleImportFromUrl = async () => {
    if (!importUrl) {
        toast({ variant: 'destructive', title: 'الرجاء إدخال رابط' });
        return;
    }
    
    const categoryNames = categories?.map(c => c.name) || [];
    if (categoryNames.length === 0) {
        toast({ variant: 'destructive', title: 'لا توجد فئات', description: 'الرجاء إضافة فئات أولاً من صفحة إدارة الفئات.' });
        return;
    }

    setIsImporting(true);
    try {
        const data = await scrapeProductFromUrl(importUrl, categoryNames);
        
        if (data.name) setName(data.name);
        if (data.description) setDescription(data.description);
        if (data.price) setPrice(data.price.toString());
        if (data.imageUrls && data.imageUrls.length > 0) {
            setImageUrls(data.imageUrls.join('\n'));
        }
        if (data.category) setCategory(data.category);
        
        setPurchaseUrl(importUrl);

        toast({ title: 'تم استيراد بيانات المنتج بنجاح!' });

    } catch (error: any) {
        console.error("Import error:", error);
        toast({
            variant: "destructive",
            title: "فشل استيراد البيانات",
            description: error.message || "لم نتمكن من جلب البيانات من الرابط. قد تكون هناك مشكلة في الخادم أو الرابط غير صحيح.",
        });
    } finally {
        setIsImporting(false);
    }
  };


  const handleSaveProduct = async () => {
    const priceNumber = parseFloat(price);
    const commissionNumber = parseFloat(commission);
    const quantityNumber = parseInt(stockQuantity, 10);

    if (!name || !description || isNaN(priceNumber) || isNaN(quantityNumber) || isNaN(commissionNumber) || !category) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "الرجاء ملء جميع الحقول المطلوبة بقيم صحيحة، بما في ذلك الفئة.",
      });
      return;
    }
    
    if (priceNumber <= 0 || quantityNumber < 0 || commissionNumber < 0) {
        toast({
            variant: "destructive",
            title: "خطأ في الإدخال",
            description: "السعر، العمولة، والكمية يجب أن تكون أرقامًا موجبة.",
        });
        return;
    }

    if (!firestore || !user || !profile) {
        toast({ variant: "destructive", title: "خطأ", description: "خدمات Firebase غير متاحة." });
        return;
    }

    setIsSubmitting(true);
    
    try {
        const batch = writeBatch(firestore);
        const finalCategoryName = category.trim();

        const existingCategory = categories?.find(c => c.name.trim().toLowerCase() === finalCategoryName.toLowerCase());

        if (!existingCategory && finalCategoryName) {
            const categoryId = doc(collection(firestore, "productCategories")).id;
            const categoryDocRef = doc(firestore, "productCategories", categoryId);
            const newCategoryData = {
              id: categoryId,
              name: finalCategoryName,
              imageUrl: `https://picsum.photos/seed/${encodeURIComponent(finalCategoryName)}/200`,
              dataAiHint: finalCategoryName.split(" ").slice(0, 2).join(" "),
              isAvailable: true,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            };
            batch.set(categoryDocRef, newCategoryData);
        }
        
        const productId = doc(collection(firestore, "products")).id;
        const productDocRef = doc(firestore, "products", productId);
        const parsedImageUrls = imageUrls.split('\n').map(url => url.trim()).filter(Boolean);

        const newProductData: Omit<Product, 'createdAt' | 'updatedAt'> & { createdAt: any, updatedAt: any } = {
          id: productId,
          name: name,
          category: finalCategoryName,
          description: description,
          price: priceNumber,
          commission: commissionNumber,
          stockQuantity: quantityNumber,
          isAvailable: isAvailable,
          imageUrls: parsedImageUrls,
          videoUrl: videoUrl,
          purchaseUrl: purchaseUrl,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        if (profile.role === 'Merchant') {
            newProductData.merchantId = user.uid;
            newProductData.merchantName = `${profile.firstName} ${profile.lastName}`.trim();
        }
        
        batch.set(productDocRef, newProductData);
        
        await batch.commit();

        setIsOpen(false);
        resetForm();
      }
      catch (error: any) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: 'products and/or productCategories',
          operation: 'create',
          requestResourceData: { productName: name, categoryName: category }
        }));
        toast({
          variant: "destructive",
          title: "فشل إضافة المنتج",
          description: "قد لا تملك الصلاحيات الكافية.",
        });
      }
      finally {
          setIsSubmitting(false);
      }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (isSubmitting) return;
        setIsOpen(open);
        if (!open) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle />
          إضافة منتج جديد
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>إضافة منتج جديد</DialogTitle>
          <DialogDescription>
            أدخل تفاصيل المنتج الجديد أو استوردها من رابط.
          </DialogDescription>
        </DialogHeader>
        
        <div className="max-h-[65vh] overflow-y-auto px-1 space-y-4">
            <div className="border-b pb-4">
                <Label htmlFor="import-url" className="mb-2 block">استيراد من رابط</Label>
                <div className="flex gap-2">
                    <Input 
                        id="import-url"
                        placeholder="https://example.com/product-page"
                        value={importUrl}
                        onChange={(e) => setImportUrl(e.target.value)}
                        disabled={isImporting}
                    />
                    <Button onClick={handleImportFromUrl} disabled={isImporting || categoriesLoading}>
                        {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'جلب البيانات'}
                    </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                    لصق رابط المنتج لجلب البيانات تلقائياً باستخدام الذكاء الاصطناعي.
                </p>
            </div>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  الاسم
                </Label>
                <Input id="name" placeholder="مثال: سماعة لاسلكية" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3"/>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="category" className="text-right">
                    الفئة
                </Label>
                <Input id="category" placeholder="اكتب اسم فئة جديدة أو موجودة" value={category} onChange={(e) => setCategory(e.target.value)} className="col-span-3"/>
               </div>
               <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="description" className="text-right pt-2">
                  الوصف
                </Label>
                <Textarea id="description" placeholder="وصف مختصر ومفيد للمنتج" value={description} onChange={(e) => setDescription(e.target.value)} className="col-span-3" rows={4}/>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="price" className="text-right">
                  السعر (ج.م)
                </Label>
                <Input id="price" type="number" placeholder="99.99" value={price} onChange={(e) => setPrice(e.target.value)} className="col-span-3"/>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="commission" className="text-right">
                  العمولة (ج.م)
                </Label>
                <Input id="commission" type="number" placeholder="10.00" value={commission} onChange={(e) => setCommission(e.target.value)} className="col-span-3"/>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="stockQuantity" className="text-right">
                  الكمية المتاحة
                </Label>
                <Input id="stockQuantity" type="number" placeholder="100" value={stockQuantity} onChange={(e) => setStockQuantity(e.target.value)} className="col-span-3"/>
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="imageUrls" className="text-right pt-2">
                  روابط الصور
                </Label>
                <Textarea id="imageUrls" placeholder="ضع كل رابط في سطر منفصل" value={imageUrls} onChange={(e) => setImageUrls(e.target.value)} className="col-span-3" rows={4}/>
              </div>
               <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="videoUrl" className="text-right">
                  رابط الفيديو
                </Label>
                <Input id="videoUrl" placeholder="https://example.com/video.mp4" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} className="col-span-3"/>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="purchaseUrl" className="text-right">
                  رابط الشراء
                </Label>
                <Input id="purchaseUrl" placeholder="https://supplier.com/product (اختياري)" value={purchaseUrl} onChange={(e) => setPurchaseUrl(e.target.value)} className="col-span-3"/>
              </div>
               <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="isAvailable" className="text-right">
                  الحالة
                </Label>
                <div className="col-span-3 flex items-center gap-2">
                    <Switch id="isAvailable" checked={isAvailable} onCheckedChange={setIsAvailable}/>
                    <span>{isAvailable ? "نشط" : "غير نشط"}</span>
                </div>
              </div>
            </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isSubmitting}>إلغاء</Button>
          </DialogClose>
          <Button type="button" onClick={handleSaveProduct} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? 'جاري الحفظ...' : 'حفظ المنتج'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
