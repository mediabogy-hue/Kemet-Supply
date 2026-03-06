'use client';

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
import type { Product } from "@/lib/types";

interface UpdateStockDialogProps {
    product: Product | null;
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
}

export function UpdateStockDialog({ product, isOpen, onOpenChange }: UpdateStockDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const [quantity, setQuantity] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (product) {
        setQuantity(product.stockQuantity.toString());
    }
  }, [product]);

  const handleUpdate = () => {
    if (!product || !firestore) return;

    const quantityNumber = parseInt(quantity, 10);
    if (isNaN(quantityNumber) || quantityNumber < 0) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "الرجاء إدخال كمية صحيحة.",
      });
      return;
    }

    setIsSubmitting(true);
    const productDocRef = doc(firestore, "products", product.id);
    
    const updatedData = {
      stockQuantity: quantityNumber,
      updatedAt: serverTimestamp(),
      isAvailable: quantityNumber > 0 ? product.isAvailable : false, // Also set to unavailable if stock is 0
    };

    updateDoc(productDocRef, updatedData)
        .then(() => {
            onOpenChange(false);
        })
        .catch(async (error: any) => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: productDocRef.path,
                operation: 'update',
                requestResourceData: updatedData,
            }));
            toast({
                variant: "destructive",
                title: "فشل تحديث المخزون",
                description: "قد لا تملك الصلاحيات الكافية.",
            });
        })
        .finally(() => {
            setIsSubmitting(false);
        });
  };
  
  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if(isSubmitting) return;
        onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>تحديث المخزون</DialogTitle>
          <DialogDescription>
            تحديث كمية المنتج: {product.name}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="quantity">الكمية الجديدة</Label>
            <Input
              id="quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g., 50"
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