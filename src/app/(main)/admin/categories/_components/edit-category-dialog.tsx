

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
import { useToast } from "@/hooks/use-toast";
import { useFirestore, errorEmitter, FirestorePermissionError } from "@/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import type { ProductCategory } from "@/lib/types";
import { Switch } from "@/components/ui/switch";

interface EditCategoryDialogProps {
    category: ProductCategory | null;
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
}

export function EditCategoryDialog({ category, isOpen, onOpenChange }: EditCategoryDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [dataAiHint, setDataAiHint] = useState("");
  const [isAvailable, setIsAvailable] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (category) {
        setName(category.name || "");
        setImageUrl(category.imageUrl || "");
        setDataAiHint(category.dataAiHint || "");
        setIsAvailable(category.isAvailable ?? true);
    }
  }, [category]);

  const handleUpdate = () => {
    if (!category || !firestore) return;

    if (!name || !imageUrl) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "الرجاء ملء اسم الفئة ورابط الصورة.",
      });
      return;
    }

    setIsSubmitting(true);
    const categoryDocRef = doc(firestore, "productCategories", category.id);
    
    const updatedData: Partial<ProductCategory> & { updatedAt: any } = {
      name,
      imageUrl,
      dataAiHint: dataAiHint || name.split(" ").slice(0, 2).join(" "),
      isAvailable,
      updatedAt: serverTimestamp(),
    };

    updateDoc(categoryDocRef, updatedData)
        .then(() => {
            toast({ title: "تم تحديث الفئة بنجاح!" });
        })
        .catch(async (error: any) => {
            toast({
                variant: "destructive",
                title: "فشل تحديث الفئة",
                description: "قد لا تملك الصلاحيات الكافية.",
            });
        })
        .finally(() => {
            setIsSubmitting(false);
        });

    onOpenChange(false);
  };
  
  if (!category) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if(isSubmitting) return;
        onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>تعديل الفئة</DialogTitle>
          <DialogDescription>
            تحديث تفاصيل الفئة.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">اسم الفئة</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-imageUrl">رابط الصورة</Label>
            <Input
              id="edit-imageUrl"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
          </div>
           <div className="space-y-2">
            <Label htmlFor="edit-dataAiHint">تلميح للذكاء الاصطناعي (اختياري)</Label>
            <Input
              id="edit-dataAiHint"
              placeholder="مثال: power tools"
              value={dataAiHint}
              onChange={(e) => setDataAiHint(e.target.value)}
            />
             <p className="text-xs text-muted-foreground">
                كلمة أو كلمتين بالإنجليزية لوصف الصورة.
            </p>
          </div>
           <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5">
                  <Label htmlFor="edit-isAvailable" className="font-medium">الحالة (مرئي للمسوقين)</Label>
                  <p className="text-xs text-muted-foreground">
                      إلغاء التفعيل سيخفي الفئة من المتجر.
                  </p>
              </div>
              <Switch
                  id="edit-isAvailable"
                  checked={isAvailable}
                  onCheckedChange={setIsAvailable}
              />
          </div>
        </div>
        <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>إلغاء</Button>
          <Button type="button" onClick={handleUpdate} disabled={isSubmitting}>
            {isSubmitting ? 'جاري الحفظ...' : 'حفظ التغييرات'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
