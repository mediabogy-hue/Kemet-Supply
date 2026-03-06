'use client';

import { useState, useRef } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useStorage } from "@/firebase";
import { useCollection } from "@/firebase";
import { useMemoFirebase } from "@/firebase";
import { useSession } from "@/auth/SessionProvider";
import { collection, doc, setDoc, serverTimestamp, query, orderBy } from "firebase/firestore";
import type { Product, ProductCategory } from "@/lib/types";
import { PlusCircle, Upload } from "lucide-react";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { compressImage } from "@/lib/utils";
import Image from "next/image";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function AddProductDialog() {
  const { user, profile } = useSession();
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();

  const categoriesQuery = useMemoFirebase(() => (firestore && user) ? query(collection(firestore, "productCategories"), orderBy("name", "asc")) : null, [firestore, user]);
  const { data: categories, isLoading: categoriesLoading } = useCollection<ProductCategory>(categoriesQuery);

  const imageInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [commission, setCommission] = useState("");
  const [stockQuantity, setStockQuantity] = useState("");
  const [purchaseUrl, setPurchaseUrl] = useState("");
  
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imageUrlLinksInput, setImageUrlLinksInput] = useState("");
  const [videoUrlInput, setVideoUrlInput] = useState("");
  
  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const resetForm = () => {
      setName("");
      setCategory("");
      setDescription("");
      setPrice("");
      setCommission("");
      setStockQuantity("");
      setPurchaseUrl("");
      setImageFiles([]);
      setImageUrlLinksInput("");
      setVideoUrlInput("");
      setIsSubmitting(false);
  };

  const handleSaveProduct = () => {
    if (isSubmitting) return;

    const priceNumber = parseFloat(price);
    const commissionNumber = parseFloat(commission);
    const quantityNumber = parseInt(stockQuantity, 10);

    if (!name || !description || isNaN(priceNumber) || isNaN(quantityNumber) || isNaN(commissionNumber) || !category) {
      toast({ variant: "destructive", title: "خطأ", description: "الرجاء ملء جميع الحقول المطلوبة بقيم صحيحة." });
      return;
    }
    const parsedImageUrls = imageUrlLinksInput.split('\n').map(url => url.trim()).filter(Boolean);
    if (imageFiles.length === 0 && parsedImageUrls.length === 0) {
      toast({ variant: "destructive", title: "خطأ", description: "يجب رفع صورة واحدة على الأقل أو إضافة رابط صورة." });
      return;
    }
    
    if (!firestore || !user || !profile || !storage) {
        toast({ variant: "destructive", title: "خطأ", description: "خدمات Firebase غير متاحة." });
        return;
    }

    setIsSubmitting(true);
    setIsOpen(false);

    const { update: updateToast } = toast({
      title: "جاري إضافة المنتج...",
      description: "سيتم رفع الملفات وحفظ البيانات في الخلفية.",
      duration: 999999,
    });

    (async () => {
      try {
        const productId = doc(collection(firestore, "id_generator")).id;

        const imageUploadPromises = imageFiles.map(async (file) => {
          const compressedBlob = await compressImage(file, { maxWidth: 1024, quality: 0.8 });
          const fileRef = storageRef(storage, `products/${productId}/${Date.now()}-${file.name}`);
          const snapshot = await uploadBytes(fileRef, compressedBlob);
          return getDownloadURL(snapshot.ref);
        });
        
        const uploadedImageUrls = await Promise.all(imageUploadPromises);
        const finalImageUrls = [...uploadedImageUrls, ...parsedImageUrls];
        const finalVideoUrl = videoUrlInput.trim();
        
        const productDocRef = doc(firestore, "products", productId);
        
        const newProductData: Omit<Product, 'createdAt' | 'updatedAt' | 'isAvailable'> & { createdAt: any, updatedAt: any, isAvailable: boolean } = {
          id: productId, name, category, description,
          price: priceNumber, commission: commissionNumber, stockQuantity: quantityNumber,
          isAvailable: false,
          approvalStatus: 'Pending',
          imageUrls: finalImageUrls, 
          videoUrl: finalVideoUrl || null,
          purchaseUrl: purchaseUrl || null,
          merchantId: profile?.role === 'Merchant' ? user.uid : null,
          merchantName: profile?.role === 'Merchant' ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() : 'Kemet Supply',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        
        await setDoc(productDocRef, newProductData);

        updateToast({
          title: "✅ تم إضافة المنتج بنجاح!",
          description: `${name} الآن قيد المراجعة.`,
          duration: 5000,
        });

      } catch (error: any) {
        console.error("Product creation failed:", error);
        updateToast({
          variant: "destructive",
          title: "فشل إضافة المنتج",
          description: String(error.message || error),
          duration: 10000,
        });
      } finally {
        resetForm();
      }
    })();
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
            سيخضع المنتج للمراجعة قبل أن يظهر للمسوقين.
          </DialogDescription>
        </DialogHeader>
        
        <div className="max-h-[65vh] overflow-y-auto px-1 space-y-4">
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">اسم المنتج</Label>
                <Input id="name" placeholder="مثال: سماعة لاسلكية" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">الفئة</Label>
                 <Select value={category} onValueChange={setCategory} disabled={categoriesLoading}>
                    <SelectTrigger id="category">
                        <SelectValue placeholder={categoriesLoading ? "جاري تحميل الفئات..." : "اختر فئة المنتج"} />
                    </SelectTrigger>
                    <SelectContent>
                        {categories?.map((cat) => (
                            <SelectItem key={cat.id} value={cat.name}>
                                {cat.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
               </div>
               <div className="space-y-2">
                <Label htmlFor="description">الوصف</Label>
                <Textarea id="description" placeholder="وصف مختصر ومفيد للمنتج" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">السعر (ج.م)</Label>
                    <Input id="price" type="number" placeholder="99.99" value={price} onChange={(e) => setPrice(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="commission">عمولة المسوق (ج.م)</Label>
                    <Input id="commission" type="number" placeholder="10.00" value={commission} onChange={(e) => setCommission(e.target.value)} />
                  </div>
              </div>
               <div className="space-y-2">
                <Label htmlFor="stockQuantity">الكمية المتاحة</Label>
                <Input id="stockQuantity" type="number" placeholder="100" value={stockQuantity} onChange={(e) => setStockQuantity(e.target.value)} />
              </div>

               <div className="space-y-2">
                    <Label>ملفات المنتج</Label>
                    <Button type="button" variant="outline" onClick={() => imageInputRef.current?.click()}>
                        <Upload className="me-2"/> رفع صور من الجهاز ({imageFiles.length})
                    </Button>
                    <Input type="file" ref={imageInputRef} multiple accept="image/*" className="hidden" onChange={(e) => e.target.files && setImageFiles(Array.from(e.target.files))} />
                    
                    <div className="space-y-1 pt-2">
                        <Label htmlFor="image-urls">أو إضافة روابط صور (رابط في كل سطر)</Label>
                        <Textarea id="image-urls" placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.png" value={imageUrlLinksInput} onChange={(e) => setImageUrlLinksInput(e.target.value)} rows={3} />
                    </div>

                    <div className="space-y-1 pt-2">
                        <Label htmlFor="video-url">رابط فيديو (اختياري)</Label>
                        <Input id="video-url" placeholder="https://youtube.com/watch?v=..." value={videoUrlInput} onChange={(e) => setVideoUrlInput(e.target.value)} />
                    </div>
                    
                    {imageFiles.length > 0 && (
                        <div className="grid grid-cols-3 gap-2 mt-2">
                            {imageFiles.map((file, i) => (
                                <div key={i} className="relative aspect-square">
                                    <Image src={URL.createObjectURL(file)} alt="preview" fill className="rounded-md object-cover"/>
                                </div>
                            ))}
                        </div>
                    )}
               </div>
              
              <div className="space-y-2">
                <Label htmlFor="purchaseUrl">رابط الشراء من المورد (اختياري)</Label>
                <Input id="purchaseUrl" placeholder="https://supplier.com/product" value={purchaseUrl} onChange={(e) => setPurchaseUrl(e.target.value)} />
              </div>
            </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">إلغاء</Button>
          </DialogClose>
          <Button type="button" onClick={handleSaveProduct}>
            إضافة المنتج للمراجعة
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}