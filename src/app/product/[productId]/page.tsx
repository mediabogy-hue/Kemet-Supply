import { notFound } from 'next/navigation';
import type { Product } from '@/lib/types';
import Image from 'next/image';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { ProductOrderForm } from './_components/product-order-form';
import { Separator } from '@/components/ui/separator';

// NEW: Direct imports for a more stable server-side fetch
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient'; // Using the client SDK instance directly

type ProductPageProps = {
    params: { productId: string };
    searchParams: { [key: string]: string | string[] | undefined };
};

// This function now uses the client SDK on the server, which is allowed by the security rules.
// This removes the dependency on the Admin SDK and the problematic environment variable for this public page.
async function getProduct(productId: string): Promise<Product | null> {
    try {
        const productRef = doc(db, 'products', productId);
        const docSnap = await getDoc(productRef);

        if (!docSnap.exists()) {
            return null;
        }

        // Convert Firestore Timestamp to a serializable format for the client component
        const data = docSnap.data();
        const productData: Product = {
            id: docSnap.id,
            ...data,
            // Ensure Timestamps are converted to strings if they exist
            createdAt: (data.createdAt as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
            updatedAt: (data.updatedAt as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
        } as Product;
        
        return productData;

    } catch (error) {
        console.error("Error fetching product directly on server:", error);
        // Return null on any error to trigger a 'not found' page, which is safer for the user.
        return null;
    }
}


export default async function PublicProductPage({ params, searchParams }: ProductPageProps) {
    const { productId } = params;
    const refId = typeof searchParams.ref === 'string' ? searchParams.ref : null;

    const product = await getProduct(productId);

    if (!product || !product.isAvailable) {
        notFound();
    }
    
    return (
        <div className="container mx-auto p-4 md:p-8 max-w-6xl">
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
        </div>
    );
}
