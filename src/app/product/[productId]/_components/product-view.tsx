'use client';

import type { Product } from '@/lib/types';
import Image from 'next/image';
import { ProductOrderForm } from './product-order-form';
import { Separator } from '@/components/ui/separator';
import { useFirestore } from '@/firebase';
import { useEffect, useState } from 'react';
import { doc, setDoc, collection, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { downloadAsset } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Copy, Download as DownloadIcon, Video } from 'lucide-react';
import { useSession } from '@/auth/SessionProvider';

// New Gallery Component
function ImageGallery({ images, productName }: { images: string[], productName: string }) {
    const [mainImage, setMainImage] = useState(images?.[0]);

    useEffect(() => {
        setMainImage(images?.[0]);
    }, [images]);

    if (!images || images.length === 0) {
        return (
             <div className="aspect-square w-full bg-muted rounded-lg flex items-center justify-center overflow-hidden border">
                <Image
                    src={`https://picsum.photos/seed/${productName}/800`}
                    alt={productName}
                    width={800}
                    height={800}
                    className="w-full h-full object-contain"
                    priority
                />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="aspect-square w-full bg-muted rounded-lg flex items-center justify-center overflow-hidden border">
                <Image
                    key={mainImage} // Add key to force re-render on image change
                    src={mainImage}
                    alt={productName}
                    width={800}
                    height={800}
                    className="w-full h-full object-contain"
                    priority
                />
            </div>
            {images.length > 1 && (
                <div className="grid grid-cols-5 gap-2">
                    {images.map((url, index) => (
                        <button
                            key={index}
                            onClick={() => setMainImage(url)}
                            className={cn(
                                "aspect-square rounded-md overflow-hidden border-2 transition-all",
                                mainImage === url ? "border-primary ring-2 ring-primary/50" : "border-transparent hover:border-primary/50"
                            )}
                        >
                            <Image
                                src={url}
                                alt={`${productName} thumbnail ${index + 1}`}
                                width={100}
                                height={100}
                                className="w-full h-full object-cover"
                            />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export function ProductView({ product, refId, dropshipperName }: { product: Product, refId: string | null, dropshipperName: string | null }) {
    const { user, isLoading: isSessionLoading } = useSession();
    const firestore = useFirestore();
    const { toast } = useToast();

    useEffect(() => {
        if (firestore && refId && product.id) {
            // Track the affiliate link click non-blockingly
            const clickRef = doc(collection(firestore, `products/${product.id}/clicks`));
            setDoc(clickRef, {
                ref: refId,
                timestamp: serverTimestamp(),
                userAgent: navigator.userAgent,
            }).catch(err => console.error("Failed to track click:", err));
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [firestore, refId, product.id]);

    const handleCopy = (text: string, subject: string) => {
        navigator.clipboard.writeText(text).then(() => {
            toast({ title: `تم نسخ ${subject} بنجاح!` });
        });
    };
    
    const handleDownloadImages = () => {
        if (!product.imageUrls || product.imageUrls.length === 0) {
            toast({ variant: 'destructive', title: 'لا توجد صور لتحميلها' });
            return;
        }
        toast({ title: 'بدء تحميل الصور...', description: `سيتم تحميل ${product.imageUrls.length} صور.`});
        product.imageUrls.forEach((url, index) => {
            setTimeout(() => {
                 downloadAsset(url, `${product.name.replace(/[\s/]/g, '_')}_${index + 1}.jpg`)
                    .catch(() => toast({ variant: 'destructive', title: `فشل تحميل الصورة رقم ${index + 1}` }));
            }, index * 300); // 300ms delay between downloads
        });
    };
    
    return (
        <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-start">
            {/* Image Gallery */}
            <div className="space-y-4 sticky top-4">
                 <ImageGallery images={product.imageUrls} productName={product.name} />
            </div>

            {/* Product Info & Order Form */}
            <div className="space-y-6">
                <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">{product.category}</p>
                    <h1 className="text-3xl lg:text-4xl font-bold">{product.name}</h1>
                </div>
                <p className="text-2xl font-bold text-primary mt-2">{product.price.toFixed(2)} ج.م</p>
                
                <Separator />

                <ProductOrderForm product={product} refId={refId} dropshipperName={dropshipperName} />

                {!isSessionLoading && user && (
                    <Card>
                        <CardHeader>
                            <CardTitle>المحتوى التسويقي</CardTitle>
                            <CardDescription>استخدم هذه المواد في حملاتك التسويقية.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <Label htmlFor="marketing-desc">الوصف التسويقي</Label>
                                    <Button variant="ghost" size="sm" onClick={() => handleCopy(product.description, 'الوصف')}>
                                        <Copy className="me-2 h-3.5 w-3.5" />
                                        نسخ
                                    </Button>
                                </div>
                                <Textarea id="marketing-desc" value={product.description} readOnly rows={5} className="bg-muted/50" />
                            </div>
                        </CardContent>
                        <CardFooter className="flex-col items-stretch gap-2">
                            <Button onClick={handleDownloadImages} disabled={!product.imageUrls || product.imageUrls.length === 0}>
                                <DownloadIcon className="me-2"/>
                                تحميل جميع الصور ({product.imageUrls?.length || 0})
                            </Button>
                            {product.videoUrl && (
                                 <Button variant="secondary" asChild>
                                    <a href={product.videoUrl} target="_blank" rel="noopener noreferrer">
                                        <Video className="me-2" />
                                        مشاهدة/تحميل الفيديو
                                    </a>
                                </Button>
                            )}
                        </CardFooter>
                    </Card>
                )}
            </div>
        </div>
    );
}
