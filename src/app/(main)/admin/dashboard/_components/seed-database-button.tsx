
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase';
import { writeBatch, doc, collection, serverTimestamp } from 'firebase/firestore';
import { Loader2, DatabaseZap } from 'lucide-react';
import type { ProductCategory, Product, Order } from '@/lib/types';
import { ar } from 'date-fns/locale';

const dropshippers = [
    { id: 'dropshipper-ahmad-ali', firstName: 'أحمد', lastName: 'علي', email: 'ahmad.ali@example.com' },
    { id: 'dropshipper-fatima-mohamed', firstName: 'فاطمة', lastName: 'محمد', email: 'fatima.mohamed@example.com' },
    { id: 'dropshipper-youssef-hassan', firstName: 'يوسف', lastName: 'حسن', email: 'youssef.hassan@example.com' },
];

const categories = [
    { id: 'electronics-cat', name: 'إلكترونيات', imageUrl: 'https://picsum.photos/seed/electronics/200', dataAiHint: 'electronics' },
    { id: 'clothing-cat', name: 'ملابس', imageUrl: 'https://picsum.photos/seed/clothing/200', dataAiHint: 'clothing' },
    { id: 'kitchen-cat', name: 'أدوات منزلية', imageUrl: 'https://picsum.photos/seed/kitchen/200', dataAiHint: 'kitchenware' },
];

const products = [
    { id: 'product-headphones', name: 'سماعة رأس لاسلكية', description: 'صوت نقي وبطارية تدوم طويلاً', category: 'إلكترونيات', price: 750, commission: 80, stockQuantity: 50, isAvailable: true, imageUrls: ['https://picsum.photos/seed/headphones/600'] },
    { id: 'product-tshirt', name: 'تيشيرت قطني أسود', description: 'تيشيرت مريح وعالي الجودة', category: 'ملابس', price: 300, commission: 40, stockQuantity: 120, isAvailable: true, imageUrls: ['https://picsum.photos/seed/tshirt/600'] },
    { id: 'product-blender', name: 'خلاط كهربائي قوي', description: 'للعصائر والمشروبات الباردة', category: 'أدوات منزلية', price: 1200, commission: 150, stockQuantity: 30, isAvailable: true, imageUrls: ['https://picsum.photos/seed/blender/600'] },
    { id: 'product-smartwatch', name: 'ساعة ذكية رياضية', description: 'تتبع نشاطك اليومي ونبضات القلب', category: 'إلكترونيات', price: 1500, commission: 200, stockQuantity: 40, isAvailable: true, imageUrls: ['https://picsum.photos/seed/smartwatch/600'] },
    { id: 'product-jeans', name: 'بنطلون جينز أزرق', description: 'تصميم عصري ومناسب لجميع الأوقات', category: 'ملابس', price: 550, commission: 60, stockQuantity: 80, isAvailable: true, imageUrls: ['https://picsum.photos/seed/jeans/600'] },
];

export function SeedDatabaseButton() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const handleSeed = async () => {
        if (!firestore) {
            toast({ variant: 'destructive', title: 'Firestore is not available.' });
            return;
        }

        setIsLoading(true);
        toast({ title: 'بدء عملية ملء البيانات...', description: 'قد يستغرق هذا بضع ثوانٍ.' });

        try {
            const batch = writeBatch(firestore);

            // 1. Seed Users
            dropshippers.forEach(user => {
                const userRef = doc(firestore, 'users', user.id);
                batch.set(userRef, {
                    ...user,
                    id: user.id,
                    role: 'Dropshipper',
                    isActive: true,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                });
            });
            
            // 2. Seed Categories
            categories.forEach(category => {
                const categoryRef = doc(firestore, 'productCategories', category.id);
                batch.set(categoryRef, { ...category, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
            });

            // 3. Seed Products
            products.forEach(product => {
                const productRef = doc(firestore, 'products', product.id);
                batch.set(productRef, { ...product, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
            });

            // 4. Seed Orders
            const customerNames = ['خالد إبراهيم', 'نورة عبدالله', 'سالم القحطاني', 'مريم الغامدي', 'عمر الزهراني'];
            const cities = ['القاهرة', 'الجيزة', 'الإسكندرية'];
            const statuses = ['Delivered', 'Shipped', 'Pending', 'Confirmed', 'Returned', 'Canceled'];
            for (let i = 0; i < 25; i++) {
                const orderId = doc(collection(firestore, 'id_generator')).id;
                const orderRef = doc(firestore, 'orders', orderId);
                const randomProduct = products[i % products.length];
                const randomDropshipper = dropshippers[i % dropshippers.length];
                const quantity = Math.floor(Math.random() * 3) + 1;
                const orderDate = new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000);

                batch.set(orderRef, {
                    id: orderId,
                    dropshipperId: randomDropshipper.id,
                    dropshipperName: `${randomDropshipper.firstName} ${randomDropshipper.lastName}`,
                    customerName: customerNames[i % customerNames.length],
                    customerPhone: `010${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
                    customerAddress: `123 شارع المثال، حي الأمل`,
                    customerCity: cities[i % cities.length],
                    customerPaymentMethod: 'Cash on Delivery',
                    productId: randomProduct.id,
                    productName: randomProduct.name,
                    quantity: quantity,
                    unitPrice: randomProduct.price,
                    totalAmount: randomProduct.price * quantity,
                    unitCommission: randomProduct.commission,
                    totalCommission: randomProduct.commission * quantity,
                    status: statuses[i % statuses.length],
                    createdAt: orderDate,
                    updatedAt: orderDate,
                    platformFee: 0,
                });
            }
            
            await batch.commit();

            toast({ title: '🎉 تم ملء قاعدة البيانات بنجاح!', description: 'سيتم تحديث الصفحة تلقائياً لعرض البيانات.' });
            
            // Reload the page to reflect the new data
            setTimeout(() => window.location.reload(), 2000);

        } catch (error: any) {
            console.error("Database seeding failed:", error);
            toast({ variant: 'destructive', title: 'فشل ملء البيانات', description: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Button onClick={handleSeed} disabled={isLoading} size="lg">
            {isLoading ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <DatabaseZap className="me-2" />}
            {isLoading ? 'جاري ملء البيانات...' : 'ملء قاعدة البيانات ببيانات تجريبية'}
        </Button>
    );
}
