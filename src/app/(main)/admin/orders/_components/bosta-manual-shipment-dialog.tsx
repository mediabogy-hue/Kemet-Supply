
'use client';

import { useEffect, useState } from 'react';
import type { Order } from '@/lib/types';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { doc, collection, writeBatch, serverTimestamp } from 'firebase/firestore';
import { Link as LinkIcon, Loader2, ExternalLink, Copy, FileWarning } from 'lucide-react';
import { cn } from '@/lib/utils';


export function BostaManualShipmentDialog({ order, link, isOpen, onOpenChange, onShipmentCreated }: { order: Order | null; link: string; isOpen: boolean; onOpenChange: (open: boolean) => void; onShipmentCreated?: () => void; }) {
    const { firestore, user } = useFirebase();
    const { toast } = useToast();
    const [trackingNumber, setTrackingNumber] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // New state for iframe loading
    const [iframeState, setIframeState] = useState<'loading' | 'loaded' | 'failed'>('loading');

    useEffect(() => {
        if (isOpen) {
            setIframeState('loading');
            const timer = setTimeout(() => {
                setIframeState(currentState => currentState === 'loading' ? 'failed' : currentState);
            }, 3000); // 3-second timeout

            return () => clearTimeout(timer);
        } else {
            // Reset form when dialog closes
            setTrackingNumber("");
        }
    }, [isOpen]);
    
    const handleIframeLoad = () => {
        setIframeState('loaded');
    };

    const handleCopyLink = () => {
        if (!link) return;
        navigator.clipboard.writeText(link);
        toast({ title: "تم نسخ الرابط بنجاح!" });
    };

    const handleLinkShipment = async () => {
        if (!firestore || !user || !order || !trackingNumber) {
            toast({ variant: "destructive", title: "بيانات ناقصة", description: "الرجاء إدخال رقم التتبع." });
            return;
        }
        setIsSubmitting(true);
        const shipmentRef = doc(collection(firestore, "shipments"));
        const newShipmentData = {
            id: shipmentRef.id,
            orderId: order.id,
            dropshipperId: order.dropshipperId,
            carrier: 'Bosta',
            bostaTrackingNumber: trackingNumber,
            bostaShipmentId: 'manual-' + trackingNumber, // Manual entry
            status: 'CREATED',
            codAmount: order.totalAmount,
            labelUrl: '', // No label URL for manual entry
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdBy: user.uid,
        };

        const orderRef = doc(firestore, `orders/${order.id}`);
        
        const batch = writeBatch(firestore);
        batch.set(shipmentRef, newShipmentData);
        batch.update(orderRef, { status: 'Ready to Ship', updatedAt: serverTimestamp() });
        
        try {
            await batch.commit();
            toast({ title: 'تم ربط الشحنة بنجاح!' });
            onShipmentCreated?.();
            onOpenChange(false);
        } catch (e) {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: shipmentRef.path,
                operation: 'create',
                requestResourceData: newShipmentData,
            }));
            toast({ variant: "destructive", title: "فشل ربط الشحنة" });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!order) {
        return null;
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-4xl h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>إنشاء شحنة للطلب #{order.id.substring(0, 7).toUpperCase()}</DialogTitle>
                    <DialogDescription>
                        افتح موقع بوسطة لإنشاء الشحنة ثم قم بربطها بالطلب هنا.
                    </DialogDescription>
                </DialogHeader>

                {/* Top action bar */}
                <div className="flex items-center gap-2 border-b pb-4">
                     <div className="text-sm space-y-1 p-3 rounded-md border bg-background flex-1">
                        <p><strong>العميل:</strong> {order.customerName} | <strong>الهاتف:</strong> {order.customerPhone}</p>
                        <p><strong>العنوان:</strong> {order.customerAddress}, {order.customerCity} | <strong>مبلغ التحصيل:</strong> {order.totalAmount.toFixed(2)} ج.م</p>
                    </div>
                    <Button asChild>
                        <a href={link} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="me-2 h-4 w-4" />
                            فتح رابط بوسطة
                        </a>
                    </Button>
                </div>
                
                {/* Iframe section */}
                <div className="flex-1 border rounded-lg overflow-hidden relative">
                    {(iframeState === 'loading' || iframeState === 'failed') && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-muted text-center z-10">
                            {iframeState === 'loading' && <Loader2 className="h-8 w-8 animate-spin text-primary" />}
                            {iframeState === 'failed' && (
                                <>
                                    <FileWarning className="h-10 w-10 text-destructive mb-4" />
                                    <h3 className="font-semibold text-lg">لم نتمكن من تحميل الصفحة هنا</h3>
                                    <p className="text-muted-foreground text-sm max-w-sm mt-1">
                                        يبدو أن موقع بوسطة يمنع عرضه في صفحة مضمنة. الرجاء استخدام الزر لفتحه في تبويب جديد.
                                    </p>
                                    <div className="mt-6 flex gap-4">
                                         <Button asChild>
                                            <a href={link} target="_blank" rel="noopener noreferrer">
                                                <ExternalLink className="me-2 h-4 w-4" />
                                                فتح في تبويب جديد
                                            </a>
                                        </Button>
                                        <Button variant="secondary" onClick={handleCopyLink}>
                                            <Copy className="me-2 h-4 w-4" />
                                            نسخ الرابط
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                    <iframe
                        src={link}
                        title="Bosta Shipment Creation"
                        className={cn("w-full h-full border-0", iframeState !== 'loaded' && 'invisible')} // use invisible to let it load in background
                        onLoad={handleIframeLoad}
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                    />
                </div>

                {/* Bottom tracking input */}
                <div className="pt-4 border-t">
                    <Label htmlFor="tracking-number" className="text-base font-semibold">ربط الشحنة</Label>
                    <p className="text-sm text-muted-foreground mb-2">بعد إنشاء الشحنة على موقع بوسطة، الصق رقم التتبع هنا.</p>
                    <div className="flex gap-2">
                        <Input 
                            id="tracking-number"
                            value={trackingNumber} 
                            onChange={e => setTrackingNumber(e.target.value)} 
                            placeholder="أدخل رقم التتبع من بوسطة..."
                            disabled={isSubmitting}
                            className="h-11 text-base"
                        />
                        <Button onClick={handleLinkShipment} disabled={!trackingNumber || isSubmitting} className="h-11">
                            {isSubmitting ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <LinkIcon className="me-2 h-4 w-4" />}
                            ربط الشحنة
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

    