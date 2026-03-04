import { getAdminDb } from '@/firebase/server-init';
import type { UserProfile } from '@/lib/types';
import { ProductPageClient } from './_components/product-page-client';

async function getDropshipperName(refId: string | null): Promise<string | null> {
    if (!refId) return null;
    const db = getAdminDb();
    if (!db) return null;
    try {
        const userRef = db.collection('users').doc(refId);
        const docSnap = await userRef.get();
        if (docSnap.exists) {
            const profile = docSnap.data() as UserProfile;
            return `${profile.firstName} ${profile.lastName}`.trim();
        }
        return null;
    } catch (error) {
        console.error("Error fetching dropshipper name on server:", error);
        return null;
    }
}


export default async function PublicProductPage({ 
    params,
    searchParams 
}: { 
    params: { productId: string };
    searchParams: { [key: string]: string | string[] | undefined };
}) {
    const refId = typeof searchParams.ref === 'string' ? searchParams.ref : null;
    const dropshipperName = await getDropshipperName(refId);
    
    return (
        <div className="container mx-auto p-4 md:p-8 max-w-6xl">
            <ProductPageClient 
                productId={params.productId}
                refId={refId}
                dropshipperName={dropshipperName}
            />
        </div>
    );
}
