
"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import type { Order } from "@/lib/types";
import { Separator } from "@/components/ui/separator";
import { Copy, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface PaymentDetailsDrawerProps {
    order: Order | null;
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    onStatusUpdate: (order: Order, status: 'Verified' | 'Rejected') => void;
}

export function PaymentDetailsDrawer({ order, isOpen, onOpenChange, onStatusUpdate }: PaymentDetailsDrawerProps) {
    const { toast } = useToast();

    const handleCopy = (text: string | undefined) => {
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
            toast({ title: "تم النسخ بنجاح!" });
        }).catch(err => {
            toast({ variant: "destructive", title: "فشل النسخ" });
        });
    };
    
    if (!order) return null;

    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
                <SheetHeader className="p-6 border-b">
                    <SheetTitle className="text-xl">مراجعة إثبات الدفع</SheetTitle>
                    <SheetDescription>
                        للطلب رقم #{order.id.substring(0, 7).toUpperCase()}
                    </SheetDescription>
                </SheetHeader>
                <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                    <div className="space-y-4">
                        <h4 className="font-semibold">بيانات الدفع</h4>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">طريقة الدفع</span>
                            <Badge variant="secondary">{order.customerPaymentMethod}</Badge>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">المبلغ المطلوب</span>
                            <span className="font-bold text-lg text-primary">{order.totalAmount.toFixed(2)} ج.م</span>
                        </div>
                    </div>
                    <Separator />
                     <div className="space-y-4">
                        <h4 className="font-semibold">إثبات الدفع</h4>
                         <div className="space-y-2">
                            <Label>رقم هاتف المرسل</Label>
                             <div className="flex items-center justify-between gap-2 p-3 rounded-md bg-muted">
                                <span className="font-mono text-sm break-all">{order.customerPaymentProof?.senderPhoneNumber || 'لم يحدد'}</span>
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleCopy(order.customerPaymentProof?.senderPhoneNumber)}>
                                    <Copy className="h-4 w-4"/>
                                </Button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>رقم العملية المرجعي</Label>
                             <div className="flex items-center justify-between gap-2 p-3 rounded-md bg-muted">
                                <span className="font-mono text-sm break-all">{order.customerPaymentProof?.referenceNumber || 'لم يحدد'}</span>
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleCopy(order.customerPaymentProof?.referenceNumber)}>
                                    <Copy className="h-4 w-4"/>
                                </Button>
                            </div>
                        </div>
                    </div>
                    <Separator />
                    <div className="space-y-4">
                         <h4 className="font-semibold">بيانات العميل</h4>
                         <p><strong>الاسم:</strong> {order.customerName}</p>
                         <p><strong>الهاتف:</strong> {order.customerPhone}</p>
                         <p><strong>العنوان:</strong> {order.customerAddress}, {order.customerCity}</p>
                    </div>
                </div>
                <SheetFooter className="p-6 border-t bg-background">
                    <div className="flex w-full gap-4">
                        <Button variant="destructive" className="flex-1" onClick={() => onStatusUpdate(order, 'Rejected')}>
                            <XCircle className="me-2" />
                            رفض
                        </Button>
                        <Button className="flex-1" onClick={() => onStatusUpdate(order, 'Verified')}>
                            <CheckCircle className="me-2" />
                            تأكيد الدفع
                        </Button>
                    </div>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}

// Add Label component if it's not globally available in this scope.
const Label = (props: React.LabelHTMLAttributes<HTMLLabelElement>) => (
    <label className="text-sm font-medium text-muted-foreground" {...props} />
);
