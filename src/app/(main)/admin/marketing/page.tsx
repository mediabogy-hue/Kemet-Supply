
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminMerchantsPage() {
    
    return (
        <div className="space-y-6">
             <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">إدارة التجار</h1>
                    <p className="text-muted-foreground">تم إلغاء هذه الميزة. لإضافة تجار جدد، يمكنهم تقديم طلب من صفحة التسجيل.</p>
                </div>
            </div>

            <Card>
                 <CardHeader>
                    <CardTitle>ميزة ملغاة</CardTitle>
                    <CardDescription>
                       تم دمج إدارة التجار ضمن نظام المستخدمين العام. يمكن مراجعة طلبات انضمام التجار من صفحة "طلبات التجار".
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p>لا توجد بيانات لعرضها هنا.</p>
                </CardContent>
            </Card>
        </div>
    );
}
