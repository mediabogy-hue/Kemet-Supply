'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function MerchantInventoryPage() {

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold mb-4">
        إدارة مخزوني
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>حالة المخزون</CardTitle>
          <CardDescription>هنا يمكنك تحديث كميات منتجاتك المتاحة.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>سيتم بناء هذه الصفحة قريبًا.</p>
        </CardContent>
      </Card>
    </div>
  );
}
