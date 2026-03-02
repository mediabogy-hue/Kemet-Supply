'use client';
import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore } from '@/firebase';
import { doc, setDoc, collection, serverTimestamp, getDoc, writeBatch } from 'firebase/firestore';
import type { Product, UserProfile, Payment } from '@/lib/types';
import { governorates } from '@/lib/governorates';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, PartyPopper } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

const orderSchema = z.object({
    customerName: z.string().min(3, "الرجاء إدخال اسم ثلاثي على الأقل"),
    customerPhone: z.string().regex(/^01[0-2,5]\d{8}$/, "الرجاء إدخال رقم هاتف مصري صحيح"),
    customerAddress: z.string().min(10, "الرجاء إدخال عنوان مفصل"),
    customerCity: z.string().min(1, "الرجاء اختيار المحافظة"),
    quantity: z.number().min(1).max(10),
    customerPaymentMethod: z.enum(["Cash on Delivery", "Vodafone Cash", "InstaPay"], {
        required_error: "الرجاء اختيار طريقة الدفع",
    }),
    paymentSenderNumber: z.string().optional(),
    paymentTransactionId: z.string().optional(),
}).refine((data) => {
    if (data.customerPaymentMethod !== 'Cash on Delivery') {
        return !!data.paymentSenderNumber && !!data.paymentTransactionId;
    }
    return true;
}, {
    message: "بيانات إثبات الدفع مطلوبة لهذه الطريقة",
    path: ["paymentTransactionId"],
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
        defaultValues: { 
            quantity: 1,
            customerPaymentMethod: 'Cash on Delivery'
        },
    });

    const quantity = watch('quantity');
    const paymentMethod = watch('customerPaymentMethod');
    const totalAmount = product.price * quantity;
    const unitCommission = product.price * 0.0125;
    const totalCommission = unitCommission * quantity;
    const platformFee = totalAmount * 0.05;

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
            const dropshipperRef = doc(firestore, 'users', refId);
            const dropshipperSnap = await getDoc(dropshipperRef);
            if (!dropshipperSnap.exists()) {
                throw new Error("المسوق غير موجود.");
            }
            const dropshipper = dropshipperSnap.data() as UserProfile;
            const dropshipperName = `${dropshipper.firstName} ${dropshipper.lastName}`.trim();

            const batch = writeBatch(firestore);
            const orderId = doc(collection(firestore, 'id_generator')).id;
            const orderRef = doc(firestore, 'orders', orderId);

            const orderData: any = {
                id: orderId,
                dropshipperId: refId,
                dropshipperName,
                customerName: data.customerName,
                customerPhone: data.customerPhone,
                customerAddress: data.customerAddress,
                customerCity: data.customerCity,
                customerPaymentMethod: data.customerPaymentMethod,
                productId: product.id,
                productName: product.name,
                productImageUrl: product.imageUrls?.[0] || null,
                quantity: data.quantity,
                unitPrice: product.price,
                totalAmount: totalAmount,
                unitCommission: unitCommission,
                totalCommission: totalCommission,
                platformFee: platformFee,
                status: 'Pending',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                merchantId: product.merchantId || null,
                merchantName: product.merchantName || null,
            };

            if (data.customerPaymentMethod !== 'Cash on Delivery') {
                orderData.customerPaymentStatus = 'Pending';
                orderData.customerPaymentProof = {
                    senderPhoneNumber: data.paymentSenderNumber,
                    referenceNumber: data.paymentTransactionId,
                };
            }

            batch.set(orderRef, orderData);
            await batch.commit();
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
                <CardDescription>املأ بياناتك أدناه لإتمام عملية الشراء.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {/* Customer Details */}
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
                    {/* Quantity */}
                    <div className="space-y-2">
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
                     {errors.quantity && <p className="text-sm text-destructive">{errors.quantity.message}</p>}

                    <Separator />

                    {/* Payment Section */}
                    <div className="space-y-2">
                        <Label>طريقة الدفع</Label>
                        <Controller
                            name="customerPaymentMethod"
                            control={control}
                            render={({ field }) => (
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Cash on Delivery">الدفع عند الاستلام</SelectItem>
                                        <SelectItem value="Vodafone Cash">فودافون كاش (دفع مسبق)</SelectItem>
                                        <SelectItem value="InstaPay">انستا باي (دفع مسبق)</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                        />
                    </div>

                    {paymentMethod !== 'Cash on Delivery' && (
                        <div className="p-4 rounded-md border border-primary/20 bg-primary/5 space-y-4">
                            <h4 className="font-semibold">تعليمات الدفع المسبق</h4>
                            <p className="text-sm text-muted-foreground">
                                يرجى تحويل المبلغ الإجمالي <span className="font-bold text-primary">{totalAmount.toFixed(2)} ج.م</span> إلى الحساب التالي ثم إدخال بيانات التحويل.
                            </p>
                             {paymentMethod === 'Vodafone Cash' && <p className="font-mono p-2 bg-muted rounded-md text-center">01012345678</p>}
                             {paymentMethod === 'InstaPay' && <p className="font-mono p-2 bg-muted rounded-md text-center">kemet.supply@instapay</p>}

                            <div className="space-y-2">
                                <Label htmlFor="paymentSenderNumber">رقم الهاتف الذي تم منه التحويل</Label>
                                <Input id="paymentSenderNumber" {...register("paymentSenderNumber")} />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="paymentTransactionId">رقم العملية أو آخر 4 أرقام من المحفظة</Label>
                                <Input id="paymentTransactionId" {...register("paymentTransactionId")} />
                                {errors.paymentTransactionId && <p className="text-sm text-destructive">{errors.paymentTransactionId.message}</p>}
                            </div>
                        </div>
                    )}
                    
                    <Separator />
                    
                    <div className="space-y-4">
                         <div className="flex justify-between items-center text-lg font-bold">
                            <p>الإجمالي</p>
                            <p className="text-2xl text-primary">{totalAmount.toFixed(2)} ج.م</p>
                        </div>

                        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin"/>}
                            {isSubmitting ? 'جاري إرسال الطلب...' : 'إتمام الطلب'}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
