
import { getAdminDb } from '@/firebase/server-init';
import type { Product, UserProfile } from '@/lib/types';
import { ProductView } from './_components/product-view';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

async function getProduct(productId: string): Promise<Product | null> {
    const db = getAdminDb();
    if (!db) {
        console.error("Admin DB not available for product page rendering.");
        return null;
    }
    try {
        const productRef = db.collection('products').doc(productId);
        const docSnap = await productRef.get();

        if (!docSnap.exists) {
            return null;
        }
        
        const data = docSnap.data();

        // With admin SDK, we bypass security rules. So we must manually enforce public-facing business logic.
        if (data?.isAvailable !== true || data?.approvalStatus !== 'Approved') {
            return null;
        }
        
        const productData = { id: docSnap.id, ...data } as Product;
        
        // Serialize any potential Timestamp objects to be safe when passing to client components.
        if (productData.createdAt && typeof (productData.createdAt as any).toDate === 'function') {
            productData.createdAt = (productData.createdAt as any).toDate().toISOString();
        }
        if (productData.updatedAt && typeof (productData.updatedAt as any).toDate === 'function') {
            productData.updatedAt = (productData.updatedAt as any).toDate().toISOString();
        }

        return productData;
    } catch (error) {
        console.error("Error fetching product on server:", error);
        return null;
    }
}

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
    const product = await getProduct(params.productId);
    const refId = typeof searchParams.ref === 'string' ? searchParams.ref : null;
    const dropshipperName = await getDropshipperName(refId);

    if (!product) {
         return (
            <div className="container mx-auto p-4 md:p-8 max-w-6xl">
                <Card className="bg-destructive/10 border-destructive/30">
                    <CardHeader>
                        <CardTitle className="text-destructive">عفواً، المنتج غير متوفر</CardTitle>
                        <CardDescription className="text-destructive/80">
                           قد يكون الرابط الذي تتبعه غير صحيح أو أن المنتج لم يعد متاحاً للعرض.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }
    
    return (
        <div className="container mx-auto p-4 md:p-8 max-w-6xl">
            <ProductView product={product} refId={refId} dropshipperName={dropshipperName} />
        </div>
    );
}
