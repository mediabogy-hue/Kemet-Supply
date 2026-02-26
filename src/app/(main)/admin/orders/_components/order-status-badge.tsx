"use client";

import { Badge } from "@/components/ui/badge";
import type { Order } from "@/lib/types";

const statusConfig: Record<Order['status'], { text: string; className: string }> = {
    'Pending': { text: 'في الانتظار', className: 'bg-yellow-500 hover:bg-yellow-500/80' },
    'Confirmed': { text: 'مؤكد', className: 'bg-blue-500 hover:bg-blue-500/80' },
    'Ready to Ship': { text: 'جاهز للشحن', className: 'bg-sky-500 hover:bg-sky-500/80 text-white' },
    'Shipped': { text: 'تم الشحن', className: 'bg-indigo-500 hover:bg-indigo-500/80' },
    'Delivered': { text: 'تم التوصيل', className: 'bg-green-500 hover:bg-green-500/80' },
    'Canceled': { text: 'ملغي', className: 'bg-gray-500 hover:bg-gray-500/80' },
    'Returned': { text: 'مرتجع', className: 'bg-red-500 hover:bg-red-500/80' },
};

export function OrderStatusBadge({ status }: { status: Order['status'] }) {
    const config = statusConfig[status] || { text: status, className: 'bg-gray-400' };
    return (
        <Badge className={config.className}>{config.text}</Badge>
    );
}
