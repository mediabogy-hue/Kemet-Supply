

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
import { useToast } from "@/hooks/use-toast";
import { useFirestore, errorEmitter, FirestorePermissionError } from "@/firebase";
import { collection, doc, setDoc, serverTimestamp } from "firebase/firestore";
import type { ProductCategory } from "@/lib/types";
import { PlusCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";

export function AddCategoryDialog() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [dataAiHint, setDataAiHint] = useState("");
  const [isAvailable, setIsAvailable] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const resetForm = () => {
      setName("");
      setImageUrl("");
      setDataAiHint("");
      setIsAvailable(true);
  };

  const handleSave = () => {
    if (!name || !imageUrl) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "الرجاء ملء اسم الفئة ورابط الصورة.",
      });
      return;
    }
    
    if (!firestore) {
        toast({ variant: "destructive", title: "خطأ", description: "خدمات Firebase غير متاحة." });
        return;
    }

    setIsSubmitting(true);
    
    const categoryId = doc(collection(firestore, "id_generator")).id;
    const categoryDocRef = doc(firestore, "productCategories", categoryId);

    const newCategoryData: Omit<ProductCategory, 'createdAt' | 'updatedAt'> & { createdAt: any, updatedAt: any } = {
      id: categoryId,
      name,
      imageUrl,
      dataAiHint: dataAiHint || name.split(" ").slice(0, 2).join(" "),
      isAvailable,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    setDoc(categoryDocRef, newCategoryData)
      .then(() => {
        toast({ title: "تم إضافة الفئة بنجاح!" });
      })
      .catch(async (error: any) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: categoryDocRef.path,
          operation: 'create',
          requestResourceData: newCategoryData
        }));
        toast({
          variant: "destructive",
          title: "فشل إضافة الفئة",
          description: "قد لا تملك الصلاحيات الكافية.",
        });
      })
      .finally(() => {
          setIsSubmitting(false);
      });
    
    setIsOpen(false);
    resetForm();
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
          إضافة فئة جديدة
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>إضافة فئة جديدة</DialogTitle>
          <DialogDescription>
            أدخل تفاصيل الفئة الجديدة.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">اسم الفئة</Label>
            <Input
              id="name"
              placeholder="مثال: أدوات كهربائية"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="imageUrl">رابط الصورة</Label>
            <Input
              id="imageUrl"
              placeholder="https://picsum.photos/seed/cat/200"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dataAiHint">تلميح للذكاء الاصطناعي (اختياري)</Label>
            <Input
              id="dataAiHint"
              placeholder="مثال: power tools"
              value={dataAiHint}
              onChange={(e) => setDataAiHint(e.target.value)}
            />
             <p className="text-xs text-muted-foreground">
                كلمة أو كلمتين بالإنجليزية لوصف الصورة (تستخدم للبحث عن صور بديلة).
            </p>
          </div>
           <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5">
                  <Label htmlFor="isAvailable" className="font-medium">الحالة (مرئي للمسوقين)</Label>
                  <p className="text-xs text-muted-foreground">
                      إلغاء التفعيل سيخفي الفئة من المتجر.
                  </p>
              </div>
              <Switch
                  id="isAvailable"
                  checked={isAvailable}
                  onCheckedChange={setIsAvailable}
              />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isSubmitting}>إلغاء</Button>
          </DialogClose>
          <Button type="button" onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? 'جاري الحفظ...' : 'حفظ الفئة'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
