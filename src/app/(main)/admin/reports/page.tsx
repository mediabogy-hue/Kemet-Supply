
'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Users, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminReportsPage() {
  const { toast } = useToast();

  const handleComingSoon = () => {
    toast({
      title: "قريباً",
      description: "نعمل حاليًا على تطوير هذه الميزة.",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">تقارير المنصة</h1>
        <p className="text-muted-foreground">
          تحليلات مفصلة لأداء المبيعات، المسوقين، والمخزون.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <FileText />
                تقرير المبيعات
            </CardTitle>
            <CardDescription>تحليل شامل للإيرادات والطلبات والمنتجات الأكثر مبيعًا.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={handleComingSoon}>
              عرض التقرير
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
             <CardTitle className="flex items-center gap-2">
                <Users />
                تقرير المسوقين
            </CardTitle>
            <CardDescription>تقييم أداء المسوقين بناءً على المبيعات والأرباح المحققة.</CardDescription>
          </CardHeader>
          <CardContent>
             <Button className="w-full" onClick={handleComingSoon}>
              عرض التقرير
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
             <CardTitle className="flex items-center gap-2">
                <Package />
                تقرير المخزون
            </CardTitle>
            <CardDescription>نظرة عامة على الكميات المتاحة وقيمة المخزون الحالية.</CardDescription>
          </CardHeader>
          <CardContent>
             <Button className="w-full" onClick={handleComingSoon}>
              عرض التقرير
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
