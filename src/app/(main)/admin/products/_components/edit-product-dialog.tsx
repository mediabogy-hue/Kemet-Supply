"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, errorEmitter, FirestorePermissionError, useCollection, useMemoFirebase } from "@/firebase";
import { doc, updateDoc, serverTimestamp, collection, query, orderBy, writeBatch } from "firebase/firestore";
import type { Product, ProductCategory } from "@/lib/types";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Briefcase, Loader2, Globe, Sparkles } from "lucide-react";
import { useSession } from "@/auth/SessionProvider";


interface EditProductDialogProps {
    product: Product | null;
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
}

export function EditProductDialog({ product, isOpen, onOpenChange }: EditProductDialogProps) {
  const firestore = useFirestore();
  const { user, profile } = useSession();
  const { toast } = useToast();

  const categoriesQuery = useMemoFirebase(() => (firestore && user) ? query(collection(firestore, "productCategories"), orderBy("name", "asc")) : null, [firestore, user]);
  const { data: categories } = useCollection<ProductCategory>(categoriesQuery);

  // Product state
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

  // Scrape state
  const [scrapeUrl, setScrapeUrl] = useState("");
  const [isScraping, setIsScraping] = useState(false);

  // Control state
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (product) {
        setName(product.name || "");
        setCategory(product.category || "");
        setDescription(product.description || "");
        setPrice(product.price?.toString() || "");
        setCommission(product.commission?.toString() || "");
        setStockQuantity(product.stockQuantity?.toString() || "");
        setImageUrls(product.imageUrls?.join('\n') || "");
        setVideoUrl(product.videoUrl || "");
        setPurchaseUrl(product.purchaseUrl || "");
        setIsAvailable(product.isAvailable);
    }
  }, [product]);

  const handleScrape = async () => {
    if (!scrapeUrl) {
      toast({ variant: 'destructive', title: 'الرجاء إدخال رابط' });
      return;
    }
    setIsScraping(true);
    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: scrapeUrl }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'فشل جلب البيانات');
      }

      const data = await response.json();
      
      // Populate form fields
      setName(data.name || '');
      setDescription(data.description || '');
      setPrice(data.price?.toString() || '');
      setImageUrls(data.imageUrls?.join('\n') || '');
      setCategory(data.category || '');
      
      toast({ title: 'تم جلب البيانات بنجاح!', description: 'البيانات الحالية تم استبدالها بالبيانات الجديدة.' });

    } catch (error: any) {
      toast({ variant: 'destructive', title: 'خطأ أثناء جلب البيانات', description: error.message });
    } finally {
      setIsScraping(false);
    }
  };

  const handleUpdateProduct = async () => {
    if (!product || !firestore || !profile) return;

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

    setIsSubmitting(true);
    
    try {
        const batch = writeBatch(firestore);
        const finalCategoryName = category.trim();

        const existingCategory = categories?.find(c => c.name.trim().toLowerCase() === finalCategoryName.toLowerCase());

        if (!existingCategory && finalCategoryName) {
            if (profile.role === 'Admin') {
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
            } else {
                 toast({
                    variant: "destructive",
                    title: "فئة غير موجودة",
                    description: `الفئة "${finalCategoryName}" غير موجودة. لا يمكنك إنشاء فئات جديدة.`,
                });
                setIsSubmitting(false);
                return;
            }
        }

        const productDocRef = doc(firestore, "products", product.id);
        const parsedImageUrls = imageUrls.split('\n').map(url => url.trim()).filter(Boolean);

        const updatedData: any = {
          name,
          category: finalCategoryName,
          description,
          price: priceNumber,
          commission: commissionNumber,
          stockQuantity: quantityNumber,
          isAvailable,
          purchaseUrl,
          imageUrls: parsedImageUrls,
          videoUrl: videoUrl,
          updatedAt: serverTimestamp(),
        };

        batch.update(productDocRef, updatedData);
        
        await batch.commit();
        onOpenChange(false);
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "فشل تحديث المنتج",
            description: "قد لا تملك الصلاحيات الكافية.",
        });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if(isSubmitting) return;
        onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>تعديل المنتج</DialogTitle>
          <DialogDescription>
            تحديث تفاصيل المنتج. ستنعكس التغييرات على جميع المسوقين.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto px-2 space-y-4">
            <div className="space-y-2 rounded-lg border p-4">
                <Label htmlFor="scrape-url-edit" className="flex items-center gap-2 font-semibold">
                    <Sparkles className="text-primary" />
                    استبدال البيانات من رابط
                </Label>
                <div className="flex gap-2">
                    <Input 
                        id="scrape-url-edit"
                        placeholder="الصق رابط منتج جديد..."
                        value={scrapeUrl}
                        onChange={(e) => setScrapeUrl(e.target.value)}
                        disabled={isScraping || isSubmitting}
                    />
                    <Button type="button" onClick={handleScrape} disabled={isScraping || isSubmitting}>
                        {isScraping ? <Loader2 className="animate-spin"/> : <Globe />}
                    </Button>
                </div>
            </div>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">
                  الاسم
                </Label>
                <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3"/>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-category" className="text-right">
                    الفئة
                </Label>
                <Input id="edit-category" placeholder="اكتب اسم فئة جديدة أو موجودة" value={category} onChange={(e) => setCategory(e.target.value)} className="col-span-3"/>
              </div>
               <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="edit-description" className="text-right pt-2">
                  الوصف
                </Label>
                <Textarea id="edit-description" value={description} onChange={(e) => setDescription(e.target.value)} className="col-span-3" rows={4}/>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-price" className="text-right">
                  السعر (ج.م)
                </Label>
                <Input id="edit-price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="col-span-3"/>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-commission" className="text-right">
                  العمولة (ج.م)
                </Label>
                <Input id="edit-commission" type="number" value={commission} onChange={(e) => setCommission(e.target.value)} className="col-span-3"/>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-stockQuantity" className="text-right">
                  الكمية المتاحة
                </Label>
                <Input id="edit-stockQuantity" type="number" value={stockQuantity} onChange={(e) => setStockQuantity(e.target.value)} className="col-span-3"/>
              </div>
               <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="edit-imageUrls" className="text-right pt-2">
                  روابط الصور
                </Label>
                <Textarea id="edit-imageUrls" placeholder="ضع كل رابط في سطر منفصل" value={imageUrls} onChange={(e) => setImageUrls(e.target.value)} className="col-span-3" rows={4}/>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-videoUrl" className="text-right">
                    رابط الفيديو
                </Label>
                <Input id="edit-videoUrl" placeholder="https://example.com/video.mp4" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} className="col-span-3"/>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-purchaseUrl" className="text-right">
                  رابط الشراء
                </Label>
                <Input id="edit-purchaseUrl" placeholder="https://supplier.com/product (اختياري)" value={purchaseUrl} onChange={(e) => setPurchaseUrl(e.target.value)} className="col-span-3"/>
              </div>
               <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-isAvailable" className="text-right">
                  الحالة
                </Label>
                <div className="col-span-3 flex items-center gap-2">
                    <Switch id="edit-isAvailable" checked={isAvailable} onCheckedChange={setIsAvailable}/>
                    <span>{isAvailable ? "نشط" : "غير نشط"}</span>
                </div>
              </div>
            </div>
        </div>
        <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>إلغاء</Button>
          <Button type="button" onClick={handleUpdateProduct} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? 'جاري الحفظ...' : 'حفظ التغييرات'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
