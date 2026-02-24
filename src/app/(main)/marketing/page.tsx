
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Bot, Users, Mail, Settings, BarChart, ShoppingBag, Search, ShieldAlert, FileDown, CheckCircle, XCircle, Loader2, MoreHorizontal, Edit, Trash2, Play, Pause } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useFirestore, useCollection, useDoc, useMemoFirebase, errorEmitter, FirestorePermissionError } from "@/firebase";
import { collection, query, doc, orderBy, setDoc, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import type { ReferredCustomer, MarketingCampaign, AutomationSettings, UserProfile } from '@/lib/types';
import { useSession } from '@/auth/SessionProvider';
import { Skeleton, RefreshIndicator } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from '@/components/ui/textarea';
import { ClientRelativeTime } from '@/components/shared/client-relative-time';


const StatCard = ({ title, value, icon, isLoading }: { title: string; value: string | number; icon: React.ReactNode; isLoading: boolean }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            {icon}
        </CardHeader>
        <CardContent>
            {isLoading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{value}</div>}
        </CardContent>
    </Card>
);

const consentStatusText: { [key: string]: string } = {
  granted: "موافق",
  pending: "قيد الانتظار",
  denied: "مرفوض",
};

const consentStatusVariant: { [key: string]: "default" | "secondary" | "destructive" } = {
  granted: "default",
  pending: "secondary",
  denied: "destructive",
};

function MarketingDashboardTab({ customers, isLoading }: { customers: ReferredCustomer[] | null, isLoading: boolean }) {
    const stats = useMemo(() => {
        const leadsCount = customers?.length ?? 0;
        const purchasesCount = Math.floor(leadsCount * 0.27);
        const conversionRate = leadsCount > 0 ? (purchasesCount / leadsCount) * 100 : 0;
        
        return { leadsCount, purchasesCount, conversionRate };
    }, [customers]);

    return (
         <Card>
            <CardHeader>
                <CardTitle>لوحة تحكم التسويق</CardTitle>
                <CardDescription>نظرة عامة على أداء حملاتك التسويقية.</CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-3 gap-4">
                <StatCard title="عميل محتمل" value={stats.leadsCount} icon={<Users className="text-primary" />} isLoading={isLoading} />
                <StatCard title="عملية شراء" value={stats.purchasesCount} icon={<ShoppingBag className="text-primary" />} isLoading={isLoading} />
                <StatCard title="معدل التحويل" value={`${stats.conversionRate.toFixed(0)}%`} icon={<BarChart className="text-primary" />} isLoading={isLoading} />
            </CardContent>
        </Card>
    );
}

function CustomersTab({ customers, marketers, isLoading }: { customers: ReferredCustomer[] | null, marketers: UserProfile[] | null, isLoading: boolean }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');

    const marketersMap = useMemo(() => {
        const map = new Map<string, string>();
        if (marketers) {
            marketers.forEach(m => map.set(m.id, `${m.firstName} ${m.lastName}`.trim()));
        }
        return map;
    }, [marketers]);
    
    const filteredCustomers = useMemo(() => {
        if (!customers) return [];
        return customers.filter(c => 
            (searchTerm === '' || c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || c.contactId.includes(searchTerm)) &&
            (categoryFilter === 'all' || c.segment === categoryFilter)
        );
    }, [customers, searchTerm, categoryFilter]);
    
    const uniqueSegments = useMemo(() => {
        if (!customers) return [];
        return ['all', ...Array.from(new Set(customers.map(c => c.segment).filter(Boolean)))];
    }, [customers]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>قاعدة عملاء التسويق</CardTitle>
                <CardDescription>عرض وتصنيف العملاء الذين تفاعلوا عبر روابط المسوقين.</CardDescription>
                <div className="mt-4 flex flex-col md:flex-row gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="ابحث بالاسم أو رقم الهاتف..." className="pr-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-full md:w-[180px]">
                            <SelectValue placeholder="فلتر الفئة" />
                        </SelectTrigger>
                        <SelectContent>
                            {uniqueSegments.map(seg => <SelectItem key={seg} value={seg}>{seg === 'all' ? 'كل الفئات' : seg}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>العميل</TableHead>
                            <TableHead>المسوق</TableHead>
                            <TableHead>الفئة</TableHead>
                            <TableHead>القناة</TableHead>
                            <TableHead>آخر تفاعل</TableHead>
                            <TableHead>حالة الموافقة</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && Array.from({length: 3}).map((_, i) => <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-8 w-full"/></TableCell></TableRow>)}
                        {!isLoading && filteredCustomers.map(customer => (
                            <TableRow key={customer.id}>
                                <TableCell>{customer.name || customer.contactId}</TableCell>
                                <TableCell>{marketersMap.get(customer.referralMarketerId) || 'غير معروف'}</TableCell>
                                <TableCell><Badge variant="outline">{customer.segment}</Badge></TableCell>
                                <TableCell>{customer.channel}</TableCell>
                                <TableCell>
                                  <ClientRelativeTime date={customer.lastInteractionAt?.toDate()} />
                                </TableCell>
                                <TableCell>
                                    <Badge variant={consentStatusVariant[customer.consentStatus] || 'secondary'}>
                                        {consentStatusText[customer.consentStatus] || customer.consentStatus}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                         {!isLoading && filteredCustomers.length === 0 && (
                            <TableRow><TableCell colSpan={6} className="text-center py-8">لا يوجد عملاء لعرضهم.</TableCell></TableRow>
                         )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

const campaignSchema = z.object({
  name: z.string().min(3, "اسم الحملة مطلوب (3 أحرف على الأقل)"),
  targetSegment: z.string().min(2, "الفئة المستهدفة مطلوبة"),
  channel: z.enum(["whatsapp", "messenger", "instagram"]),
  messageTemplate: z.string().min(10, "محتوى الرسالة مطلوب (10 أحرف على الأقل)"),
});

type CampaignFormData = z.infer<typeof campaignSchema>;

function CampaignDialog({ open, onOpenChange, campaign: initialCampaign, onSave }: { open: boolean, onOpenChange: (open: boolean) => void, campaign: MarketingCampaign | null, onSave: (data: CampaignFormData, id?: string) => void }) {
    const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm<CampaignFormData>({
        resolver: zodResolver(campaignSchema),
    });

    useEffect(() => {
        if (initialCampaign) {
            reset({
                name: initialCampaign.name,
                targetSegment: initialCampaign.targetSegment,
                channel: initialCampaign.channel,
                messageTemplate: initialCampaign.messageTemplate
            });
        } else {
            reset({ name: '', targetSegment: '', channel: 'whatsapp', messageTemplate: '' });
        }
    }, [initialCampaign, reset]);

    const handleFormSubmit = (data: CampaignFormData) => {
        onSave(data, initialCampaign?.id);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{initialCampaign ? 'تعديل الحملة' : 'إنشاء حملة جديدة'}</DialogTitle>
                    <DialogDescription>
                        {initialCampaign ? 'تعديل تفاصيل حملتك التسويقية.' : 'إعداد حملة رسائل آلية جديدة لاستهداف شريحة معينة من العملاء.'}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 py-4">
                    <div className="space-y-1">
                        <Label htmlFor="name">اسم الحملة</Label>
                        <Input id="name" placeholder="مثال: حملة تخفيضات الإلكترونيات" {...register('name')} />
                        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="targetSegment">الفئة المستهدفة</Label>
                        <Input id="targetSegment" placeholder="مثال: electronics_interest" {...register('targetSegment')} />
                        {errors.targetSegment && <p className="text-sm text-destructive">{errors.targetSegment.message}</p>}
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="channel">القناة</Label>
                        <Controller
                            name="channel"
                            control={control}
                            render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger><SelectValue placeholder="اختر قناة الإرسال" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                                        <SelectItem value="messenger">Messenger</SelectItem>
                                        <SelectItem value="instagram">Instagram</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                        />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="messageTemplate">محتوى الرسالة</Label>
                        <Textarea id="messageTemplate" placeholder="مرحباً، لدينا عرض خاص على قسم الإلكترونيات..." {...register('messageTemplate')} rows={4} />
                        {errors.messageTemplate && <p className="text-sm text-destructive">{errors.messageTemplate.message}</p>}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>إلغاء</Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                            {isSubmitting ? 'جاري الحفظ...' : 'حفظ الحملة'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function CampaignsTab({ campaigns, isLoading }: { campaigns: MarketingCampaign[] | null, isLoading: boolean }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedCampaign, setSelectedCampaign] = useState<MarketingCampaign | null>(null);
    const [campaignToDelete, setCampaignToDelete] = useState<MarketingCampaign | null>(null);
     
    const campaignStatusText: { [key: string]: string } = { active: 'نشطة', draft: 'مسودة', paused: 'متوقفة', completed: 'مكتملة' };
    const campaignStatusVariant: { [key: string]: "default" | "secondary" | "outline" } = { active: 'default', draft: 'secondary', paused: 'outline', completed: 'outline' };

    const handleSaveCampaign = async (data: CampaignFormData, id?: string) => {
        if (!firestore) return;
        
        try {
            if (id) { // Editing existing campaign
                const campaignRef = doc(firestore, 'marketingCampaigns', id);
                await updateDoc(campaignRef, data);
                toast({ title: 'تم تحديث الحملة بنجاح!' });
            } else { // Creating new campaign
                await addDoc(collection(firestore, 'marketingCampaigns'), {
                    ...data,
                    status: 'draft',
                    createdAt: serverTimestamp(),
                });
                toast({ title: 'تم إنشاء الحملة بنجاح!' });
            }
            setIsDialogOpen(false);
        } catch (error) {
            console.error("Failed to save campaign:", error);
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: id ? `marketingCampaigns/${id}` : 'marketingCampaigns',
                operation: id ? 'update' : 'create',
                requestResourceData: data,
            }));
            toast({ variant: 'destructive', title: 'فشل حفظ الحملة' });
        }
    };
    
    const handleStatusToggle = async (campaign: MarketingCampaign) => {
        if (!firestore) return;
        const campaignRef = doc(firestore, 'marketingCampaigns', campaign.id);
        const newStatus = campaign.status === 'active' ? 'paused' : 'active';
        try {
            await updateDoc(campaignRef, { status: newStatus });
            toast({ title: `تم ${newStatus === 'active' ? 'تفعيل' : 'إيقاف'} الحملة` });
        } catch (error) {
             console.error("Failed to toggle status:", error);
             toast({ variant: 'destructive', title: 'فشل تحديث الحالة' });
        }
    };

    const handleDeleteCampaign = async () => {
        if (!firestore || !campaignToDelete) return;
        const campaignRef = doc(firestore, 'marketingCampaigns', campaignToDelete.id);
        try {
            await deleteDoc(campaignRef);
            toast({ title: 'تم حذف الحملة' });
            setCampaignToDelete(null);
        } catch (error) {
            console.error("Failed to delete campaign:", error);
            toast({ variant: 'destructive', title: 'فشل حذف الحملة' });
        }
    };

    return (
        <>
        <Card>
            <CardHeader className="flex flex-row justify-between items-center">
                <div>
                    <CardTitle>الحملات الآلية</CardTitle>
                    <CardDescription>إنشاء وإدارة حملات الرسائل الآلية.</CardDescription>
                </div>
                <Button onClick={() => { setSelectedCampaign(null); setIsDialogOpen(true); }}>إنشاء حملة جديدة</Button>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>اسم الحملة</TableHead>
                            <TableHead>القسم المستهدف</TableHead>
                            <TableHead>القناة</TableHead>
                            <TableHead>الحالة</TableHead>
                            <TableHead>الإجراءات</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                         {isLoading && Array.from({length: 2}).map((_, i) => <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-8 w-full"/></TableCell></TableRow>)}
                         {!isLoading && campaigns?.map(campaign => (
                            <TableRow key={campaign.id}>
                                <TableCell>{campaign.name}</TableCell>
                                <TableCell><Badge variant="outline">{campaign.targetSegment}</Badge></TableCell>
                                <TableCell>{campaign.channel}</TableCell>
                                <TableCell>
                                    <Badge variant={campaignStatusVariant[campaign.status] || 'secondary'}>
                                        {campaignStatusText[campaign.status] || campaign.status}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => { setSelectedCampaign(campaign); setIsDialogOpen(true); }}><Edit className="me-2 h-4 w-4" /> تعديل</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleStatusToggle(campaign)}>
                                                {campaign.status === 'active' ? <Pause className="me-2 h-4 w-4" /> : <Play className="me-2 h-4 w-4" />}
                                                {campaign.status === 'active' ? 'إيقاف مؤقت' : 'تفعيل'}
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem className="text-destructive" onClick={() => setCampaignToDelete(campaign)}><Trash2 className="me-2 h-4 w-4" /> حذف</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                        {!isLoading && (!campaigns || campaigns.length === 0) && (
                            <TableRow><TableCell colSpan={5} className="text-center py-8">لا توجد حملات لعرضها.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
        <CampaignDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} campaign={selectedCampaign} onSave={handleSaveCampaign} />
        <AlertDialog open={!!campaignToDelete} onOpenChange={() => setCampaignToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                    <AlertDialogDescription>سيتم حذف حملة "{campaignToDelete?.name}" نهائياً. لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteCampaign} className="bg-destructive hover:bg-destructive/90">نعم، قم بالحذف</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        </>
    );
}

function SettingsTab({ settings: initialSettings, isLoading }: { settings: AutomationSettings | null, isLoading: boolean }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [settings, setSettings] = useState<Partial<AutomationSettings>>(initialSettings || {});

    useEffect(() => {
        if (initialSettings) {
            setSettings(initialSettings);
        }
    }, [initialSettings]);

    const handleSave = async () => {
        if (!firestore) {
            toast({ variant: 'destructive', title: 'خطأ', description: 'خدمات Firebase غير متاحة.' });
            return;
        }

        setIsSubmitting(true);
        const settingsRef = doc(firestore, 'automationSettings', 'main');

        try {
            await setDoc(settingsRef, settings, { merge: true });
            toast({ title: 'تم حفظ الإعدادات بنجاح!' });
        } catch (error) {
            console.error("Failed to save settings:", error);
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: settingsRef.path,
                operation: 'update',
                requestResourceData: settings,
            }));
            toast({ variant: 'destructive', title: 'فشل حفظ الإعدادات', description: 'قد لا تملك الصلاحيات الكافية.' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleFieldChange = (field: keyof AutomationSettings | `antiSpam.${keyof NonNullable<AutomationSettings['antiSpam']>}` | `triggers.${keyof NonNullable<AutomationSettings['triggers']>}`, value: any) => {
        setSettings(prev => {
            const newState = { ...prev };
            const keys = field.split('.');
            if (keys.length === 2) {
                const [parent, child] = keys as [keyof AutomationSettings, string];
                // @ts-ignore
                newState[parent] = { ...newState[parent], [child]: value };
            } else {
                // @ts-ignore
                newState[field] = value;
            }
            return newState;
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>إعدادات التكامل</CardTitle>
                 <CardDescription>ربط حسابات Meta Business وتحديد قواعد إرسال الرسائل.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {isLoading ? <Skeleton className="h-48 w-full" /> : (
                    <>
                        <div className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <Label htmlFor="automation-enabled" className="text-base font-medium">تفعيل النظام الآلي</Label>
                                <p className="text-sm text-muted-foreground">تشغيل أو إيقاف جميع عمليات إرسال الرسائل الآلية.</p>
                            </div>
                            <Switch id="automation-enabled" checked={settings?.enabled} onCheckedChange={(val) => handleFieldChange('enabled', val)} disabled={isSubmitting}/>
                        </div>
                        <Card>
                            <CardHeader><CardTitle className="text-base">قواعد منع الإزعاج</CardTitle></CardHeader>
                            <CardContent className="grid sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label>أقصى عدد رسائل يوميًا للعميل</Label>
                                    <Input type="number" value={settings?.antiSpam?.maxPerDayPerUser ?? ''} onChange={e => handleFieldChange('antiSpam.maxPerDayPerUser', Number(e.target.value))} disabled={isSubmitting}/>
                                </div>
                                <div className="space-y-1">
                                    <Label>أقل فاصل زمني بين الرسائل (دقائق)</Label>
                                    <Input type="number" value={settings?.antiSpam?.minMinutesBetweenMessages ?? ''} onChange={e => handleFieldChange('antiSpam.minMinutesBetweenMessages', Number(e.target.value))} disabled={isSubmitting}/>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle className="text-base">تفعيل المشغلات (Triggers)</CardTitle></CardHeader>
                            <CardContent className="space-y-3">
                                 <div className="flex items-center justify-between"><Label htmlFor="inquiry-followup">متابعة الاستفسارات</Label><Switch id="inquiry-followup" checked={settings?.triggers?.inquiryFollowUp} onCheckedChange={(val) => handleFieldChange('triggers.inquiryFollowUp', val)} disabled={isSubmitting}/></div>
                                 <div className="flex items-center justify-between"><Label htmlFor="abandoned-checkout">تذكير السلة المتروكة</Label><Switch id="abandoned-checkout" checked={settings?.triggers?.abandonedCheckout} onCheckedChange={(val) => handleFieldChange('triggers.abandonedCheckout', val)} disabled={isSubmitting}/></div>
                                 <div className="flex items-center justify-between"><Label htmlFor="order-confirmation">إرسال تأكيد الطلب</Label><Switch id="order-confirmation" checked={settings?.triggers?.orderConfirmation} onCheckedChange={(val) => handleFieldChange('triggers.orderConfirmation', val)} disabled={isSubmitting}/></div>
                                 <div className="flex items-center justify-between"><Label htmlFor="shipping-updates">إرسال تحديثات الشحن</Label><Switch id="shipping-updates" checked={settings?.triggers?.shippingUpdates} onCheckedChange={(val) => handleFieldChange('triggers.shippingUpdates', val)} disabled={isSubmitting}/></div>
                            </CardContent>
                        </Card>
                        <div className="flex justify-end">
                            <Button onClick={handleSave} disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {isSubmitting ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
                            </Button>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}

export default function MarketingPage() {
    const { isAdmin, isLoading: isRoleLoading } = useSession();
    const firestore = useFirestore();

    const customersQuery = useMemoFirebase(() => (firestore && isAdmin) ? query(collection(firestore, 'marketingCustomers'), orderBy('createdAt', 'desc')) : null, [firestore, isAdmin]);
    const { data: customers, isLoading: customersLoading, lastUpdated: customersLastUpdated } = useCollection<ReferredCustomer>(customersQuery);
    
    const campaignsQuery = useMemoFirebase(() => (firestore && isAdmin) ? query(collection(firestore, 'marketingCampaigns'), orderBy('createdAt', 'desc')) : null, [firestore, isAdmin]);
    const { data: campaigns, isLoading: campaignsLoading, lastUpdated: campaignsLastUpdated } = useCollection<MarketingCampaign>(campaignsQuery);

    const marketersQuery = useMemoFirebase(() => (firestore && isAdmin) ? collection(firestore, 'users') : null, [firestore, isAdmin]);
    const { data: marketers, isLoading: marketersLoading } = useCollection<UserProfile>(marketersQuery);
    
    const settingsDoc = useMemoFirebase(() => (firestore && isAdmin) ? doc(firestore, 'automationSettings', 'main') : null, [firestore, isAdmin]);
    const { data: settings, isLoading: settingsLoading } = useDoc<AutomationSettings>(settingsDoc);

    const isLoading = isRoleLoading || customersLoading || campaignsLoading || settingsLoading || marketersLoading;

    if (!isRoleLoading && !isAdmin) {
        return (
            <Card>
                <CardHeader><CardTitle>غير مصرح بالدخول</CardTitle></CardHeader>
                <CardContent>
                    <Alert variant="destructive">
                        <ShieldAlert className="h-4 w-4" />
                        <AlertTitle>ليس لديك الصلاحية!</AlertTitle>
                        <AlertDescription>عفواً، ليس لديك الصلاحيات اللازمة للوصول إلى هذه الصفحة.</AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">التسويق الآلي</h1>
                <p className="text-muted-foreground">إدارة حملات التسويق والتواصل مع العملاء القادمين عبر المسوقين.</p>
            </div>
            
             <Alert>
                <Bot className="h-4 w-4" />
                <AlertTitle>تحت الإنشاء</AlertTitle>
                <AlertDescription>
                    هذه الصفحة هي واجهة النظام الآلي التسويقي. سيتم ملء البيانات وتوصيل الوظائف لاحقًا.
                </AlertDescription>
            </Alert>

            <Tabs defaultValue="dashboard" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="dashboard">لوحة التحكم</TabsTrigger>
                    <TabsTrigger value="customers">العملاء</TabsTrigger>
                    <TabsTrigger value="campaigns">الحملات</TabsTrigger>
                    <TabsTrigger value="settings">الإعدادات</TabsTrigger>
                </TabsList>
                <TabsContent value="dashboard" className="mt-6">
                     <MarketingDashboardTab customers={customers} isLoading={isLoading} />
                </TabsContent>
                <TabsContent value="customers" className="mt-6">
                    <CustomersTab customers={customers} marketers={marketers} isLoading={isLoading} />
                </TabsContent>
                <TabsContent value="campaigns" className="mt-6">
                     <CampaignsTab campaigns={campaigns} isLoading={isLoading} />
                </TabsContent>
                <TabsContent value="settings" className="mt-6">
                    <SettingsTab settings={settings} isLoading={isLoading} />
                </TabsContent>
            </Tabs>
        </div>
    );
}

    
