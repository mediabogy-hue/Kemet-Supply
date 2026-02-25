"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import type { WithdrawalRequest } from "@/lib/types";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PaymentMethodIcon } from "./payment-icons";

interface WithdrawalDetailsDrawerProps {
    request: WithdrawalRequest | null;
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
}

const statusVariant: { [key: string]: "default" | "secondary" | "destructive" } = {
  Completed: "default",
  Pending: "secondary",
  Rejected: "destructive",
};

const statusText: { [key: string]: string } = {
  Completed: "مدفوع",
  Pending: "قيد الانتظار",
  Rejected: "مرفوض",
};

export function WithdrawalDetailsDrawer({ request, isOpen, onOpenChange }: WithdrawalDetailsDrawerProps) {
    const { toast } = useToast();

    const handleCopy = (text: string) => {
        const copyToClipboard = (textToCopy: string) => {
            if (navigator.clipboard && window.isSecureContext) {
                return navigator.clipboard.writeText(textToCopy);
            } else {
                const textArea = document.createElement("textarea");
                textArea.value = textToCopy;
                textArea.style.position = "fixed";
                textArea.style.top = "0";
                textArea.style.left = "-9999px";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                return new Promise<void>((res, rej) => {
                    try {
                        document.execCommand('copy') ? res() : rej(new Error('Copy command failed'));
                    } catch (err) {
                        rej(err);
                    } finally {
                        document.body.removeChild(textArea);
                    }
                });
            }
        };

        copyToClipboard(text).then(() => {
            toast({ title: "تم النسخ بنجاح!" });
        }).catch(err => {
            console.error("Failed to copy:", err);
            toast({
                variant: "destructive",
                title: "فشل النسخ",
                description: "لم نتمكن من نسخ النص تلقائيًا. الرجاء نسخه يدويًا.",
            });
        });
    };
    
    if (!request) return null;

    const isHighValue = request.amount >= 5000;

    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-md p-0">
                <SheetHeader className="p-6 border-b">
                    <SheetTitle className="text-xl">تفاصيل طلب السحب</SheetTitle>
                    <SheetDescription>
                        طلب رقم #{request.id.substring(0, 7).toUpperCase()}
                    </SheetDescription>
                </SheetHeader>
                <div className="p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">الحالة</span>
                        <Badge variant={statusVariant[request.status]}>
                            {statusText[request.status]}
                        </Badge>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                        <h4 className="font-semibold">معلومات المستخدم</h4>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">الاسم</span>
                            <span className="font-medium">{request.userName}</span>
                        </div>
                         <div className="flex justify-between">
                            <span className="text-muted-foreground">معرف المستخدم</span>
                            <span className="font-mono text-sm">{request.userId}</span>
                        </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                        <h4 className="font-semibold">تفاصيل المبلغ</h4>
                        <div className="flex justify-between items-baseline">
                            <span className="text-muted-foreground">المبلغ المطلوب</span>
                            <div className="flex items-center gap-2">
                                 {isHighValue && <Badge variant="destructive">مبلغ كبير</Badge>}
                                 <span className="font-bold text-2xl text-primary">{request.amount.toFixed(2)} ج.م</span>
                            </div>
                        </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                        <h4 className="font-semibold">بيانات الدفع</h4>
                         <div className="flex justify-between">
                            <span className="text-muted-foreground">طريقة الدفع</span>
                            <div className="flex items-center gap-2 font-medium">
                                <PaymentMethodIcon method={request.method} />
                                <span>{request.method}</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <span className="text-muted-foreground">بيانات الحساب</span>
                            <div className="flex items-center justify-between gap-2 p-3 rounded-md bg-muted">
                                <span className="font-mono text-sm break-all">{request.paymentIdentifier}</span>
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleCopy(request.paymentIdentifier)}>
                                    <Copy className="h-4 w-4"/>
                                </Button>
                            </div>
                        </div>
                    </div>

                    <Separator />

                     <div className="space-y-4">
                        <h4 className="font-semibold">السجل الزمني</h4>
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">تاريخ الطلب</span>
                            <span className="font-medium">
                                {request.createdAt && typeof request.createdAt.toDate === 'function' 
                                    ? format(request.createdAt.toDate(), "PPpp", {
                                          // Note: Add locale if you have it for Arabic date formatting
                                      }) 
                                    : 'N/A'}
                            </span>
                        </div>
                        {request.status !== 'Pending' && (
                             <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">آخر تحديث</span>
                                <span className="font-medium">
                                    {request.updatedAt && typeof request.updatedAt.toDate === 'function' 
                                        ? format(request.updatedAt.toDate(), "PPpp") 
                                        : 'N/A'}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
