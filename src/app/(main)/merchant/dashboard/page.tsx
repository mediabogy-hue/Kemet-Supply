'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useSession } from "@/auth/SessionProvider";

export default function MerchantDashboardPage() {
  const { profile } = useSession();

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold mb-4">
        مرحباً بك، {profile?.firstName || 'التاجر'}!
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>لوحة تحكم التاجر</CardTitle>
          <CardDescription>هذه هي لوحة التحكم الخاصة بك. يمكنك من هنا إدارة منتجاتك ومتابعة أدائها.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>سيتم عرض الإحصائيات الخاصة بمنتجاتك هنا.</p>
        </CardContent>
      </Card>
    </div>
  );
}
