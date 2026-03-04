import { getAdminDb } from '@/firebase/server-init';
import type { Product, UserProfile } from '@/lib/types';
import { ProductView } from './_components/product-view';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

async function getProductData(productId: string): Promise<Product | null> {
    const db = getAdminDb();
    if (!db) {
        console.error("Admin DB not available on server.");
        return null;
    }
    try {
        const productRef = db.collection('products').doc(productId);
        const docSnap = await productRef.get();
        if (docSnap.exists) {
            const data = docSnap.data() as any;
            const product: Product = {
                id: docSnap.id,
                ...data,
                createdAt: data.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
                updatedAt: data.updatedAt?.toDate?.().toISOString() || new Date().toISOString(),
            };
            return product;
        }
        return null;
    } catch (error) {
        console.error("Error fetching product data on server:", error);
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
    const { productId } = params;
    const refId = typeof searchParams.ref === 'string' ? searchParams.ref : null;
    
    const [product, dropshipperName] = await Promise.all([
        getProductData(productId),
        getDropshipperName(refId),
    ]);
    
    if (!product || product.approvalStatus !== 'Approved' || !product.isAvailable) {
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
            <ProductView 
                product={product}
                refId={refId}
                dropshipperName={dropshipperName}
            />
        </div>
    );
}
