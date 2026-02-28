
'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useFirebase } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { doc, collection, serverTimestamp, setDoc, query, where, limit, addDoc, getDocs, getDoc } from 'firebase/firestore';
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from 'next/link';
import { cn, downloadAsset } from '@/lib/utils';


import type { Product, Payment, ReferredCustomer, Order } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from "@/components/ui/toast";
import { Skeleton } from '@/components/ui/skeleton';
import { Logo } from '@/components/logo';
import { Truck, CreditCard, ShieldCheck, Undo2, Landmark, PlayCircle, Copy, Loader2, Download } from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { governorates } from '@/lib/governorates';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";



// SVG Components for logos
const VisaLogo = () => <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="h-8 w-auto fill-current text-blue-900"><title>Visa</title><path d="M6.155 4.816a4.218 4.218 0 0 0-3.32.964L1.762 4.85a6.389 6.389 0 0 1 4.542-1.428h.375c2.31 0 4.148.9 4.148 2.85 0 1.29-.62 2.085-1.643 2.61l-1.14.569c-.6.3-1.012.66-1.012 1.125 0 .39.24.66.75.66.713 0 1.185-.21 2.01-.735l.405 1.59a5.205 5.205 0 0 1-2.58.75c-2.416 0-4.148-1.02-4.148-2.925 0-1.575 1.05-2.4 2.25-2.985l1.02-.51c.54-.27.87-.585.87-.99 0-.45-.405-.75-.975-.75-.728 0-1.395.225-2.025.645zM22.215 4.5h-2.1l-3.3 8.94h2.25l.585-1.8h2.925l.33 1.8h2.025L22.215 4.5zm-2.595 5.76L20.7 6.885l1.095 3.375h-2.175zM15.428 4.5l-2.1 8.94h2.025l.39-1.995 1.635.015.39 1.98h2.025l-2.085-8.94h-2.3zM14.543 9.99l.66-3.465 1.02 3.465h-1.68z" /></svg>;

const MastercardLogo = () => (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="h-8 w-auto"><title>Mastercard</title><circle cx="8.5" cy="12" r="7.5" fill="#EB001B" /><circle cx="15.5" cy="12" r="7.5" fill="#F79E1B" /><path d="M12 7.5a7.5 7.5 0 0 0 0 9 7.5 7.5 0 0 1 0-9z" fill="#FF5F00" /></svg>
);

const VodafoneCashLogo = () => (
    <div className="relative h-8 w-8">
        <div className="absolute inset-0 rounded-full bg-[#E60000]"></div>
        <div className="absolute inset-[3px] rounded-full bg-white"></div>
        <svg viewBox="0 0 24 24" className="absolute inset-0 h-full w-full fill-[#E60000]">
            <path d="M11.5,16.5 C9.02,16.5 7,14.48 7,12 C7,9.52 9.02,7.5 11.5,7.5 C12.4,7.5 13.22,7.8 13.9,8.3 L12.4,9.8 C12.14,9.6 11.84,9.5 11.5,9.5 C10.12,9.5 9,10.62 9,12 C9,13.38 10.12,14.5 11.5,14.5 C12.98,14.5 14.12,13.36 14.12,11.9 H11.5 V10.4 H15.5 V12 C15.5,14.48 13.48,16.5 11.5,16.5Z"/>
        </svg>
    </div>
);

const TeldaLogo = () => (
    <span className="text-2xl font-bold" style={{fontFamily: "'Trebuchet MS', sans-serif", color: '#0d0d0d'}}>telda</span>
);

const InstaPayLogo = () => (
    <div className="relative h-8 w-auto px-3 rounded-md bg-[#00A99D] flex items-center">
        <span className="text-white text-lg font-bold">instapay</span>
    </div>
);


const orderSchema = z.object({
  customerName: z.string().min(3, "الرجاء إدخال اسم ثلاثي على الأقل"),
  customerPhone: z.string().min(10, "الرجاء إدخال رقم هاتف صحيح"),
  customerAddress: z.string().min(10, "الرجاء إدخال عنوان تفصيلي"),
  customerCity: z.string().min(1, "الرجاء اختيار المحافظة"),
  customerPaymentMethod: z.enum(["Cash on Delivery", "Vodafone Cash", "InstaPay", "Telda", "Bank Transfer"], {
    required_error: "الرجاء اختيار طريقة الدفع."
  }),
  quantity: z.number().min(1, "الكمية يجب أن تكون 1 على الأقل"),
  customerNotes: z.string().optional(),
  senderPhoneNumber: z.string().optional(),
  referenceNumber: z.string().optional(),
}).superRefine((data, ctx) => {
    if (data.customerPaymentMethod !== 'Cash on Delivery') {
        if (!data.senderPhoneNumber) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "رقم هاتف الراسل مطلوب للدفع المسبق.",
                path: ['senderPhoneNumber'],
            });
        }
        if (!data.referenceNumber) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "رقم العملية مطلوب للدفع المسبق.",
                path: ['referenceNumber'],
            });
        }
    }
});

type OrderFormData = z.infer<typeof orderSchema>;

export default function PublicProductPage() {
    const { firestore } = useFirebase();
    const params = useParams();
    const searchParams = useSearchParams();
    const { toast } = useToast();

    const [product, setProduct] = useState<Product | null>(null);
    const [productLoading, setProductLoading] = useState(true);
    const [productError, setProductError] = useState<Error | null>(null);
    const [orderSuccess, setOrderSuccess] = useState(false);
    
    const productId = params.productId as string;
    const dropshipperId = searchParams.get('ref');
    
    const hasTrackedClick = useRef(false);

    const [paymentSettings, setPaymentSettings] = useState<Record<string, any> | null>(null);
    const [publicSettingsLoading, setPublicSettingsLoading] = useState(false);
    const [isDownloadDialogOpen, setIsDownloadDialogOpen] = useState(false);

    useEffect(() => {
        if (!firestore || !productId) {
            setProductLoading(false);
            return;
        }

        const fetchProduct = async () => {
            try {
                setProductLoading(true);
                const productRef = doc(firestore, 'products', productId);
                const docSnap = await getDoc(productRef);
                if (docSnap.exists()) {
                    setProduct({ id: docSnap.id, ...docSnap.data() } as Product);
                } else {
                    setProduct(null); // Not found
                }
                setProductError(null);
            } catch (e: any) {
                console.error("Direct product fetch failed:", e);
                setProductError(e);
            } finally {
                setProductLoading(false);
            }
        };

        fetchProduct();
    }, [firestore, productId]);

    useEffect(() => {
        if (firestore && productId && dropshipperId && !hasTrackedClick.current) {
            hasTrackedClick.current = true;
            const clicksRef = collection(firestore, `products/${productId}/clicks`);
            addDoc(clicksRef, {
                productId,
                dropshipperId,
                createdAt: serverTimestamp(),
            }).catch(err => {
                errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: `products/${productId}/clicks`,
                    operation: 'create',
                    requestResourceData: { productId, dropshipperId }
                }));
            });
        }
    }, [firestore, productId, dropshipperId]);

    const [selectedMedia, setSelectedMedia] = useState<{ url: string; type: 'image' | 'video' } | null>(null);

     useEffect(() => {
        if (product) {
            if (product.imageUrls && product.imageUrls.length > 0) {
                setSelectedMedia({ url: product.imageUrls[0], type: 'image' });
            } else if (product.videoUrl) {
                setSelectedMedia({ url: product.videoUrl, type: 'video' });
            } else {
                setSelectedMedia(null);
            }
        }
    }, [product]);

    const relatedProductsQuery = useMemo(() => {
        if (!firestore || !product?.category) return null;
        return query(
          collection(firestore, "products"),
          where("isAvailable", "==", true),
          where("category", "==", product.category),
          limit(4) // Fetch 4 to ensure we get 3 others if the current product is included
        );
    }, [firestore, product]);

    const { data: relatedProductsData, isLoading: relatedProductsLoading } = useCollection(relatedProductsQuery);

    const relatedProducts = useMemo(() => {
        if (!relatedProductsData || !product) return [];
        // Filter out the current product and take the first 3
        return relatedProductsData.filter(p => p.id !== product.id).slice(0, 3);
    }, [relatedProductsData, product]);

    const { register, handleSubmit, control, watch, formState: { errors, isSubmitting } } = useForm<OrderFormData>({
        resolver: zodResolver(orderSchema),
        defaultValues: {
            quantity: 1,
        }
    });

    const quantity = watch("quantity");
    const paymentMethod = watch("customerPaymentMethod");
    const totalAmount = product ? product.price * quantity : 0;

    const handlePaymentMethodChange = async (value: string, fieldOnChange: (value: string) => void) => {
        fieldOnChange(value); // Update the form state
        if (value !== 'Cash on Delivery' && !paymentSettings) {
            if (!firestore) {
                toast({
                    variant: "destructive",
                    title: "خطأ",
                    description: "خدمة قاعدة البيانات غير متاحة."
                });
                return;
            }
            setPublicSettingsLoading(true);
            try {
                const settingsDocRef = doc(firestore, 'publicSettings', 'data');
                const docSnap = await getDoc(settingsDocRef);
                if (docSnap.exists()) {
                    setPaymentSettings(docSnap.data());
                } else {
                    console.log("No such document in publicSettings!");
                    setPaymentSettings(null);
                    toast({
                        variant: "destructive",
                        title: "خطأ",
                        description: "لا يمكن تحميل بيانات الدفع حالياً."
                    });
                }
            } catch (e) {
                console.error("Error fetching public settings: ", e);
                toast({
                    variant: "destructive",
                    title: "خطأ",
                    description: "فشل تحميل بيانات الدفع."
                });
            } finally {
                setPublicSettingsLoading(false);
            }
        }
    };


    const handleOrderSubmit = async (data: OrderFormData) => {
        if (!firestore || !product || !dropshipperId) {
            toast({
                variant: 'destructive',
                title: 'خطأ في الطلب',
                description: 'لا يمكن معالجة طلبك الآن. بيانات المنتج أو المسوّق غير صحيحة.',
            });
            return;
        }
    
        const orderRef = doc(collection(firestore, 'orders'));
        
        let dropshipperName = 'مسوق';
        try {
            const dropshipperDoc = await getDoc(doc(firestore, 'users', dropshipperId));
            if (dropshipperDoc.exists()) {
                const profile = dropshipperDoc.data();
                dropshipperName = `${profile.firstName} ${profile.lastName}`.trim() || profile.email;
            }
        } catch (e) {
            console.warn("Could not fetch dropshipper name", e);
        }

        const orderData: Partial<Order> = {
            id: orderRef.id,
            dropshipperId,
            dropshipperName,
            customerName: data.customerName,
            customerPhone: data.customerPhone,
            customerAddress: data.customerAddress,
            customerCity: data.customerCity,
            customerPaymentMethod: data.customerPaymentMethod,
            customerNotes: data.customerNotes || '',
            productId: product.id,
            productName: product.name,
            quantity: data.quantity,
            unitPrice: product.price,
            unitCommission: product.commission || 0,
            totalAmount,
            totalCommission: (product.commission || 0) * data.quantity,
            platformFee: 0, 
            status: 'Pending',
            createdAt: serverTimestamp() as any,
            updatedAt: serverTimestamp() as any,
        };
    
        if (data.customerPaymentMethod !== 'Cash on Delivery') {
            orderData.customerPaymentStatus = 'Pending';
            orderData.customerPaymentProof = {
                senderPhoneNumber: data.senderPhoneNumber,
                referenceNumber: data.referenceNumber,
            };
        }
    
        try {
            await setDoc(orderRef, orderData);

            // Create a record for the referred customer
            if (dropshipperId) {
                const customerRef = doc(firestore, `marketingCustomers/${data.customerPhone}`);
                const customerData: Partial<ReferredCustomer> = {
                    id: data.customerPhone,
                    referralMarketerId: dropshipperId,
                    contactId: data.customerPhone,
                    channel: 'web',
                    segment: product.category || 'general',
                    consentStatus: 'pending',
                    lastInteractionAt: serverTimestamp() as any,
                    name: data.customerName,
                };
                 await setDoc(customerRef, { ...customerData, createdAt: serverTimestamp() }, { merge: true });
            }
            
            setOrderSuccess(true);
            toast({
                title: 'تم استلام طلبك بنجاح!',
                description: 'سيتم التواصل معك قريباً لتأكيد الطلب.',
            });

        } catch (error) {
            console.error("Order submission error:", error);
            errorEmitter.emit('permission-error', new FirestorePermissionError({
               path: `orders/${orderRef.id}`,
               operation: 'create',
               requestResourceData: orderData
           }));
           toast({
               variant: 'destructive',
               title: 'حدث خطأ',
               description: 'لم نتمكن من تسجيل طلبك. الرجاء المحاولة مرة أخرى.',
           });
        }
    };
    
    const handleDownloadAsset = async (url: string, index: number, type: 'image' | 'video') => {
        if (!product) return;
        const fileExtension = url.split('.').pop()?.split('?')[0] || (type === 'image' ? 'jpg' : 'mp4');
        const filename = `${product.name.replace(/ /g, '-')}-${type}-${index + 1}.${fileExtension}`;
        try {
            await downloadAsset(url, filename);
            toast({ title: 'بدء تحميل الملف', description: filename });
        } catch (error) {
            console.error('Download failed:', error);
            toast({
                variant: 'destructive',
                title: 'فشل التحميل',
                description: 'لا يمكن تحميل الملف. قد يكون الرابط محميًا.',
                action: <ToastAction altText="Open Link" onClick={() => window.open(url, '_blank')}>فتح الرابط</ToastAction>
            });
        }
    }


    if (productLoading) {
        return (
            <div className="container mx-auto p-4 md:p-8">
                <div className="grid md:grid-cols-2 gap-8">
                    <Skeleton className="w-full aspect-square rounded-lg" />
                    <div className="space-y-4">
                        <Skeleton className="h-10 w-3/4" />
                        <Skeleton className="h-8 w-1/4" />
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </div>
                </div>
            </div>
        )
    }

    if (productError || !product) {
         return (
            <div className="container mx-auto flex flex-col items-center justify-center min-h-screen p-4">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>خطأ</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>عذراً، لم نتمكن من العثور على هذا المنتج. قد يكون الرابط غير صحيح أو تمت إزالة المنتج.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }
    
    if (orderSuccess) {
         return (
             <div className="container mx-auto flex flex-col items-center justify-center min-h-screen p-4 text-center">
                <Card className="w-full max-w-md p-6">
                    <CardHeader>
                        <CardTitle className="text-2xl">شكراً لك!</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">لقد تم استلام طلبك بنجاح. سيقوم فريقنا بالتواصل معك في أقرب وقت لتأكيد تفاصيل الشحن.</p>
                         <div className="mt-8 flex justify-center">
                            <Link href="/">
                                <Logo />
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
         );
    }
    
    const totalMediaCount = (product.imageUrls?.length || 0) + (product.videoUrl ? 1 : 0);

    return (
        <div className="container mx-auto p-4 md:p-8">
            <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-start">
                 <div className="space-y-2">
                    <div className="aspect-square w-full bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                        {selectedMedia?.type === 'image' ? (
                            <Image
                                src={selectedMedia.url}
                                alt={product.name}
                                width={800}
                                height={800}
                                className="w-full h-full object-contain"
                                priority
                            />
                        ) : selectedMedia?.type === 'video' ? (
                            <video src={selectedMedia.url} controls autoPlay muted className="max-w-full max-h-full rounded-lg" />
                        ) : (
                             <Image
                                src={`https://picsum.photos/seed/${product.id}/800/800`}
                                alt={product.name}
                                width={800}
                                height={800}
                                className="w-full h-full object-contain"
                            />
                        )}
                    </div>

                    {totalMediaCount > 1 && (
                        <div className="grid grid-cols-5 gap-2">
                            {product.imageUrls?.map((url, index) => (
                                <button
                                    key={`thumb-img-${index}`}
                                    onClick={() => setSelectedMedia({ url, type: 'image' })}
                                    className={cn(
                                        "aspect-square w-full rounded-md overflow-hidden border-2 transition-all",
                                        selectedMedia?.url === url ? "border-primary" : "border-transparent hover:border-muted-foreground/50"
                                    )}
                                >
                                    <Image
                                        src={url}
                                        alt={`${product.name} thumbnail ${index + 1}`}
                                        width={200}
                                        height={200}
                                        className="w-full h-full object-cover"
                                    />
                                </button>
                            ))}
                            {product.videoUrl && (
                                 <button
                                    key="thumb-vid"
                                    onClick={() => setSelectedMedia({ url: product.videoUrl!, type: 'video' })}
                                    className={cn(
                                        "aspect-square w-full rounded-md overflow-hidden border-2 flex items-center justify-center bg-black transition-all",
                                        selectedMedia?.url === product.videoUrl ? "border-primary" : "border-transparent hover:border-muted-foreground/50"
                                    )}
                                >
                                    <PlayCircle className="h-1/2 w-1/2 text-white/70" />
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <div className="space-y-6">
                    <div className="flex justify-between items-start gap-4">
                        <div>
                            <h1 className="text-3xl lg:text-4xl font-bold">{product.name}</h1>
                            <p className="text-2xl font-bold text-primary mt-2">{totalAmount.toFixed(2)} ج.م</p>
                        </div>
                        <Button variant="outline" onClick={() => setIsDownloadDialogOpen(true)}>
                            <Download className="me-2"/>
                            تحميل المرفقات
                        </Button>
                    </div>

                    <p className="text-muted-foreground whitespace-pre-wrap">{product.description}</p>
                    

                    <Card>
                        <CardContent className="p-4">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                                <div className="flex flex-col items-center gap-2 p-2">
                                    <Truck className="h-8 w-8 text-primary"/>
                                    <p className="text-sm font-medium">سرعة الشحن</p>
                                </div>
                                <div className="flex flex-col items-center gap-2 p-2">
                                    <CreditCard className="h-8 w-8 text-primary"/>
                                    <p className="text-sm font-medium">سهولة الدفع</p>
                                </div>
                                <div className="flex flex-col items-center gap-2 p-2">
                                    <ShieldCheck className="h-8 w-8 text-primary"/>
                                    <p className="text-sm font-medium">ضمان على المنتجات</p>
                                </div>
                                <div className="flex flex-col items-center gap-2 p-2">
                                    <Undo2 className="h-8 w-8 text-primary"/>
                                    <p className="text-sm font-medium">استبدال واسترجاع</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardHeader>
                            <CardTitle>اطلب الآن</CardTitle>
                            <CardDescription>املأ بياناتك أدناه لإكمال الطلب وسيتم التواصل معك للتأكيد.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             {!dropshipperId && (
                                <div className="mb-4 rounded-md border-l-4 border-destructive bg-destructive/10 p-4 text-destructive-foreground">
                                    <h4 className="font-bold">رابط تسويق غير صالح</h4>
                                    <p className="text-sm">لا يمكن إتمام الطلب من خلال هذا الرابط. يرجى التأكد من استخدام الرابط الصحيح الذي أرسله لك المسوق.</p>
                                </div>
                            )}
                             <form onSubmit={handleSubmit(handleOrderSubmit)} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="customer-name">الاسم الثلاثي</Label>
                                    <Input id="customer-name" placeholder="اسمك الكامل" {...register("customerName")} />
                                    {errors.customerName && <p className="text-sm text-destructive">{errors.customerName.message}</p>}
                                </div>
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="customer-phone">رقم الهاتف</Label>
                                        <Input id="customer-phone" type="tel" placeholder="01xxxxxxxxx" {...register("customerPhone")} />
                                        {errors.customerPhone && <p className="text-sm text-destructive">{errors.customerPhone.message}</p>}
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
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="customer-payment-method">طريقة الدفع</Label>
                                    <Controller
                                        name="customerPaymentMethod"
                                        control={control}
                                        render={({ field }) => (
                                            <Select onValueChange={(value) => handlePaymentMethodChange(value, field.onChange)} defaultValue={field.value}>
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
                                 <div className="space-y-2">
                                    <Label htmlFor="customer-address">العنوان بالتفصيل</Label>
                                    <Textarea id="customer-address" placeholder="الشارع، رقم المبنى، علامة مميزة..." {...register("customerAddress")} />
                                    {errors.customerAddress && <p className="text-sm text-destructive">{errors.customerAddress.message}</p>}
                                </div>
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
                                    <Label htmlFor="notes">ملاحظات (اختياري)</Label>
                                    <Textarea id="notes" placeholder="أي تعليمات خاصة بالطلب" {...register("customerNotes")} />
                                </div>
                                
                                {paymentMethod && paymentMethod !== 'Cash on Delivery' && (
                                    <Card className="mt-6 border-primary/20 bg-primary/5">
                                        <CardHeader>
                                            <CardTitle>تأكيد الدفع</CardTitle>
                                            <CardDescription>
                                                لإتمام الطلب، يرجى تحويل المبلغ ثم إدخال بيانات التحويل.
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="rounded-md border bg-background p-4 text-center space-y-3">
                                                <p className="text-sm text-muted-foreground">قم بتحويل مبلغ <span className="font-bold text-primary">{totalAmount.toFixed(2)} ج.م</span> إلى:</p>
                                                {publicSettingsLoading ? (
                                                    <div className="flex justify-center items-center h-10">
                                                         <Loader2 className="h-5 w-5 animate-spin" />
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center gap-2 pt-2">
                                                        {paymentMethod === 'Vodafone Cash' && paymentSettings?.payment_vodafone_cash_enabled && (
                                                            <div className="flex items-center gap-2 p-2 rounded-md border bg-muted w-full justify-center">
                                                                <span className="font-mono text-lg font-semibold">{paymentSettings.payment_vodafone_cash_number}</span>
                                                            </div>
                                                        )}
                                                        {paymentMethod === 'InstaPay' && paymentSettings?.payment_instapay_enabled && (
                                                            <div className="flex items-center gap-2 p-2 rounded-md border bg-muted w-full justify-center">
                                                                <span className="font-mono text-lg font-semibold">{paymentSettings.payment_instapay_handle}</span>
                                                            </div>
                                                        )}
                                                        {paymentMethod === 'Telda' && paymentSettings?.payment_telda_enabled && (
                                                             <div className="flex items-center gap-2 p-2 rounded-md border bg-muted w-full justify-center">
                                                                <span className="font-mono text-lg font-semibold">{paymentSettings.payment_telda_handle}</span>
                                                            </div>
                                                        )}
                                                        {paymentMethod === 'Bank Transfer' && paymentSettings?.payment_bank_transfer_enabled && (
                                                             <div className="flex items-center gap-2 p-2 rounded-md border bg-muted w-full justify-center">
                                                                <span className="font-mono text-sm font-semibold text-center">{paymentSettings.payment_bank_transfer_details}</span>
                                                            </div>
                                                        )}
                                                        {((paymentMethod === 'Vodafone Cash' && !paymentSettings?.payment_vodafone_cash_enabled) ||
                                                          (paymentMethod === 'InstaPay' && !paymentSettings?.payment_instapay_enabled) ||
                                                          (paymentMethod === 'Telda' && !paymentSettings?.payment_telda_enabled) ||
                                                          (paymentMethod === 'Bank Transfer' && !paymentSettings?.payment_bank_transfer_enabled)) &&
                                                            <p className="text-sm text-destructive">طريقة الدفع هذه غير متاحة حالياً.</p>
                                                        }
                                                    </div>
                                                )}
                                            </div>
                        
                                            <div className="grid sm:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="sender-phone">رقم هاتف الراسل</Label>
                                                    <Input id="sender-phone" {...register("senderPhoneNumber")} placeholder="01xxxxxxxxx"/>
                                                    {errors.senderPhoneNumber && <p className="text-sm text-destructive">{errors.senderPhoneNumber.message}</p>}
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="reference-number">رقم العملية</Label>
                                                    <Input id="reference-number" {...register("referenceNumber")} placeholder="الرقم المرجعي للعملية" />
                                                    {errors.referenceNumber && <p className="text-sm text-destructive">{errors.referenceNumber.message}</p>}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                <Button type="submit" size="lg" className="w-full" disabled={isSubmitting || !dropshipperId}>
                                    {isSubmitting ? 'جاري إرسال الطلب...' : `تأكيد الطلب - ${totalAmount.toFixed(2)} ج.م`}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                     <div className="space-y-4 pt-4">
                        <p className="text-center text-sm font-medium text-muted-foreground">طرق الدفع المتاحة</p>
                        <div className="flex items-center justify-center flex-wrap gap-x-6 gap-y-4">
                            <VisaLogo />
                            <MastercardLogo />
                            <VodafoneCashLogo />
                            <InstaPayLogo />
                            <TeldaLogo />
                            <div className="flex items-center gap-2">
                                <Landmark className="h-8 w-8 text-gray-600"/>
                                <span className="font-semibold text-gray-700">تحويل بنكي</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Dialog open={isDownloadDialogOpen} onOpenChange={setIsDownloadDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>تحميل المادة الإعلانية</DialogTitle>
                        <DialogDescription>
                            اضغط على الملفات لتحميلها. قد تحتاج إلى السماح للمتصفح بتنزيل ملفات متعددة.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[60vh] overflow-y-auto space-y-3 p-1">
                        {product.imageUrls?.map((url, index) => (
                            <div key={`dl-img-${index}`} className="flex items-center justify-between gap-2 rounded-md border p-2">
                                <div className="flex items-center gap-3">
                                    <Image src={url} alt={`Image ${index+1}`} width={48} height={48} className="rounded object-cover aspect-square" />
                                    <span className="text-sm font-medium">صورة {index + 1}</span>
                                </div>
                                <Button size="sm" variant="ghost" onClick={() => handleDownloadAsset(url, index, 'image')}>
                                    <Download className="h-4 w-4"/>
                                </Button>
                            </div>
                        ))}
                        {product.videoUrl && (
                             <div className="flex items-center justify-between gap-2 rounded-md border p-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded bg-black flex items-center justify-center">
                                        <PlayCircle className="h-6 w-6 text-white"/>
                                    </div>
                                    <span className="text-sm font-medium">فيديو</span>
                                </div>
                                <Button size="sm" variant="ghost" onClick={() => handleDownloadAsset(product.videoUrl!, 0, 'video')}>
                                    <Download className="h-4 w-4"/>
                                </Button>
                            </div>
                        )}
                         {!product.imageUrls?.length && !product.videoUrl && (
                            <p className="text-sm text-muted-foreground text-center py-4">لا توجد مرفقات متاحة للتحميل.</p>
                        )}
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="secondary">
                                إغلاق
                            </Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {relatedProducts && relatedProducts.length > 0 && (
                <div className="mt-16">
                    <h2 className="text-3xl font-bold mb-8 text-center">منتجات مشابهة قد تعجبك</h2>
                    <Carousel
                        opts={{ align: "start", loop: true, direction: "rtl" }}
                        className="w-full max-w-6xl mx-auto"
                    >
                        <CarouselContent className="-mr-4">
                            {relatedProducts.map((p) => (
                                <CarouselItem key={p.id} className="pr-4 basis-full sm:basis-1/2 md:basis-1/3">
                                    <Card className="h-full flex flex-col overflow-hidden group">
                                        <Link href={`/product/${p.id}${dropshipperId ? `?ref=${dropshipperId}` : ''}`} className="block">
                                            <CardContent className="p-0 aspect-square bg-muted/30">
                                                <Image
                                                    src={p.imageUrls?.[0] || `https://picsum.photos/seed/${p.id}/600/600`}
                                                    alt={p.name}
                                                    width={600}
                                                    height={600}
                                                    className="w-full h-full object-contain transition-transform group-hover:scale-105"
                                                />
                                            </CardContent>
                                        </Link>
                                        <div className="p-4 border-t flex-grow flex flex-col justify-between">
                                            <h3 className="font-semibold truncate">{p.name}</h3>
                                            <p className="text-lg font-bold text-primary mt-1">{p.price.toFixed(2)} ج.م</p>
                                        </div>
                                    </Card>
                                </CarouselItem>
                            ))}
                        </CarouselContent>
                        <CarouselPrevious className="start-0 -translate-x-1/2"/>
                        <CarouselNext className="end-0 translate-x-1/2"/>
                    </Carousel>
                </div>
            )}

            <div className="mt-16 max-w-4xl mx-auto">
                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1">
                        <AccordionTrigger className="text-xl font-bold">سياسة الاستبدال والاسترجاع</AccordionTrigger>
                        <AccordionContent className="pt-4 space-y-6 text-muted-foreground">
                            <div>
                                <h4 className="font-semibold text-lg text-foreground mb-2">الاستبدال</h4>
                                <p>يمكن استبدال المنتج خلال 14 يومًا من تاريخ الاستلام في حالة وجود عيب في الصناعة. لطلب الاستبدال، يرجى التأكد من الشروط التالية:</p>
                                <ul className="list-disc pe-6 space-y-2 mt-2">
                                    <li>يجب أن يكون المنتج في حالته الأصلية، بغلافه الأصلي وجميع ملحقاته لم يتم فتحها.</li>
                                    <li>يتم فحص المنتج من قبل القسم المختص لدينا للتأكد من وجود العيب المبلغ عنه.</li>
                                    <li>في حالة ثبوت العيب، يتم استبدال المنتج بآخر جديد من نفس النوع دون أي تكلفة إضافية على العميل.</li>
                                    <li>إذا لم يكن المنتج متوفرًا للاستبدال، يمكن للعميل اختيار منتج آخر بنفس القيمة أو استرداد المبلغ المدفوع بالكامل.</li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-lg text-foreground mb-2">الاسترجاع</h4>
                                <p>يمكن إرجاع المنتج خلال 14 يومًا من تاريخ الاستلام. لإتمام عملية الاسترجاع، يجب استيفاء الشروط التالية:</p>
                                <ul className="list-disc pe-6 space-y-2 mt-2">
                                    <li>يجب أن يكون المنتج غير مستخدم وبحالته الأصلية تمامًا عند الاستلام، بما في ذلك الغلاف الأصلي.</li>
                                    <li>في حالة الاسترجاع لسبب لا يتعلق بعيب في المنتج، يتحمل العميل كافة مصاريف الشحن.</li>
                                    <li>يتم فحص المنتج عند وصوله إلى مستودعاتنا للتأكد من سلامته وحالته قبل الموافقة على رد المبلغ.</li>
                                    <li>بعد الموافقة، يتم رد المبلغ المدفوع للعميل خلال 7 إلى 14 يوم عمل.</li>
                                    <li>المنتجات التي لا يمكن إرجاعها تشمل: المنتجات ذات الاستخدام الشخصي (مثل سماعات الأذن ومستحضرات التجميل)، والبرامج الرقمية، والمنتجات التي تم استخدامها أو تركيبها.</li>
                                </ul>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </div>
        </div>
    );
}

    