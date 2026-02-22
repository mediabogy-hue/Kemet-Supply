
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useFirestore, useUser, useCollection, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, doc, setDoc, serverTimestamp, writeBatch, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Skeleton, RefreshIndicator } from "@/components/ui/skeleton";
import { Banknote, Wallet as WalletIcon, Bot, ShieldAlert, Save, Loader2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { useSession } from '@/auth/SessionProvider';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';


const VodafoneCashLogo = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM10.5 16.5C8.02 16.5 6 14.48 6 12C6 9.52 8.02 7.5 10.5 7.5C11.4 7.5 12.22 7.8 12.9 8.3L11.4 9.8C11.14 9.6 10.84 9.5 10.5 9.5C9.12 9.5 8 10.62 8 12C8 13.38 9.12 14.5 10.5 14.5C11.98 14.5 13.12 13.36 13.12 11.9H10.5V10.4H14.5V12C14.5 14.48 12.48 16.5 10.5 16.5Z" fill="#E60000"/>
  </svg>
);

const InstaPayLogo = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" fill="#00A99D"/>
    <path d="M10.5 9.5H12V16H10.5V9.5ZM12 7C12 7.55 11.55 8 11 8C10.45 8 10 7.55 10 7C10 6.45 10.45 6 11 6C11.55 6 12 6.45 12 7Z" fill="white"/>
    <path d="M14.5 9.5C15.88 9.5 17 10.62 17 12C17 13.38 15.88 14.5 14.5 14.5C13.12 14.5 12 13.38 12 12C12 10.62 13.12 9.5 14.5 9.5ZM14.5 11C13.95 11 13.5 11.45 13.5 12C13.5 12.55 13.95 13 14.5 13C15.05 13 15.5 12.55 15.5 12C15.5 11.45 15.05 11 14.5 11Z" fill="white"/>
  </svg>
);

export default function AdminSettingsPage() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const { user } = useUser();
    const { isAdmin, isLoading: isRoleLoading } = useSession();

    const canAccess = !isRoleLoading && isAdmin;

    const settingsQuery = useMemoFirebase(() => {
        if (!firestore || !user || !canAccess) return null;
        return collection(firestore, 'systemSettings')
    }, [firestore, user, canAccess]);
    
    const { data: settingsData, isLoading, lastUpdated } = useCollection(settingsQuery);

    const settingsMap = useMemo(() => {
        if (!settingsData) return new Map();
        return new Map(settingsData.map((s: any) => [s.id, s.settingValue]));
    }, [settingsData]);


    const [isSaving, setIsSaving] = useState(false);

    // State for payment methods
    const [vodafoneCashNumber, setVodafoneCashNumber] = useState('');
    const [vodafoneCashEnabled, setVodafoneCashEnabled] = useState(false);
    const [instapayHandle, setInstapayHandle] = useState('');
    const [instapayEnabled, setInstapayEnabled] = useState(false);
    const [bankDetails, setBankDetails] = useState('');
    const [bankTransferEnabled, setBankTransferEnabled] = useState(false);
    const [teldaHandle, setTeldaHandle] = useState('');
    const [teldaEnabled, setTeldaEnabled] = useState(false);
    
    // State for whatsapp bot
    const [whatsappBotEnabled, setWhatsappBotEnabled] = useState(false);
    const [whatsappPhoneNumberId, setWhatsappPhoneNumberId] = useState('');
    const [whatsappAccessToken, setWhatsappAccessToken] = useState('');
    const [whatsappSystemPrompt, setWhatsappSystemPrompt] = useState('');
    
    const finalIsLoading = isLoading || isRoleLoading;

    useEffect(() => {
        if (settingsData) {
            const getSetting = (key: string, defaultValue: string = '') => settingsData.find((s: any) => s.id === key)?.settingValue ?? defaultValue;

            setVodafoneCashNumber(getSetting('payment_vodafone_cash_number', '201062292012'));
            setVodafoneCashEnabled(getSetting('payment_vodafone_cash_enabled') === 'true');
            setInstapayHandle(getSetting('payment_instapay_handle'));
            setInstapayEnabled(getSetting('payment_instapay_enabled') === 'true');
            setBankDetails(getSetting('payment_bank_transfer_details'));
            setBankTransferEnabled(getSetting('payment_bank_transfer_enabled') === 'true');
            setTeldaHandle(getSetting('payment_telda_handle'));
            setTeldaEnabled(getSetting('payment_telda_enabled') === 'true');

            setWhatsappBotEnabled(getSetting('whatsapp_bot_enabled') === 'true');
            setWhatsappPhoneNumberId(getSetting('whatsapp_phone_number_id'));
            setWhatsappAccessToken(getSetting('whatsapp_access_token'));
            setWhatsappSystemPrompt(getSetting('whatsapp_system_prompt', 'أنت مساعد مفيد لـ KEMET SUPPLY. أجب على أسئلة العملاء حول المنتجات والطلبات.'));
        }
    }, [settingsData]);


    const handleSavePaymentSettings = async () => {
        if (!firestore) {
            toast({ variant: 'destructive', title: 'خطأ', description: 'لم يتم تهيئة قاعدة البيانات.' });
            return;
        }
        setIsSaving(true);
        try {
            const settingsToSave = [
                { key: 'payment_vodafone_cash_number', value: vodafoneCashNumber },
                { key: 'payment_vodafone_cash_enabled', value: vodafoneCashEnabled },
                { key: 'payment_instapay_handle', value: instapayHandle },
                { key: 'payment_instapay_enabled', value: instapayEnabled },
                { key: 'payment_bank_transfer_details', value: bankDetails },
                { key: 'payment_bank_transfer_enabled', value: bankTransferEnabled },
                { key: 'payment_telda_handle', value: teldaHandle },
                { key: 'payment_telda_enabled', value: teldaEnabled },
            ];

            const batch = writeBatch(firestore);
            const publicSettingsPayload: Record<string, any> = {};

            for (const setting of settingsToSave) {
                const systemSettingRef = doc(firestore, 'systemSettings', setting.key);
                batch.set(systemSettingRef, {
                    settingKey: setting.key,
                    settingValue: String(setting.value),
                    updatedAt: serverTimestamp(),
                }, { merge: true });

                publicSettingsPayload[setting.key] = setting.value;
            }

            const publicSettingsDocRef = doc(firestore, 'publicSettings', 'data');
            batch.set(publicSettingsDocRef, {
                ...publicSettingsPayload,
                updatedAt: serverTimestamp(),
            }, { merge: true });

            await batch.commit();

            toast({ title: 'تم حفظ إعدادات الدفع بنجاح!' });
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'خطأ', description: 'فشل حفظ الإعدادات.' });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleSaveWhatsappSettings = async () => {
        if (!firestore) {
            toast({ variant: 'destructive', title: 'خطأ', description: 'لم يتم تهيئة قاعدة البيانات.' });
            return;
        }
        setIsSaving(true);
        try {
            const settingsToSave = [
                { key: 'whatsapp_bot_enabled', value: String(whatsappBotEnabled) },
                { key: 'whatsapp_phone_number_id', value: whatsappPhoneNumberId },
                { key: 'whatsapp_access_token', value: whatsappAccessToken },
                { key: 'whatsapp_system_prompt', value: whatsappSystemPrompt },
            ];

            const batch = writeBatch(firestore);
            for (const setting of settingsToSave) {
                const settingRef = doc(firestore, 'systemSettings', setting.key)
                batch.set(settingRef, {
                    settingKey: setting.key,
                    settingValue: setting.value,
                    updatedAt: serverTimestamp(),
                }, { merge: true });
            }
            await batch.commit();

            toast({ title: 'تم حفظ إعدادات بوت الواتساب بنجاح!' });
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'خطأ', description: 'فشل حفظ إعدادات البوت.' });
        } finally {
            setIsSaving(false);
        }
    };

    if (finalIsLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-12 w-full" />
                <Card>
                    <CardHeader>
                        <Skeleton className="h-8 w-1/2" />
                        <Skeleton className="h-4 w-3/4" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-48 w-full" />
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (!canAccess) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>غير مصرح بالدخول</CardTitle>
                </CardHeader>
                <CardContent>
                    <Alert variant="destructive">
                        <ShieldAlert className="h-4 w-4" />
                        <AlertTitle>ليس لديك الصلاحية!</AlertTitle>
                        <AlertDescription>
                            عفواً، ليس لديك الصلاحيات اللازمة للوصول إلى هذه الصفحة. هذه الصفحة مخصصة للأدمن فقط.
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        )
    }

    const renderPaymentSettings = () => {
        if (isLoading) {
            return (
                <>
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </>
            );
        }
        return (
            <>
                <div className="space-y-4 rounded-md border p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                        <VodafoneCashLogo />
                        <h3 className="font-semibold">Vodafone Cash</h3>
                        </div>
                        <Switch checked={vodafoneCashEnabled} onCheckedChange={setVodafoneCashEnabled} />
                    </div>
                    {vodafoneCashEnabled && <div className="space-y-2">
                        <Label htmlFor="vodafone-cash">رقم/معرّف الدفع</Label>
                        <Input id="vodafone-cash" value={vodafoneCashNumber} onChange={(e) => setVodafoneCashNumber(e.target.value)} />
                    </div>}
                </div>
                <div className="space-y-4 rounded-md border p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                        <InstaPayLogo />
                        <h3 className="font-semibold">InstaPay</h3>
                        </div>
                        <Switch checked={instapayEnabled} onCheckedChange={setInstapayEnabled} />
                    </div>
                    {instapayEnabled && <div className="space-y-2">
                        <Label htmlFor="instapay">معرّف الدفع</Label>
                        <Input id="instapay" value={instapayHandle} onChange={(e) => setInstapayHandle(e.target.value)} />
                    </div>}
                </div>
                <div className="space-y-4 rounded-md border p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                        <Banknote className="h-6 w-6" />
                        <h3 className="font-semibold">Bank Transfer</h3>
                        </div>
                        <Switch checked={bankTransferEnabled} onCheckedChange={setBankTransferEnabled} />
                    </div>
                    {bankTransferEnabled && <div className="space-y-2">
                        <Label htmlFor="bank-transfer">تفاصيل الحساب</Label>
                        <Input id="bank-transfer" value={bankDetails} onChange={(e) => setBankDetails(e.target.value)} />
                    </div>}
                </div>
                <div className="space-y-4 rounded-md border p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                        <WalletIcon className="h-6 w-6" />
                        <h3 className="font-semibold">Telda</h3>
                        </div>
                        <Switch checked={teldaEnabled} onCheckedChange={setTeldaEnabled} />
                    </div>
                    {teldaEnabled && <div className="space-y-2">
                        <Label htmlFor="telda">معرّف الدفع</Label>
                        <Input id="telda" value={teldaHandle} onChange={(e) => setTeldaHandle(e.target.value)} />
                    </div>}
                </div>
                <Button onClick={handleSavePaymentSettings} disabled={isSaving || isLoading}>
                    {isSaving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                </Button>
            </>
        )
    }
    
    const renderWhatsappSettings = () => {
        if (isLoading) {
            return (
                 <div className="space-y-4">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-10 w-32" />
                </div>
            );
        }
        return (
            <div className="space-y-4">
                 <div className="flex items-center justify-between rounded-md border p-4">
                    <div className="space-y-1">
                        <h3 className="font-semibold">تفعيل البوت</h3>
                        <p className="text-sm text-muted-foreground">تفعيل أو إيقاف الرد التلقائي على رسائل الواتساب.</p>
                    </div>
                    <Switch checked={whatsappBotEnabled} onCheckedChange={setWhatsappBotEnabled} />
                </div>
                {whatsappBotEnabled && (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="whatsapp-phone-id">Phone Number ID</Label>
                            <Input id="whatsapp-phone-id" value={whatsappPhoneNumberId} onChange={(e) => setWhatsappPhoneNumberId(e.target.value)} placeholder="e.g., 102030405060708" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="whatsapp-token">Access Token</Label>
                            <Input type="password" id="whatsapp-token" value={whatsappAccessToken} onChange={(e) => setWhatsappAccessToken(e.target.value)} placeholder="ادخل التوكن الدائم الخاص بك" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="whatsapp-prompt">تعليمات البوت (System Prompt)</Label>
                            <Textarea id="whatsapp-prompt" value={whatsappSystemPrompt} onChange={(e) => setWhatsappSystemPrompt(e.target.value)} rows={5} placeholder="مثال: أنت مساعد مفيد لمتجر... رد على استفسارات العملاء بخصوص المنتجات والطلبات."/>
                             <p className="text-xs text-muted-foreground">
                                هذه هي التعليمات الأساسية التي سيتبعها الذكاء الاصطناعي عند الرد.
                            </p>
                        </div>
                    </div>
                )}
                <Button onClick={handleSaveWhatsappSettings} disabled={isSaving || isLoading}>
                    {isSaving ? 'جاري الحفظ...' : 'حفظ إعدادات البوت'}
                </Button>
            </div>
        )
    }

    return (
    <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">إعدادات النظام</h1>
            <RefreshIndicator isLoading={finalIsLoading} lastUpdated={lastUpdated} />
        </div>
      <Tabs defaultValue="payments">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="payments">وسائل الدفع</TabsTrigger>
          <TabsTrigger value="general">إعدادات عامة</TabsTrigger>
          <TabsTrigger value="whatsapp">بوت الواتساب</TabsTrigger>
        </TabsList>
        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>إدارة وسائل الدفع</CardTitle>
              <CardDescription>تفعيل وتعديل وسائل الدفع المتاحة في النظام لاستقبال المدفوعات من المسوقين.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {renderPaymentSettings()}
            </CardContent>
          </Card>
        </TabsContent>
         <TabsContent value="whatsapp">
          <Card>
            <CardHeader>
              <CardTitle>إعدادات بوت الواتساب</CardTitle>
              <CardDescription>
                قم بتوصيل حساب واتساب للأعمال واستخدم الذكاء الاصطناعي للرد على استفسارات العملاء تلقائياً.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {renderWhatsappSettings()}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>الإعدادات العامة</CardTitle>
              <CardDescription>إدارة الإعدادات العامة للمنصة.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="app-name">اسم الموقع</Label>
                <Input id="app-name" defaultValue="KEMET SUPPLY" />
              </div>
              <div className="space-y-2">
                <Label>شعار الموقع</Label>
                <Input type="file" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="support-email">بريد الدعم الفني</Label>
                <Input id="support-email" type="email" defaultValue="support@kemetsupply.com" />
              </div>
              <Button>حفظ الإعدادات</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
