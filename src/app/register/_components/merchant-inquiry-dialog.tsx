
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, errorEmitter, FirestorePermissionError } from "@/firebase";
import { collection, addDoc, serverTimestamp, doc, setDoc } from "firebase/firestore";
import { Loader2, Mail, MessageCircle } from "lucide-react";

const inquirySchema = z.object({
  name: z.string().min(3, "الرجاء إدخال اسم ثلاثي على الأقل"),
  email: z.string().email("الرجاء إدخال بريد إلكتروني صحيح"),
  phone: z.string().min(10, "الرجاء إدخال رقم هاتف صحيح"),
  companyName: z.string().optional(),
  message: z.string().min(10, "الرجاء كتابة رسالة توضيحية (10 أحرف على الأقل)"),
});

type InquiryFormData = z.infer<typeof inquirySchema>;

const ADMIN_EMAIL = "kemetsupply@gmail.com";
const ADMIN_WHATSAPP = "201062292012";

export function MerchantInquiryDialog() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InquiryFormData>({
    resolver: zodResolver(inquirySchema),
  });

  const onSubmit = async (data: InquiryFormData) => {
    if (!firestore) {
      toast({ variant: "destructive", title: "خطأ", description: "خدمات قاعدة البيانات غير متاحة." });
      return;
    }
    
    const inquiryRef = collection(firestore, 'merchantInquiries');
    
    try {
        // Generate a new document reference with an ID upfront.
        const newDocRef = doc(inquiryRef);
        
        // Create the full data object, including the generated ID.
        const inquiryData = {
            id: newDocRef.id,
            name: data.name,
            email: data.email,
            phone: data.phone,
            companyName: data.companyName || "",
            message: data.message,
            status: "New" as const,
            createdAt: serverTimestamp(),
        };

        // Use a single `setDoc` operation, which counts as a 'create' in security rules.
        await setDoc(newDocRef, inquiryData);
        setIsSuccess(true);

    } catch (error) {
        console.error("Inquiry submission failed:", error);
        const requestData = {
            name: data.name,
            email: data.email,
            phone: data.phone,
            companyName: data.companyName || "",
            message: data.message,
            status: "New",
        };
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: inquiryRef.path, // The path for a create is the collection path.
            operation: 'create',
            requestResourceData: requestData,
        }));
        toast({ variant: "destructive", title: "فشل إرسال الطلب", description: "حدث خطأ أثناء إرسال طلبك. الرجاء المحاولة مرة أخرى." });
    }
  };
  
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      // Use a timeout to reset form state after dialog close animation
      setTimeout(() => {
          reset();
          setIsSuccess(false);
      }, 300);
    }
  }

  const emailBody = "مرحباً فريق Kemet Supply،\n\nأود الاستفسار عن عرض منتجاتي على منصتكم.\n\nتفاصيل إضافية:\n";
  const mailtoLink = `mailto:${ADMIN_EMAIL}?subject=استفسار%20تاجر%20جديد&body=${encodeURIComponent(emailBody)}`;
  const whatsappLink = `https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent("مرحباً، أود الاستفسار عن عرض منتجاتي على منصتكم.")}`;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="lg">تواصل معنا الآن</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {isSuccess ? (
             <div className="py-6 text-center">
                <DialogHeader>
                    <DialogTitle className="text-2xl">تم استلام طلبك بنجاح!</DialogTitle>
                    <DialogDescription>
                        شكرًا لاهتمامك. سيقوم فريقنا بمراجعة طلبك والتواصل معك في أقرب وقت ممكن.
                    </DialogDescription>
                </DialogHeader>
                <div className="mt-6 space-y-4">
                    <p className="text-sm text-muted-foreground">يمكنك أيضاً التواصل معنا مباشرة:</p>
                    <div className="flex justify-center gap-4">
                        <Button variant="outline" asChild>
                            <a href={mailtoLink} target="_blank" rel="noopener noreferrer">
                                <Mail className="me-2"/> إرسال بريد إلكتروني
                            </a>
                        </Button>
                        <Button variant="outline" asChild>
                            <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                                <MessageCircle className="me-2"/> واتساب
                            </a>
                        </Button>
                    </div>
                </div>
                <DialogFooter className="mt-8">
                     <Button onClick={() => handleOpenChange(false)}>إغلاق</Button>
                </DialogFooter>
            </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>طلب لعرض منتجاتك</DialogTitle>
              <DialogDescription>
                املأ النموذج أدناه وسيقوم فريقنا بالتواصل معك في أقرب وقت ممكن.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="grid gap-4 py-4">
                <div className="space-y-1">
                    <Label htmlFor="name">الاسم</Label>
                    <Input id="name" {...register("name")} />
                    {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                </div>
                <div className="space-y-1">
                    <Label htmlFor="email">البريد الإلكتروني</Label>
                    <Input id="email" type="email" {...register("email")} />
                    {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                </div>
                <div className="space-y-1">
                    <Label htmlFor="phone">رقم الهاتف</Label>
                    <Input id="phone" type="tel" {...register("phone")} />
                    {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
                </div>
                <div className="space-y-1">
                    <Label htmlFor="companyName">اسم الشركة (اختياري)</Label>
                    <Input id="companyName" {...register("companyName")} />
                </div>
                 <div className="space-y-1">
                    <Label htmlFor="message">رسالة (صف منتجاتك)</Label>
                    <Textarea id="message" {...register("message")} />
                    {errors.message && <p className="text-sm text-destructive">{errors.message.message}</p>}
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">إلغاء</Button>
                </DialogClose>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                  {isSubmitting ? "جاري الإرسال..." : "إرسال الطلب"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
