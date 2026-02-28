
"use client";

import { Badge } from "@/components/ui/badge";
import type { Order } from "@/lib/types";

const statusConfig: Record<Order['status'], { text: string; className: string }> = {
    'Pending': { text: 'في الانتظار', className: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20' },
    'Confirmed': { text: 'مؤكد', className: 'bg-blue-400/10 text-blue-400 border-blue-400/20' },
    'Ready to Ship': { text: 'جاهز للشحن', className: 'bg-sky-400/10 text-sky-400 border-sky-400/20' },
    'Shipped': { text: 'تم الشحن', className: 'bg-indigo-400/10 text-indigo-400 border-indigo-400/20' },
    'Delivered': { text: 'تم التوصيل', className: 'bg-green-400/10 text-green-400 border-green-400/20' },
    'Canceled': { text: 'ملغي', className: 'bg-gray-400/10 text-gray-400 border-gray-400/20' },
    'Returned': { text: 'مرتجع', className: 'bg-red-400/10 text-red-400 border-red-400/20' },
};

export function OrderStatusBadge({ status }: { status: Order['status'] }) {
    const config = statusConfig[status] || { text: status, className: 'bg-gray-400/10 text-gray-400' };
    return (
        <Badge variant="outline" className={config.className}>{config.text}</Badge>
    );
}
