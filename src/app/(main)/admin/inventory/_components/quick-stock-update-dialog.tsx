
"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useFirebase, errorEmitter, FirestorePermissionError } from "@/firebase";
import { useSession } from "@/auth/SessionProvider";
import { doc, serverTimestamp, runTransaction, collection, query, orderBy, where, limit, getDocs } from "firebase/firestore";
import type { Product } from "@/lib/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

interface QuickStockUpdateDialogProps {
    triggerButton: React.ReactNode;
}

export function QuickStockUpdateDialog({ triggerButton }: QuickStockUpdateDialogProps) {
  const { firestore, user } = useFirebase();
  const { role } = useSession();
  const { toast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  
  const [searchValue, setSearchValue] = useState("");
  const [searchedProducts, setSearchedProducts] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState("");
  const [operation, setOperation] = useState<"add" | "subtract" | "set">("add");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const fetchProducts = useCallback(async (searchTerm: string) => {
    if (!firestore) return;
    setIsSearching(true);
    try {
        let productsQuery;
        if (searchTerm.trim() === "") {
            productsQuery = query(
                collection(firestore, "products"),
                orderBy("name", "asc"),
                limit(20)
            );
        } else {
            productsQuery = query(
                collection(firestore, "products"),
                where("name", ">=", searchTerm),
                where("name", "<=", searchTerm + "\uf8ff"),
                orderBy("name", "asc"),
                limit(20)
            );
        }
        const querySnapshot = await getDocs(productsQuery);
        const prods = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        setSearchedProducts(prods);
    } catch (error) {
        console.error("Failed to search products:", error);
        toast({ variant: "destructive", title: "خطأ", description: "فشل البحث عن المنتجات." });
    } finally {
        setIsSearching(false);
    }
  }, [firestore, toast]);

  useEffect(() => {
    if (popoverOpen) {
      const handler = setTimeout(() => {
        fetchProducts(searchValue);
      }, 300); // Debounce search

      return () => {
        clearTimeout(handler);
      };
    }
  }, [searchValue, popoverOpen, fetchProducts]);

  const resetForm = () => {
    setSelectedProduct(null);
    setQuantity("");
    setOperation("add");
    setIsSubmitting(false);
    setSearchValue("");
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setPopoverOpen(false);
  };

  const handleUpdate = async () => {
    if (!firestore || !user || !role || !selectedProduct) {
      toast({ variant: "destructive", title: "خطأ", description: "الرجاء اختيار منتج والتأكد من تسجيل الدخول." });
      return;
    }

    const quantityValue = parseInt(quantity, 10);
    if (isNaN(quantityValue) || quantityValue < 0) {
      toast({ variant: "destructive", title: "خطأ", description: "الرجاء إدخال كمية صحيحة موجبة." });
      return;
    }
    
    setIsSubmitting(true);
    const productRef = doc(firestore, "products", selectedProduct.id);

    try {
        await runTransaction(firestore, async (transaction) => {
            const productDoc = await transaction.get(productRef);
            if (!productDoc.exists()) {
                throw "المنتج غير موجود!";
            }

            const currentStock = productDoc.data().stockQuantity;
            let newStock = 0;

            if (operation === "add") {
                newStock = currentStock + quantityValue;
            } else if (operation === "subtract") {
                newStock = currentStock - quantityValue;
            } else { // set
                newStock = quantityValue;
            }

            if (newStock < 0) {
                newStock = 0;
                toast({ variant: "destructive", title: "تنبيه", description: "لا يمكن أن تكون الكمية أقل من صفر. تم تعيينها إلى صفر."});
            }
            
            const changeQty = newStock - currentStock;

            transaction.update(productRef, {
                stockQuantity: newStock,
                updatedAt: serverTimestamp(),
                isAvailable: newStock > 0,
            });

            if (changeQty !== 0) {
              const stockLedgerRef = doc(collection(firestore, "stockLedger"));
              transaction.set(stockLedgerRef, {
                  id: stockLedgerRef.id,
                  productId: selectedProduct.id,
                  orderId: null,
                  changeQty: changeQty,
                  type: 'MANUAL_ADJUST',
                  reason: 'MANUAL_CORRECTION',
                  createdAt: serverTimestamp(),
                  actor: { userId: user.uid, role: role },
              });
            }
        });
        
        toast({ title: "تم تحديث المخزون بنجاح!" });
        setIsOpen(false);

    } catch (e: any) {
        console.error("Stock update failed: ", e);
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: productRef.path,
            operation: 'update',
            requestResourceData: { operation, quantityValue },
        }));
        toast({
            variant: "destructive",
            title: "فشل تحديث المخزون",
            description: typeof e === 'string' ? e : "قد لا تملك الصلاحيات الكافية.",
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
            resetForm();
        }
    }}>
      <DialogTrigger asChild>
        {triggerButton}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>تحديث سريع للمخزون</DialogTitle>
          <DialogDescription>
            اختر منتجًا وقم بتحديث كمية المخزون الخاصة به.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>المنتج</Label>
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={popoverOpen}
                  className="w-full justify-between"
                  disabled={isSubmitting}
                >
                  {selectedProduct
                    ? selectedProduct.name
                    : "اختر منتجًا..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput 
                    placeholder="ابحث بالاسم أو SKU..."
                    value={searchValue}
                    onValueChange={setSearchValue}
                  />
                  <CommandList>
                    {isSearching && (
                      <div className="p-4 text-center text-sm text-muted-foreground flex items-center justify-center">
                        <Loader2 className="me-2 h-4 w-4 animate-spin" />
                        جاري البحث...
                      </div>
                    )}
                    {!isSearching && searchedProducts.length === 0 && <CommandEmpty>لم يتم العثور على منتجات.</CommandEmpty>}
                    <CommandGroup>
                      {!isSearching && searchedProducts.map((p) => (
                        <CommandItem
                          key={p.id}
                          value={p.name}
                          onSelect={() => handleSelectProduct(p)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedProduct?.id === p.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col">
                            <span>{p.name}</span>
                            <span className="text-xs text-muted-foreground">الكمية: {p.stockQuantity}</span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
             {selectedProduct && <p className="text-xs text-muted-foreground">الكمية الحالية: {selectedProduct.stockQuantity}</p>}
          </div>

          <div className="space-y-2">
            <Label>الإجراء</Label>
             <RadioGroup defaultValue="add" value={operation} onValueChange={(v) => setOperation(v as any)} className="grid grid-cols-3 gap-2">
                <div><RadioGroupItem value="add" id="op-add" className="peer sr-only" /><Label htmlFor="op-add" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">إضافة</Label></div>
                <div><RadioGroupItem value="subtract" id="op-subtract" className="peer sr-only" /><Label htmlFor="op-subtract" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">خفض</Label></div>
                <div><RadioGroupItem value="set" id="op-set" className="peer sr-only" /><Label htmlFor="op-set" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">تحديد</Label></div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">الكمية</Label>
            <Input id="quantity" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} min="0" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>إلغاء</Button>
          <Button onClick={handleUpdate} disabled={isSubmitting || !selectedProduct}>
            {isSubmitting ? "جاري التحديث..." : "تحديث المخزون"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
