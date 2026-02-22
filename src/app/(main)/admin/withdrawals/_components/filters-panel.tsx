
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

interface FiltersPanelProps {
    onStatusChange: (status: string) => void;
    onPaymentMethodChange: (method: string) => void;
}

export function FiltersPanel({ onStatusChange, onPaymentMethodChange }: FiltersPanelProps) {
    return (
        <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="relative w-full md:w-auto md:flex-1">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="ابحث باسم المستخدم، رقم الطلب، أو رقم الهاتف..." className="w-full pr-9" />
            </div>
            <div className="flex w-full md:w-auto gap-2">
                <Select onValueChange={onStatusChange} defaultValue="all">
                    <SelectTrigger className="w-full md:w-[160px]">
                        <SelectValue placeholder="الحالة" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">كل الحالات</SelectItem>
                        <SelectItem value="Pending">قيد المراجعة</SelectItem>
                        <SelectItem value="Completed">مدفوع</SelectItem>
                        <SelectItem value="Rejected">مرفوض</SelectItem>
                    </SelectContent>
                </Select>
                 <Select onValueChange={onPaymentMethodChange} defaultValue="all">
                    <SelectTrigger className="w-full md:w-[160px]">
                        <SelectValue placeholder="طريقة الدفع" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">كل الطرق</SelectItem>
                        <SelectItem value="Vodafone Cash">فودافون كاش</SelectItem>
                        <SelectItem value="InstaPay">انستا باي</SelectItem>
                        <SelectItem value="Bank Transfer">تحويل بنكي</SelectItem>
                        <SelectItem value="Telda">تيلدا</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}
