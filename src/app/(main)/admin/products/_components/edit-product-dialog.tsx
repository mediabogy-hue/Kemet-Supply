"use client";

import { useState, useEffect, useRef } from "react";
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
import { useFirestore, useStorage } from "@/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import type { Product, ScrapedProductData } from "@/lib/types";
import { Loader2, Upload, Trash2, Sparkles } from "lucide-react";
import { useSession } from "@/auth/SessionProvider";
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { compressImage } from "@/lib/utils";
import Image from "next/image";


interface EditProductDialogProps {
    product: Product | null;
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
}

export function EditProductDialog({ product, isOpen, onOpenChange }: EditProductDialogProps) {
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();

  const imageInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [commission, setCommission] = useState("");
  const [stockQuantity, setStockQuantity] = useState("");
  const [purchaseUrl, setPurchaseUrl] = useState("");
  const [isAvailable, setIsAvailable] = useState(true);

  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [videoUrlInput, setVideoUrlInput] = useState("");
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [newImageUrlLinksInput, setNewImageUrlLinksInput] = useState("");
  
  // Scraper State
  const [scrapeUrl, setScrapeUrl] = useState("");
  const [isScraping, setIsScraping] = useState(false);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setNewImageFiles([]);
    setNewImageUrlLinksInput("");
    setScrapeUrl("");
    setIsSubmitting(false);
  }

  useEffect(() => {
    if (product && isOpen) {
        setName(product.name || "");
        setCategory(product.category || "");
        setDescription(product.description || "");
        setPrice(product.price?.toString() || "");
        setCommission(product.commission?.toString() || "");
        setStockQuantity(product.stockQuantity?.toString() || "");
        setImageUrls(product.imageUrls || []);
        setVideoUrlInput(product.videoUrl || "");
        setPurchaseUrl(product.purchaseUrl || "");
        setIsAvailable(product.isAvailable);
    } else if (!isOpen) {
        resetForm();
    }
  }, [product, isOpen]);

  const handleScrapeProduct = async () => {
    if (!scrapeUrl) {
      toast({ variant: 'destructive', title: 'خطأ', description: 'الرجاء إدخال رابط المنتج أولاً.' });
      return;
    }
    setIsScraping(true);
    try {
      const response = await fetch('/api/scrape-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: scrapeUrl }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'فشل جلب البيانات.');
      }
      const data: ScrapedProductData = await response.json();
      
      setName(data.name || name);
      setDescription(data.description || description);
      setPrice(data.price?.toString() || price);
      setCategory(data.category || category);
      setNewImageUrlLinksInput(prev => [prev, ...data.imageUrls].filter(Boolean).join('\n'));

      toast({ title: 'تم جلب البيانات بنجاح!' });

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "فشل جلب البيانات",
        description: error.message,
      });
    } finally {
      setIsScraping(false);
    }
  };

  const handleRemoveImage = (urlToRemove: string) => {
    setImageUrls(prev => prev.filter(url => url !== urlToRemove));
  };

  const handleUpdateProduct = () => {
    if (isSubmitting || !product || !firestore || !storage) return;
    
    setIsSubmitting(true);
    onOpenChange(false);

    const { update: updateToast } = toast({
      title: "جاري تحديث المنتج...",
      description: name,
      duration: 999999,
    });

    (async () => {
        try {
            let finalImageUrls = [...imageUrls];
            const parsedNewUrls = newImageUrlLinksInput.split('\n').map(url => url.trim()).filter(Boolean);
            finalImageUrls.push(...parsedNewUrls);

            if (newImageFiles.length > 0) {
                const imageUploadPromises = newImageFiles.map(async (file) => {
                    const compressedBlob = await compressImage(file, { maxWidth: 1024, quality: 0.8 });
                    const fileRef = storageRef(storage, `products/${product.id}/${Date.now()}-${file.name}`);
                    const snapshot = await uploadBytes(fileRef, compressedBlob);
                    return getDownloadURL(snapshot.ref);
                });
                const newUrls = await Promise.all(imageUploadPromises);
                finalImageUrls.push(...newUrls);
            }

            const finalVideoUrl = videoUrlInput.trim() || null;

            const productDocRef = doc(firestore, "products", product.id);
            const updatedData: any = {
              name, category, description,
              price: parseFloat(price) || 0,
              commission: parseFloat(commission) || 0,
              stockQuantity: parseInt(stockQuantity, 10) || 0,
              isAvailable, purchaseUrl,
              imageUrls: finalImageUrls, videoUrl: finalVideoUrl,
              updatedAt: serverTimestamp(),
            };

            await updateDoc(productDocRef, updatedData);

            updateToast({
                title: "✅ تم تحديث المنتج بنجاح!",
                description: name,
                duration: 5000,
            });
        } catch (error: any) {
            updateToast({
                variant: "destructive",
                title: "فشل تحديث المنتج",
                description: error.message || "قد لا تملك الصلاحيات الكافية.",
                duration: 10000,
            });
        } finally {
            resetForm();
        }
    })();
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
             <div className="space-y-2 p-4 border rounded-lg bg-muted/50">
              <Label htmlFor="scrape-url-edit">جلب البيانات تلقائياً بالذكاء الاصطناعي</Label>
              <div className="flex gap-2">
                  <Input 
                      id="scrape-url-edit" 
                      placeholder="لصق الرابط هنا لتحديث البيانات"
                      value={scrapeUrl}
                      onChange={(e) => setScrapeUrl(e.target.value)}
                      disabled={isScraping || isSubmitting}
                  />
                  <Button type="button" onClick={handleScrapeProduct} disabled={isScraping || isSubmitting || !scrapeUrl}>
                      {isScraping ? <Loader2 className="animate-spin" /> : <Sparkles />}
                  </Button>
              </div>
            </div>
            
            <div className="relative py-2">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">أو عدّل البيانات يدوياً</span></div>
            </div>

            <div className="grid gap-4 py-4">
               <div className="space-y-2">
                <Label htmlFor="edit-name">الاسم</Label>
                <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-category">الفئة</Label>
                <Input id="edit-category" placeholder="اكتب اسم فئة جديدة أو موجودة" value={category} onChange={(e) => setCategory(e.target.value)} />
              </div>
               <div className="space-y-2">
                <Label htmlFor="edit-description">الوصف</Label>
                <Textarea id="edit-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="edit-price">السعر (ج.م)</Label>
                    <Input id="edit-price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="edit-commission">العمولة (ج.م)</Label>
                    <Input id="edit-commission" type="number" value={commission} onChange={(e) => setCommission(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-stockQuantity">الكمية المتاحة</Label>
                <Input id="edit-stockQuantity" type="number" value={stockQuantity} onChange={(e) => setStockQuantity(e.target.value)} />
              </div>

               <div className="space-y-2">
                    <Label>صور المنتج الحالية</Label>
                    {imageUrls.length > 0 ? (
                        <div className="grid grid-cols-3 gap-2">
                            {imageUrls.map((url, i) => (
                                <div key={i} className="relative aspect-square group">
                                    <Image src={url} alt="preview" fill className="rounded-md object-cover"/>
                                    <Button size="icon" variant="destructive" className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleRemoveImage(url)}>
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    ) : <p className="text-xs text-muted-foreground">لا توجد صور حالية.</p>}
                </div>
                
                <div className="space-y-2">
                    <Label>إضافة صور جديدة</Label>
                    <div className="space-y-2">
                        <Button type="button" variant="outline" onClick={() => imageInputRef.current?.click()}>
                            <Upload className="me-2"/> رفع صور من الجهاز ({newImageFiles.length})
                        </Button>
                        <Input type="file" ref={imageInputRef} multiple accept="image/*" className="hidden" onChange={(e) => e.target.files && setNewImageFiles(Array.from(e.target.files))} />
                        
                        <div className="space-y-1">
                          <Label htmlFor="new-image-urls" className="text-xs text-muted-foreground">أو إضافة روابط صور جديدة (رابط في كل سطر)</Label>
                          <Textarea id="new-image-urls" placeholder="https://example.com/image3.jpg" value={newImageUrlLinksInput} onChange={(e) => setNewImageUrlLinksInput(e.target.value)} rows={2} />
                        </div>
                    </div>
                    {newImageFiles.length > 0 && <p className="text-sm text-muted-foreground">تم اختيار {newImageFiles.length} صور جديدة للرفع.</p>}
               </div>

              <div className="space-y-2">
                <Label htmlFor="edit-video-url">رابط الفيديو (اختياري)</Label>
                <Input id="edit-video-url" value={videoUrlInput} onChange={(e) => setVideoUrlInput(e.target.value)} placeholder="https://youtube.com/watch?v=..."/>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-purchaseUrl">رابط الشراء</Label>
                <Input id="edit-purchaseUrl" placeholder="https://supplier.com/product (اختياري)" value={purchaseUrl} onChange={(e) => setPurchaseUrl(e.target.value)} />
              </div>
               <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                 <div className="space-y-0.5">
                    <Label htmlFor="edit-isAvailable">الحالة</Label>
                    <p className="text-xs text-muted-foreground">إلغاء التفعيل سيخفي المنتج من المتجر.</p>
                </div>
                <Switch id="edit-isAvailable" checked={isAvailable} onCheckedChange={setIsAvailable} />
              </div>
            </div>
        </div>
        <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button type="button" onClick={handleUpdateProduct}>
            حفظ التغييرات
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
