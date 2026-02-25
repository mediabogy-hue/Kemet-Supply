
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useFirestore, useCollection, useMemoFirebase, errorEmitter, FirestorePermissionError } from "@/firebase";
import { collection, query, orderBy, doc, updateDoc } from "firebase/firestore";
import type { MerchantInquiry } from "@/lib/types";
import { Skeleton, RefreshIndicator } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/auth/SessionProvider";

const statusVariant: { [key: string]: "default" | "secondary" | "outline" } = {
  New: "default",
  Contacted: "outline",
  Closed: "secondary",
};

const statusText: { [key: string]: string } = {
  New: "جديد",
  Contacted: "تم التواصل",
  Closed: "مغلق",
};

export default function AdminInquiriesPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { isAdmin, isProductManager, isLoading: isRoleLoading } = useSession();
  const canAccess = isAdmin || isProductManager;

  const inquiriesQuery = useMemoFirebase(() => {
    if (!firestore || isRoleLoading || !canAccess) return null;
    return query(collection(firestore, 'merchantInquiries'));
  }, [firestore, isRoleLoading, canAccess]);

  const { data: inquiries, isLoading, error, setData: setInquiries, lastUpdated } = useCollection<MerchantInquiry>(inquiriesQuery);

  const sortedInquiries = useMemo(() => {
    if (!inquiries) return [];
    return [...inquiries].sort((a, b) => (b.createdAt?.toDate?.()?.getTime() || 0) - (a.createdAt?.toDate?.()?.getTime() || 0));
  }, [inquiries]);

  const handleStatusUpdate = (inquiry: MerchantInquiry, newStatus: 'Contacted' | 'Closed') => {
    if (!firestore) return;
    const inquiryRef = doc(firestore, "merchantInquiries", inquiry.id);
    const updatedData = { status: newStatus };
    
    toast({ title: "تم تحديث حالة الطلب" });

    // Optimistic update
    setInquiries(prev => {
        if (!prev) return [];
        return prev.map(i => i.id === inquiry.id ? { ...i, status: newStatus } : i);
    });
    
    updateDoc(inquiryRef, updatedData).catch(err => {
      // Revert on error
      setInquiries(prev => {
        if (!prev) return [];
        return prev.map(i => i.id === inquiry.id ? { ...i, status: inquiry.status } : i);
      });
      toast({ variant: "destructive", title: "فشل تحديث الحالة", description: "قد لا تملك الصلاحيات الكافية." });
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row justify-between items-center">
        <div>
            <CardTitle>طلبات التجار</CardTitle>
            <CardDescription>
              مراجعة طلبات التواصل من التجار المحتملين الراغبين في عرض منتجاتهم على المنصة.
            </CardDescription>
        </div>
        <RefreshIndicator isLoading={isLoading} lastUpdated={lastUpdated} />
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الاسم</TableHead>
              <TableHead>الشركة</TableHead>
              <TableHead>البريد الإلكتروني</TableHead>
              <TableHead>الهاتف</TableHead>
              <TableHead>الرسالة</TableHead>
              <TableHead>تاريخ الطلب</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && Array.from({length: 5}).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                <TableCell><Skeleton className="h-8 w-8" /></TableCell>
              </TableRow>
            ))}
            {!isLoading && sortedInquiries?.map((inquiry) => (
              <TableRow key={inquiry.id}>
                <TableCell className="font-medium">{inquiry.name}</TableCell>
                <TableCell>{inquiry.companyName || 'N/A'}</TableCell>
                <TableCell><a href={`mailto:${inquiry.email}`} className="hover:underline">{inquiry.email}</a></TableCell>
                <TableCell>{inquiry.phone}</TableCell>
                <TableCell className="max-w-xs truncate" title={inquiry.message}>{inquiry.message}</TableCell>
                <TableCell>{inquiry.createdAt && typeof inquiry.createdAt.toDate === 'function' ? format(inquiry.createdAt.toDate(), 'yyyy-MM-dd') : 'N/A'}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant[inquiry.status] || 'secondary'}>
                    {statusText[inquiry.status] || inquiry.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button aria-haspopup="true" size="icon" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Toggle menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>تغيير الحالة</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => handleStatusUpdate(inquiry, 'Contacted')}>تم التواصل</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStatusUpdate(inquiry, 'Closed')}>إغلاق</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && (!sortedInquiries || sortedInquiries.length === 0) && (
              <TableRow>
                <TableCell colSpan={8} className="text-center">
                  {error ? "فشل تحميل الطلبات." : 'لا توجد طلبات من التجار لعرضها.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
