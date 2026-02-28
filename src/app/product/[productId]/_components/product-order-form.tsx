'use client';
import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore } from '@/firebase';
import { doc, setDoc, collection, serverTimestamp, getDoc } from 'firebase/firestore';
import type { Product, UserProfile } from '@/lib/types';
import { governorates } from '@/lib/governorates';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, PartyPopper } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const orderSchema = z.object({
    customerName: z.string().min(3, "الرجاء إدخال اسم ثلاثي على الأقل"),
    customerPhone: z.string().regex(/^01[0-2,5]\d{8}$/, "الرجاء إدخال رقم هاتف مصري صحيح"),
    customerAddress: z.string().min(10, "الرجاء إدخال عنوان مفصل"),
    customerCity: z.string().min(1, "الرجاء اختيار المحافظة"),
    quantity: z.number().min(1).max(10),
});

type OrderFormData = z.infer<typeof orderSchema>;

interface ProductOrderFormProps {
    product: Product;
    refId: string | null;
}

export function ProductOrderForm({ product, refId }: ProductOrderFormProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSuccess, setIsSuccess] = useState(false);

    const { register, handleSubmit, control, watch, formState: { errors, isSubmitting } } = useForm<OrderFormData>({
        resolver: zodResolver(orderSchema),
        defaultValues: { quantity: 1 },
    });

    const quantity = watch('quantity');
    const totalAmount = product.price * quantity;

    const onSubmit = async (data: OrderFormData) => {
        if (!firestore) {
            toast({ variant: "destructive", title: "خطأ", description: "خدمة قاعدة البيانات غير متاحة." });
            return;
        }

        if (!refId) {
            toast({ variant: "destructive", title: "خطأ", description: "رابط التسويق غير صالح." });
            return;
        }

        if (product.stockQuantity < data.quantity) {
             toast({ variant: "destructive", title: "نفدت الكمية", description: "الكمية المطلوبة غير متوفرة حاليًا." });
            return;
        }

        try {
            // Fetch dropshipper details
            const dropshipperRef = doc(firestore, 'users', refId);
            const dropshipperSnap = await getDoc(dropshipperRef);
            if (!dropshipperSnap.exists()) {
                throw new Error("المسوق غير موجود.");
            }
            const dropshipper = dropshipperSnap.data() as UserProfile;
            const dropshipperName = `${dropshipper.firstName} ${dropshipper.lastName}`.trim();

            const orderId = doc(collection(firestore, 'id_generator')).id;
            const orderRef = doc(firestore, 'orders', orderId);

            const orderData = {
                id: orderId,
                dropshipperId: refId,
                dropshipperName,
                customerName: data.customerName,
                customerPhone: data.customerPhone,
                customerAddress: data.customerAddress,
                customerCity: data.customerCity,
                customerPaymentMethod: 'Cash on Delivery',
                productId: product.id,
                productName: product.name,
                productImageUrl: product.imageUrls?.[0] || null,
                quantity: data.quantity,
                unitPrice: product.price,
                totalAmount: totalAmount,
                unitCommission: product.commission,
                totalCommission: product.commission * data.quantity,
                status: 'Pending',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                merchantId: product.merchantId || null,
                merchantName: product.merchantName || null,
            };

            await setDoc(orderRef, orderData);
            setIsSuccess(true);
            
        } catch (error: any) {
            console.error("Order submission error:", error);
            toast({ variant: "destructive", title: "فشل إرسال الطلب", description: error.message || "حدث خطأ غير متوقع. الرجاء المحاولة مرة أخرى." });
        }
    };
    
    if (isSuccess) {
        return (
             <Card className="bg-green-500/10 border-green-500/30 text-center">
                <CardContent className="p-8">
                    <PartyPopper className="h-16 w-16 mx-auto text-green-500 mb-4" />
                    <h3 className="text-2xl font-bold text-green-400">تم استلام طلبك بنجاح!</h3>
                    <p className="text-green-300/80 mt-2">
                        سيقوم أحد ممثلينا بالتواصل معك قريبًا لتأكيد الطلب. شكرًا لثقتك بنا.
                    </p>
                </CardContent>
            </Card>
        )
    }

    if (!refId) {
        return (
            <Card className="bg-destructive/10 border-destructive/30">
                <CardHeader>
                    <CardTitle className="text-destructive">رابط تسويق غير صالح</CardTitle>
                    <CardDescription className="text-destructive/80">
                        لا يمكنك إتمام الطلب لأن رابط المنتج الذي تستخدمه غير مكتمل أو غير صحيح. يرجى التواصل مع الشخص الذي أرسل لك الرابط للحصول على رابط صحيح.
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }
     if (product.stockQuantity < 1) {
        return (
            <Card className="bg-yellow-500/10 border-yellow-500/30">
                <CardHeader>
                    <CardTitle className="text-yellow-400">نفدت الكمية</CardTitle>
                    <CardDescription className="text-yellow-400/80">
                        عذرًا، هذا المنتج غير متوفر حاليًا. يرجى التحقق مرة أخرى قريبًا.
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>اطلب الآن</CardTitle>
                <CardDescription>املأ بياناتك أدناه لإتمام عملية الشراء. الدفع عند الاستلام.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="customerName">الاسم بالكامل</Label>
                        <Input id="customerName" {...register("customerName")} />
                        {errors.customerName && <p className="text-sm text-destructive">{errors.customerName.message}</p>}
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="customerPhone">رقم الهاتف</Label>
                        <Input id="customerPhone" type="tel" {...register("customerPhone")} />
                        {errors.customerPhone && <p className="text-sm text-destructive">{errors.customerPhone.message}</p>}
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="customerCity">المحافظة</Label>
                        <Controller
                            name="customerCity"
                            control={control}
                            render={({ field }) => (
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <SelectTrigger><SelectValue placeholder="اختر محافظتك" /></SelectTrigger>
                                    <SelectContent>
                                        {governorates.map(gov => <SelectItem key={gov} value={gov}>{gov}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                         {errors.customerCity && <p className="text-sm text-destructive">{errors.customerCity.message}</p>}
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="customerAddress">العنوان بالتفصيل</Label>
                        <Input id="customerAddress" {...register("customerAddress")} />
                        {errors.customerAddress && <p className="text-sm text-destructive">{errors.customerAddress.message}</p>}
                    </div>
                    <div className="grid grid-cols-3 gap-4 items-end">
                         <div className="space-y-2 col-span-1">
                            <Label htmlFor="quantity">الكمية</Label>
                             <Controller
                                name="quantity"
                                control={control}
                                render={({ field }) => (
                                     <Select onValueChange={(val) => field.onChange(parseInt(val))} defaultValue={field.value.toString()}>
                                        <SelectTrigger><SelectValue/></SelectTrigger>
                                        <SelectContent>
                                            {[...Array(Math.min(10, product.stockQuantity)).keys()].map(i => <SelectItem key={i+1} value={(i+1).toString()}>{i+1}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                        </div>
                        <div className="col-span-2 space-y-2">
                             <p className="text-sm text-muted-foreground">الإجمالي</p>
                             <p className="text-2xl font-bold text-primary">{totalAmount.toFixed(2)} ج.م</p>
                        </div>
                    </div>
                     {errors.quantity && <p className="text-sm text-destructive">{errors.quantity.message}</p>}

                    <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin"/>}
                        {isSubmitting ? 'جاري إرسال الطلب...' : 'إتمام الطلب'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
