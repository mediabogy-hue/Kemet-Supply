
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useFirestore, useMemoFirebase, useCollection, errorEmitter, FirestorePermissionError } from "@/firebase";
import { collection, query, where, serverTimestamp, doc, setDoc } from "firebase/firestore";
import type { Product, UserProfile } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { CircleDollarSign } from "lucide-react";
import { useSession } from "@/auth/SessionProvider";
import { governorates } from "@/lib/governorates";


const orderSchema = z.object({
  customerName: z.string().min(1, "اسم العميل مطلوب"),
  customerPhone: z.string().min(1, "رقم هاتف العميل مطلوب"),
  customerAddress: z.string().min(1, "عنوان العميل مطلوب"),
  customerCity: z.string().min(1, "المحافظة مطلوبة"),
  customerPaymentMethod: z.enum(["Cash on Delivery", "Vodafone Cash", "InstaPay", "Telda", "Bank Transfer"], {
    required_error: "طريقة الدفع مطلوبة"
  }),
  productId: z.string().min(1, "الرجاء اختيار منتج"),
  quantity: z.number().min(1, "الكمية يجب أن تكون 1 على الأقل"),
  notes: z.string().optional(),
});

type OrderFormData = z.infer<typeof orderSchema>;

export default function NewOrderPage() {
  const { user, profile: userProfile } = useSession();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const { register, handleSubmit, control, watch, formState: { errors, isSubmitting } } = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      quantity: 1,
    }
  });

  const productsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "products"), where("isAvailable", "==", true));
  }, [firestore]);

  const { data: products, isLoading: productsLoading } = useCollection<Product>(productsQuery);
  
  const selectedProductId = watch("productId");
  const selectedProduct = products?.find(p => p.id === selectedProductId);
  const quantity = watch("quantity");
  const totalAmount = selectedProduct ? selectedProduct.price * quantity : 0;
  const totalCommission = selectedProduct ? (selectedProduct.commission || 0) * quantity : 0;

  const onSubmit = async (data: OrderFormData) => {
    if (!user || !firestore || !selectedProduct || !userProfile) {
      toast({ variant: "destructive", title: "خطأ", description: "لا يمكن إنشاء الطلب. بيانات المنتج أو المستخدم غير مكتملة." });
      return;
    }
    
    const orderRef = doc(collection(firestore, 'orders'));

    const dropshipperName = `${userProfile.firstName} ${userProfile.lastName}`.trim() || user.displayName || 'مسوق';

    const orderData: any = {
      id: orderRef.id,
      dropshipperId: user.uid,
      dropshipperName,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      customerAddress: data.customerAddress,
      customerCity: data.customerCity,
      customerPaymentMethod: data.customerPaymentMethod,
      customerNotes: data.notes || "",
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      quantity: data.quantity,
      unitPrice: selectedProduct.price,
      unitCommission: selectedProduct.commission || 0,
      totalAmount: totalAmount,
      totalCommission: totalCommission,
      platformFee: 0,
      status: "Pending",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
        await setDoc(orderRef, orderData);
        toast({ title: "تم إنشاء الطلب بنجاح!" });
        router.push("/orders");
    } catch (error) {
        toast({ variant: "destructive", title: "حدث خطأ", description: "لم نتمكن من إنشاء الطلب. قد لا تملك الصلاحيات الكافية." });
    }
  };


  return (
      <div className="flex flex-col gap-8">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">إنشاء طلب جديد</h1>
            <p className="text-muted-foreground">املأ النموذج أدناه لإنشاء طلب جديد لعميلك.</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>تفاصيل العميل</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="customer-name">اسم العميل</Label>
                  <Input id="customer-name" placeholder="مثال: محمد عبدالله" {...register("customerName")} />
                  {errors.customerName && <p className="text-sm text-destructive">{errors.customerName.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer-phone">رقم هاتف العميل</Label>
                  <Input id="customer-phone" type="tel" placeholder="مثال: 01xxxxxxxxx" {...register("customerPhone")} />
                  {errors.customerPhone && <p className="text-sm text-destructive">{errors.customerPhone.message}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="customer-address">عنوان العميل</Label>
                    <Input id="customer-address" placeholder="الحي، الشارع، رقم المبنى" {...register("customerAddress")} />
                    {errors.customerAddress && <p className="text-sm text-destructive">{errors.customerAddress.message}</p>}
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="customer-city">المحافظة</Label>
                    <Controller
                        name="customerCity"
                        control={control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <SelectTrigger id="customer-city">
                                    <SelectValue placeholder="اختر المحافظة" />
                                </SelectTrigger>
                                <SelectContent>
                                    {governorates.map((gov) => (
                                        <SelectItem key={gov} value={gov}>{gov}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    />
                    {errors.customerCity && <p className="text-sm text-destructive">{errors.customerCity.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer-payment-method">طريقة الدفع للعميل</Label>
                  <Controller
                  name="customerPaymentMethod"
                  control={control}
                  render={({ field }) => (
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger id="customer-payment-method">
                          <SelectValue placeholder="اختر طريقة الدفع" />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="Cash on Delivery">الدفع عند الاستلام</SelectItem>
                          <SelectItem value="Vodafone Cash">فودافون كاش</SelectItem>
                          <SelectItem value="InstaPay">انستا باي</SelectItem>
                          <SelectItem value="Telda">تيلدا</SelectItem>
                          <SelectItem value="Bank Transfer">تحويل بنكي</SelectItem>
                      </SelectContent>
                      </Select>
                  )}
                  />
                  {errors.customerPaymentMethod && <p className="text-sm text-destructive">{errors.customerPaymentMethod.message}</p>}
              </div>
            </CardContent>
          </Card>
          <Card className="mt-6">
            <CardHeader>
                <CardTitle>تفاصيل الطلب</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                 <div className="space-y-2">
                <Label htmlFor="product">اختر المنتج</Label>
                <Controller
                  name="productId"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={productsLoading}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر المنتج المطلوب" />
                      </SelectTrigger>
                      <SelectContent>
                        {products?.map(product => (
                            <SelectItem key={product.id} value={product.id}>{product.name} - {product.price.toFixed(2)} ج.م</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                 {errors.productId && <p className="text-sm text-destructive">{errors.productId.message}</p>}
              </div>
              
              {selectedProduct && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 rounded-md border bg-muted/50 p-4">
                      <div className="sm:col-span-1">
                          <Image
                              src={selectedProduct.imageUrls?.[0] || `https://picsum.photos/seed/${selectedProduct.id}/200/200`}
                              alt={selectedProduct.name}
                              width={200}
                              height={200}
                              className="rounded-md object-contain aspect-square w-full"
                          />
                      </div>
                      <div className="sm:col-span-2 space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="quantity">الكمية</Label>
                            <Controller
                                name="quantity"
                                control={control}
                                render={({ field }) => (
                                    <Input 
                                        id="quantity" 
                                        type="number" 
                                        min="1"
                                        {...field}
                                        onChange={e => field.onChange(parseInt(e.target.value, 10) || 1)}
                                    />
                                )}
                            />
                            {errors.quantity && <p className="text-sm text-destructive">{errors.quantity.message}</p>}
                        </div>
                          
                        <div className="space-y-2">
                            <Label htmlFor="notes">ملاحظات إضافية (اختياري)</Label>
                            <Textarea id="notes" placeholder="أي تعليمات خاصة بالتوصيل أو المنتج" {...register("notes")}/>
                        </div>
                      </div>
                  </div>
              )}
            </CardContent>
          </Card>
            <Card className="mt-6">
                <CardHeader>
                    <CardTitle>ملخص الطلب</CardTitle>
                </CardHeader>
                 <CardContent className="space-y-4">
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>إجمالي سعر الطلب للعميل:</span>
                    <span>{totalAmount.toFixed(2)} ج.م</span>
                  </div>
                   <div className="flex justify-between items-center text-lg font-semibold text-primary">
                    <span className="flex items-center gap-2"><CircleDollarSign className="h-5 w-5" /> ربحك من هذا الطلب:</span>
                    <span>{totalCommission.toFixed(2)} ج.م</span>
                  </div>
                  <Button size="lg" type="submit" className="w-full mt-4" disabled={isSubmitting}>
                    {isSubmitting ? 'جاري الإنشاء...' : 'إنشاء الطلب'}
                  </Button>
              </CardContent>
            </Card>
        </form>
      </div>
  );
}
