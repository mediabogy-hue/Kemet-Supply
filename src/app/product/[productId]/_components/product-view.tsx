
'use client';

import type { Product } from '@/lib/types';
import Image from 'next/image';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { ProductOrderForm } from './product-order-form';
import { Separator } from '@/components/ui/separator';

export function ProductView({ product, refId }: { product: Product, refId: string | null }) {
    
    return (
        <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-start">
            {/* Image Gallery */}
            <div className="space-y-4 sticky top-4">
                 <Carousel className="w-full">
                    <CarouselContent>
                        {(product.imageUrls && product.imageUrls.length > 0) ? (
                            product.imageUrls.map((url, index) => (
                                <CarouselItem key={index}>
                                    <div className="aspect-square w-full bg-muted rounded-lg flex items-center justify-center overflow-hidden border">
                                        <Image
                                            src={url}
                                            alt={`${product.name} - image ${index + 1}`}
                                            width={800}
                                            height={800}
                                            className="w-full h-full object-contain"
                                            priority={index === 0}
                                        />
                                    </div>
                                </CarouselItem>
                            ))
                        ) : (
                            <CarouselItem>
                                <div className="aspect-square w-full bg-muted rounded-lg flex items-center justify-center overflow-hidden border">
                                     <Image
                                        src={`https://picsum.photos/seed/${product.id}/800`}
                                        alt={product.name}
                                        width={800}
                                        height={800}
                                        className="w-full h-full object-contain"
                                        priority
                                    />
                                </div>
                            </CarouselItem>
                        )}
                    </CarouselContent>
                    <CarouselPrevious className="hidden sm:flex" />
                    <CarouselNext className="hidden sm:flex" />
                </Carousel>
            </div>

            {/* Product Info & Order Form */}
            <div className="space-y-6">
                <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">{product.category}</p>
                    <h1 className="text-3xl lg:text-4xl font-bold">{product.name}</h1>
                </div>
                <p className="text-2xl font-bold text-primary mt-2">{product.price.toFixed(2)} ج.م</p>
                
                <Separator />
                
                <div className="prose prose-invert max-w-none text-muted-foreground">
                   <p className="whitespace-pre-wrap">{product.description}</p>
                </div>

                <ProductOrderForm product={product} refId={refId} />
            </div>
        </div>
    );
}
