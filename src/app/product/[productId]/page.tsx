
import { getAdminDb } from '@/firebase/server-init';
import { notFound } from 'next/navigation';
import type { Product } from '@/lib/types';
import type { Timestamp } from 'firebase-admin/firestore';
import { ProductView } from './_components/product-view';

// This page will be dynamically rendered for every request.
export const dynamic = 'force-dynamic';

export default async function PublicProductPage({ params, searchParams }: { 
    params: { productId: string };
    searchParams: { [key: string]: string | string[] | undefined };
}) {
    const { productId } = params;
    const refId = typeof searchParams.ref === 'string' ? searchParams.ref : null;

    if (!productId) {
        notFound();
    }

    const db = getAdminDb();
    if (!db) {
        console.error("Firebase Admin DB not configured on server.");
        throw new Error("Server configuration error. Please contact support.");
    }
    
    const productRef = db.collection('products').doc(productId);
    const docSnap = await productRef.get();

    if (!docSnap.exists() || !docSnap.data()?.isAvailable) {
        notFound();
    }
    
    const data = docSnap.data() as any;
    
    // Convert Firestore Timestamps to serializable ISO strings for the client component
    const product: Product = {
      id: docSnap.id,
      ...data,
      createdAt: (data.createdAt as Timestamp)?.toDate().toISOString(),
      updatedAt: (data.updatedAt as Timestamp)?.toDate().toISOString(),
    };
    
    return (
        <div className="container mx-auto p-4 md:p-8 max-w-6xl">
            <ProductView product={product} refId={refId} />
        </div>
    );
}
