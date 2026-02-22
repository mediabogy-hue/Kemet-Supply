
"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useFirestore, errorEmitter, FirestorePermissionError } from "@/firebase";
import { collection, query, where, getDocs, collectionGroup, orderBy, documentId } from "firebase/firestore";
import type { Product, Order } from "@/lib/types";
import { Users, MousePointerClick, ShoppingCart, Package, CornerDownLeft, Percent } from "lucide-react";
import Image from "next/image";

interface ProductAnalyticsDialogProps {
  product: Product | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

interface AnalyticsData {
    clicks: number;
    marketers: number;
    sold: number;
    returned: number;
    conversionRate: number;
}

const StatCard = ({ title, value, icon }: { title: string; value: string | number; icon: React.ReactNode }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
            {icon}
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
        </CardContent>
    </Card>
);

export function ProductAnalyticsDialog({ product, isOpen, onOpenChange }: ProductAnalyticsDialogProps) {
  const firestore = useFirestore();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!product || !firestore || !isOpen) {
        setAnalytics(null); // Reset when dialog is closed or product is null
        return;
    };

    const fetchAnalytics = async () => {
        setIsLoading(true);
        setError(null);
        setAnalytics(null);

        try {
            // 1. Fetch Clicks
            const clicksQuery = query(collection(firestore, `products/${product.id}/clicks`));
            const clicksSnapshot = await getDocs(clicksQuery);
            const clickCount = clicksSnapshot.size;

            // 2. Fetch All Orders and filter client-side
            // This is less efficient but avoids the need for a composite index.
            const allOrdersQuery = query(collectionGroup(firestore, 'orders'), orderBy(documentId()));
            const allOrdersSnapshot = await getDocs(allOrdersQuery);
            const productOrders = allOrdersSnapshot.docs
                .map(doc => doc.data() as Order)
                .filter(order => order.productId === product.id);


            // 3. Calculate Stats
            const soldQuantity = productOrders
                .filter(o => o.status === 'Delivered')
                .reduce((sum, o) => sum + o.quantity, 0);

            const returnedQuantity = productOrders
                .filter(o => o.status === 'Returned' || o.status === 'Canceled')
                .reduce((sum, o) => sum + o.quantity, 0);

            const uniqueMarketers = new Set(productOrders.map(o => o.dropshipperId)).size;
            
            const conversionRate = clickCount > 0 ? (soldQuantity / clickCount) * 100 : 0;
            
            setAnalytics({
                clicks: clickCount,
                marketers: uniqueMarketers,
                sold: soldQuantity,
                returned: returnedQuantity,
                conversionRate: conversionRate
            });

        } catch (e: any) {
            console.error("Failed to fetch product analytics:", e);
             if (e.code === 'permission-denied') {
                errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: `collection group 'orders'`,
                    operation: 'list',
                }));
            }
            setError("فشل تحميل التحليلات. قد تكون هناك مشكلة في الصلاحيات.");
        } finally {
            setIsLoading(false);
        }
    };

    fetchAnalytics();
  }, [product, firestore, isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          {product ? (
            <>
              <DialogTitle>تحليل أداء المنتج</DialogTitle>
              <DialogDescription className="flex items-center gap-4 pt-2">
                 <Image src={product.imageUrls?.[0] || `https://picsum.photos/seed/${product.id}/64/64`} alt={product.name} width={64} height={64} className="rounded-md" />
                 <span className="text-lg font-semibold">{product.name}</span>
              </DialogDescription>
            </>
          ) : (
            <DialogTitle>تحميل التحليلات...</DialogTitle>
          )}
        </DialogHeader>
        <div className="py-4">
            {isLoading && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Skeleton className="h-28" />
                    <Skeleton className="h-28" />
                    <Skeleton className="h-28" />
                    <Skeleton className="h-28" />
                    <Skeleton className="h-28" />
                    <Skeleton className="h-28" />
                </div>
            )}
            {error && <p className="text-destructive text-center">{error}</p>}
            {analytics && product && (
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <StatCard title="النقرات الخارجية" value={analytics.clicks} icon={<MousePointerClick className="h-5 w-5 text-muted-foreground" />} />
                    <StatCard title="عدد المسوقين" value={analytics.marketers} icon={<Users className="h-5 w-5 text-muted-foreground" />} />
                    <StatCard title="الكمية المباعة" value={analytics.sold} icon={<ShoppingCart className="h-5 w-5 text-muted-foreground" />} />
                    <StatCard title="الكمية المتاحة" value={product.stockQuantity} icon={<Package className="h-5 w-5 text-muted-foreground" />} />
                    <StatCard title="الكمية المرتجعة" value={analytics.returned} icon={<CornerDownLeft className="h-5 w-5 text-muted-foreground" />} />
                    <StatCard title="معدل التحويل" value={`${analytics.conversionRate.toFixed(2)}%`} icon={<Percent className="h-5 w-5 text-muted-foreground" />} />
                 </div>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

    