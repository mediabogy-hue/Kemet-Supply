"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useUser, useAuth } from "@/firebase";
import type { UserProfile } from "@/lib/types";


const withdrawalSchema = z.object({
  amount: z.number().positive("المبلغ يجب أن يكون أكبر من صفر"),
  method: z.enum(["Vodafone Cash", "InstaPay", "Bank Transfer", "Telda"], {
    required_error: "الرجاء اختيار طريقة السحب",
  }),
});

type WithdrawalFormData = z.infer<typeof withdrawalSchema>;

interface WithdrawalDialogProps {
  availableBalance: number;
  userProfile: UserProfile | null;
}

export function WithdrawalDialog({ availableBalance, userProfile }: WithdrawalDialogProps) {
  const { user } = useUser();
  const auth = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<WithdrawalFormData>({
    resolver: zodResolver(withdrawalSchema.refine(
        (data) => data.amount <= availableBalance,
        {
          message: "المبلغ المطلوب أكبر من الرصيد المتاح للسحب",
          path: ["amount"],
        }
      )
    ),
  });

  const onSubmit = async (data: WithdrawalFormData) => {
    if (!user || !userProfile || !auth) {
      toast({ variant: "destructive", title: "خطأ", description: "المستخدم غير موجود أو المصادقة فشلت." });
      return;
    }

    let paymentIdentifier = '';
    switch(data.method) {
        case 'Vodafone Cash':
            paymentIdentifier = userProfile.paymentDetails?.vodafoneCash || '';
            break;
        case 'InstaPay':
            paymentIdentifier = userProfile.paymentDetails?.instaPay || '';
            break;
        case 'Bank Transfer':
            paymentIdentifier = userProfile.paymentDetails?.bankAccount || '';
            break;
        case 'Telda':
            paymentIdentifier = userProfile.paymentDetails?.telda || '';
            break;
    }

    if (!paymentIdentifier) {
        toast({
            variant: "destructive",
            title: "بيانات الدفع غير مكتملة",
            description: `الرجاء إدخال بيانات الدفع لطريقة "${data.method}" في ملفك الشخصي أولاً.`,
        });
        return;
    }
    
    try {
        const token = await user.getIdToken();
        const response = await fetch('/api/wallet/withdraw', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                amount: data.amount,
                method: data.method,
                paymentIdentifier: paymentIdentifier
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'فشل إرسال الطلب');
        }

        toast({ title: "تم إرسال طلب السحب بنجاح!" });
        reset();
        setIsOpen(false);

    } catch (error: any) {
        console.error("Withdrawal submission failed:", error);
        toast({
            variant: "destructive",
            title: "حدث خطأ",
            description: error.message || "لم نتمكن من إرسال طلب السحب.",
        });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button disabled={availableBalance <= 0 || !userProfile}>طلب سحب الأرباح</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>طلب سحب الأرباح</DialogTitle>
          <DialogDescription>
            الرصيد المتاح للسحب: {availableBalance.toFixed(2)} ج.م.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount">المبلغ (ج.م)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                {...register("amount", { valueAsNumber: true })}
              />
              {errors.amount && (
                <p className="text-sm text-destructive">{errors.amount.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>طريقة السحب</Label>
              <Controller
                name="method"
                control={control}
                render={({ field }) => (
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="grid grid-cols-2 gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Vodafone Cash" id="vodafone" />
                      <Label htmlFor="vodafone">فودافون كاش</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="InstaPay" id="instapay" />
                      <Label htmlFor="instapay">انستا باي</Label>
                    </div>
                     <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Bank Transfer" id="bank" />
                      <Label htmlFor="bank">تحويل بنكي</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Telda" id="telda" />
                      <Label htmlFor="telda">Telda</Label>
                    </div>
                  </RadioGroup>
                )}
              />
              {errors.method && (
                <p className="text-sm text-destructive">{errors.method.message}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">إلغاء</Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "جاري الإرسال..." : "إرسال الطلب"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}