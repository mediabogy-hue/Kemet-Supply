
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Wallet, RefreshCcw, AlertTriangle } from "lucide-react";

export default function PoliciesPage() {
  return (
    <div className="flex flex-col gap-8">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">سياسات وأحكام السحب</h1>
            <p className="text-muted-foreground">آخر تحديث: 1 يوليو 2024</p>
        </div>

        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-6 w-6 text-primary"/>
                    مواعيد سحب العمولة
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
                <p>
                    يتم معالجة طلبات سحب العمولات والأرباح بشكل أسبوعي. يمكنك تقديم طلب السحب في أي وقت خلال الأسبوع.
                </p>
                <ul className="list-disc pe-6 space-y-2">
                    <li>يتم إغلاق باب استقبال طلبات السحب يوم **الخميس** الساعة 12:00 ظهرًا بتوقيت القاهرة.</li>
                    <li>تتم مراجعة ومعالجة جميع الطلبات التي تم تقديمها قبل هذا الموعد خلال يومي **السبت والأحد**.</li>
                    <li>يتم تحويل المبالغ إلى حساباتكم بحد أقصى يوم **الاثنين** من كل أسبوع.</li>
                    <li>أي طلب يتم تقديمه بعد ظهر يوم الخميس سيتم ترحيله إلى دورة السحب للأسبوع التالي.</li>
                </ul>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-6 w-6 text-primary"/>
                    طرق السحب
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
                <p>لضمان سلاسة العمليات المالية، نطبق السياسات التالية:</p>
                 <ul className="list-disc pe-6 space-y-2">
                    <li>يجب أن يكون الرصيد في "الرصيد القابل للسحب" لتتمكن من تقديم طلب.</li>
                    <li>طرق السحب المتاحة حاليًا هي: **فودافون كاش** و **انستا باي**.</li>
                    <li>يرجى التأكد من صحة بيانات حساب السحب الخاصة بك في صفحة ملفك الشخصي لتجنب أي تأخير في التحويل. المنصة غير مسؤولة عن أي أخطاء ناتجة عن بيانات غير صحيحة.</li>
                </ul>
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <RefreshCcw className="h-6 w-6 text-primary"/>
                    سياسة الأرباح والطلبات المرتجعة
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-muted-foreground">
                <p>
                    تصبح أرباح الطلب متاحة للسحب فور تغيير حالة الطلب إلى **"تم التوصيل" (Delivered)**. لم يعد هناك فترة انتظار للأرباح المعلقة.
                </p>
                <p>
                    في حال تم إرجاع الطلب من قبل العميل أو تم إلغاؤه بعد تأكيده، سيتم خصم العمولة المرتبطة بهذا الطلب من رصيد أرباحك. إذا كان الرصيد لا يكفي، فسيتم خصمها من الأرباح المستقبلية.
                </p>
            </CardContent>
        </Card>

         <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-6 w-6 text-primary"/>
                    شروط عامة
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
                 <ul className="list-disc pe-6 space-y-2">
                    <li>تحتفظ إدارة KEMET SUPPLY بالحق في تعديل هذه السياسات في أي وقت. سيتم إخطار جميع المسوقين بأي تغييرات عبر البريد الإلكتروني أو من خلال إشعار على المنصة.</li>
                    <li>أي محاولة للتلاعب أو الاحتيال في نظام الطلبات أو العمولات ستؤدي إلى تعليق الحساب ومصادرة جميع الأرباح.</li>
                </ul>
            </CardContent>
        </Card>
    </div>
  );
}
