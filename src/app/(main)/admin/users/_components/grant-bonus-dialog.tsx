
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useFirestore } from "@/firebase";
import { useSession } from "@/auth/SessionProvider";
import { doc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import type { UserProfile, Bonus } from "@/lib/types";


interface GrantBonusDialogProps {
    user: UserProfile | null;
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
}

export function GrantBonusDialog({ user, isOpen, onOpenChange }: GrantBonusDialogProps) {
  const firestore = useFirestore();
  const { user: adminUser, profile: adminProfile } = useSession();
  const { toast } = useToast();

  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
        setAmount("");
        setReason("");
    }
  }, [isOpen]);

  const handleGrantBonus = async () => {
    if (!user || !firestore || !adminUser || !adminProfile) return;

    const bonusAmount = parseFloat(amount);
    if (isNaN(bonusAmount) || bonusAmount === 0) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "الرجاء إدخال مبلغ صحيح (غير صفري).",
      });
      return;
    }
    if (!reason) {
         toast({ variant: "destructive", title: "خطأ", description: "الرجاء إدخال سبب المكافأة." });
         return;
    }

    setIsSubmitting(true);
    
    const bonusCollectionRef = collection(firestore, `users/${user.id}/bonuses`);
    const adminFullName = `${adminProfile.firstName} ${adminProfile.lastName}`.trim();
    
    const newBonusData: Omit<Bonus, 'id' | 'createdAt'> = {
        userId: user.id,
        amount: bonusAmount,
        reason,
        adminId: adminUser.uid,
        adminName: adminFullName || adminUser.email!,
    };

    addDoc(bonusCollectionRef, { ...newBonusData, createdAt: serverTimestamp() })
      .then(() => {
        toast({
          title: "تم منح المكافأة بنجاح!",
          description: `تم إضافة ${bonusAmount} ج.م إلى حساب ${user.firstName}.`
        });
        onOpenChange(false);
      })
      .catch((error: any) => {
        toast({
          variant: "destructive",
          title: "فشل منح المكافأة",
          description: "قد لا تملك الصلاحيات الكافية.",
        });
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };
  
  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>منح مكافأة / خصم</DialogTitle>
          <DialogDescription>
            إضافة رصيد إلى حساب {user.firstName} {user.lastName}. استخدم قيمة سالبة لإجراء خصم.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="bonus-amount">
              المبلغ (ج.م)
            </Label>
            <Input
              id="bonus-amount"
              type="number"
              placeholder="e.g., 100 or -50"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="col-span-3"
            />
          </div>
           <div className="space-y-2">
            <Label htmlFor="bonus-reason">
              السبب
            </Label>
            <Input
              id="bonus-reason"
              placeholder="e.g., مكافأة تحقيق الهدف الشهري"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button type="button" onClick={handleGrantBonus} disabled={isSubmitting}>
            {isSubmitting ? 'جاري الحفظ...' : 'حفظ'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
