
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { Order, Payment, UserProfile } from '@/lib/types';
import { useFirestore, errorEmitter, FirestorePermissionError, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc, serverTimestamp, collection, writeBatch } from "firebase/firestore";
import { Loader2 } from 'lucide-react';
import { useSession } from '@/auth/SessionProvider';

interface PaymentDialogProps {
  order: Order | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onPaymentSuccess: (orderId: string) => void;
}

export function PaymentDialog({ order, isOpen, onOpenChange, onPaymentSuccess }: PaymentDialogProps) {
  const firestore = useFirestore();
  const { profile: userProfile } = useSession();
  const { toast } = useToast();
  
  const [senderPhoneNumber, setSenderPhoneNumber] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Function to reset all state
  const resetAllState = () => {
    setSenderPhoneNumber('');
    setReferenceNumber('');
    setIsSubmitting(false);
  };
  
  useEffect(() => {
    if (!isOpen) {
      resetAllState();
    }
  }, [isOpen]);

  const handleSaveProof = async () => {
    if (!order || !userProfile || !firestore) {
        toast({ variant: "destructive", title: "بيانات غير مكتملة" });
        return;
    }
    if (!senderPhoneNumber || !referenceNumber) {
        toast({ variant: "destructive", title: "بيانات مطلوبة", description: "الرجاء إدخال رقم هاتف الراسل ورقم العملية." });
        return;
    }

    setIsSubmitting(true);

    const paymentId = doc(collection(firestore, 'id_generator')).id;
    const paymentDocRef = doc(firestore, `payments/${paymentId}`);
    
    const amountToPay = order.totalAmount - (order.totalCommission || 0);
    const dropshipperName = `${userProfile.firstName} ${userProfile.lastName}`.trim() || userProfile.email;

    const newPaymentData: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'> = {
        orderId: order.id,
        dropshipperId: userProfile.id,
        dropshipperName: dropshipperName,
        paymentMethodId: order.customerPaymentMethod,
        amount: amountToPay,
        status: 'Pending',
        senderPhoneNumber: senderPhoneNumber,
        referenceNumber: referenceNumber,
    };

    const orderDocRef = doc(firestore, `orders/${order.id}`);
    const batch = writeBatch(firestore);
    batch.set(paymentDocRef, { ...newPaymentData, id: paymentId, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    batch.update(orderDocRef, { customerPaymentStatus: 'Pending', updatedAt: serverTimestamp() });

    try {
        await batch.commit();
        onPaymentSuccess(order.id);
        toast({ title: "تم تسجيل بيانات الدفع بنجاح!" });
        onOpenChange(false);
    } catch (firestoreError: any) {
        console.error("Firestore write error:", firestoreError);
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: `payments/${paymentId}`,
            operation: 'create',
            requestResourceData: { orderId: order.id }
        }));
        toast({
            variant: 'destructive',
            title: "فشل حفظ بيانات الدفعة",
            description: "قد لا تملك الصلاحيات الكافية.",
        });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  if (!order) return null;

  const amountToPay = order.totalAmount - (order.totalCommission || 0);
  const orderIdShort = order.id.substring(0, 7).toUpperCase();

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>إثبات الدفع للطلب #{orderIdShort}</DialogTitle>
          <DialogDescription>
            لتأكيد طلبك، يرجى تحويل المبلغ المطلوب ثم إدخال بيانات التحويل.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className='space-y-2 p-4 rounded-lg bg-muted'>
            <Label>المبلغ المطلوب تحويله</Label>
            <p className="font-bold text-2xl text-primary">{amountToPay.toFixed(2)} ج.م</p>
            <p className="text-sm text-muted-foreground">هذه هي تكلفة المنتج التي يجب تحويلها للمنصة.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sender-phone">رقم هاتف الراسل</Label>
            <Input 
                id="sender-phone" 
                type="tel"
                placeholder="01xxxxxxxxx"
                value={senderPhoneNumber}
                onChange={(e) => setSenderPhoneNumber(e.target.value)}
                disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">الرقم الذي تم منه التحويل.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference-number">رقم العملية / الرقم المرجعي</Label>
            <Input 
                id="reference-number" 
                placeholder="أدخل رقم العملية أو الرقم المرجعي" 
                value={referenceNumber} 
                onChange={(e) => setReferenceNumber(e.target.value)} 
                disabled={isSubmitting}
            />
             <p className="text-xs text-muted-foreground">يساعدنا هذا الرقم في تأكيد دفعتك بشكل أسرع.</p>
          </div>
        </div>
        <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>إلغاء</Button>
            <Button onClick={handleSaveProof} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="me-2 h-4 w-4 animate-spin"/> : null}
              {isSubmitting ? 'جاري الحفظ...' : 'تأكيد'}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
