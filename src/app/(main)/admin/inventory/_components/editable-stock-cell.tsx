
'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Check, X, Pencil, Minus, Plus } from 'lucide-react';
import { useFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { useSession } from '@/auth/SessionProvider';
import { doc, runTransaction, serverTimestamp, collection } from 'firebase/firestore';
import type { Product } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface EditableStockCellProps {
  product: Product;
}

const MINIMUM_STOCK_LEVEL = 3;

export function EditableStockCell({ product }: EditableStockCellProps) {
  const { firestore, user } = useFirebase();
  const { role } = useSession();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [quantity, setQuantity] = useState(product.stockQuantity.toString());
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Reset local state if product prop changes from outside
    setQuantity(product.stockQuantity.toString());
  }, [product.stockQuantity]);

  const handleSave = async () => {
    if (!firestore || !user || !role) return;

    const newQuantity = parseInt(quantity, 10);
    if (isNaN(newQuantity) || newQuantity < 0) {
      toast({ variant: 'destructive', title: 'خطأ', description: 'الرجاء إدخال كمية صحيحة.' });
      return;
    }
    
    if (newQuantity === product.stockQuantity) {
        setIsEditing(false);
        return;
    }

    setIsSubmitting(true);
    const productRef = doc(firestore, 'products', product.id);

    try {
      await runTransaction(firestore, async (transaction) => {
        const productDoc = await transaction.get(productRef);
        if (!productDoc.exists()) {
          throw "المنتج غير موجود!";
        }
        
        const currentStock = productDoc.data().stockQuantity;
        const changeQty = newQuantity - currentStock;

        transaction.update(productRef, {
          stockQuantity: newQuantity,
          isAvailable: newQuantity > 0,
          updatedAt: serverTimestamp(),
        });

        if (changeQty !== 0) {
            const stockLedgerRef = doc(collection(firestore, "stockLedger"));
            transaction.set(stockLedgerRef, {
                id: stockLedgerRef.id,
                productId: product.id,
                orderId: null,
                changeQty: changeQty,
                type: 'MANUAL_ADJUST',
                reason: 'MANUAL_CORRECTION',
                createdAt: serverTimestamp(),
                actor: { userId: user.uid, role: role },
            });
        }
      });
      toast({ title: 'تم تحديث المخزون بنجاح!' });
      setIsEditing(false);
    } catch (e: any) {
      console.error("Stock update failed: ", e);
      toast({
        variant: 'destructive',
        title: 'فشل تحديث المخزون',
        description: typeof e === 'string' ? e : "قد لا تملك الصلاحيات الكافية.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setQuantity(product.stockQuantity.toString());
    setIsEditing(false);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleStep = (amount: number) => {
      setQuantity(q => {
          const current = parseInt(q, 10) || 0;
          return Math.max(0, current + amount).toString();
      });
  }

  const stockLevel = product.stockQuantity;
  let stockStatus: 'in-stock' | 'low-stock' | 'out-of-stock' = 'in-stock';
  if (stockLevel === 0) {
      stockStatus = 'out-of-stock';
  } else if (stockLevel < MINIMUM_STOCK_LEVEL) {
      stockStatus = 'low-stock';
  }

  const stockColorClass = 
    stockStatus === 'out-of-stock' ? 'text-destructive' :
    stockStatus === 'low-stock' ? 'text-amber-500' :
    'text-foreground';

  if (isEditing) {
    return (
      <div className="flex items-center gap-1 w-44">
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleStep(-1)} disabled={isSubmitting}>
            <Minus className="h-4 w-4" />
        </Button>
        <Input
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-8 text-center px-1"
          autoFocus
          onFocus={(e) => e.target.select()}
          disabled={isSubmitting}
          min="0"
        />
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleStep(1)} disabled={isSubmitting}>
            <Plus className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-green-500" onClick={handleSave} disabled={isSubmitting}>
          <Check className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={handleCancel} disabled={isSubmitting}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-2 cursor-pointer group rounded-md p-1 -m-1"
      onClick={() => setIsEditing(true)}
    >
      <span className={cn("font-semibold", stockColorClass)}>{product.stockQuantity}</span>
      <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}
