"use client"

import { ColumnDef } from "@tanstack/react-table"
import type { Order } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

export const getColumns = (
    onSettle: (order: Order) => void,
    settlingOrderId: string | null
): ColumnDef<Order>[] => [
  {
    accessorKey: "product",
    header: "الطلب",
    cell: ({ row }) => {
        const order = row.original;
        return (
            <div className="flex flex-col">
                <span className="font-medium text-primary">#{order.id.substring(0, 7).toUpperCase()}</span>
                <span className="text-muted-foreground text-xs">{order.productName}</span>
            </div>
        );
    }
  },
  {
    accessorKey: "dropshipper",
    header: "المسوق",
    cell: ({ row }) => row.original.dropshipperName
  },
   {
    accessorKey: "merchant",
    header: "التاجر",
    cell: ({ row }) => row.original.merchantName || 'Kemet Supply'
  },
  {
    accessorKey: "commission",
    header: "ربح المسوق",
    cell: ({ row }) => {
        const commission = row.original.totalCommission || 0;
        return <span className="font-semibold text-green-600">{commission.toFixed(2)} ج.م</span>
    }
  },
   {
    accessorKey: "merchantProfit",
    header: "ربح التاجر",
    cell: ({ row }) => {
        const order = row.original;
        // Defensive calculation for old orders where platformFee might be 0 or missing
        const platformFee = order.platformFee || ((order.totalAmount || 0) * 0.05);
        const profit = (order.totalAmount || 0) - (order.totalCommission || 0) - platformFee;
        if (!order.merchantId) return <span className="text-muted-foreground">-</span>;
        return <span className="font-semibold">{profit.toFixed(2)} ج.م</span>
    }
  },
  {
    accessorKey: "platformFee",
    header: "عمولة المنصة",
    cell: ({ row }) => {
        const order = row.original;
        // Defensive calculation for old orders where platformFee might be 0 or missing
        const fee = order.platformFee || ((order.totalAmount || 0) * 0.05);
        return <span className="font-semibold text-sky-500">{fee.toFixed(2)} ج.م</span>
    }
  },
  {
    accessorKey: "deliveredAt",
    header: "تاريخ التوصيل",
    cell: ({ row }) => {
        const date = row.original.deliveredAt;
        if (!date) return 'غير محدد';
        const d = (date as any).toDate ? (date as any).toDate() : new Date(date as string);
        return d.toLocaleDateString('ar-EG');
    }
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const order = row.original
      const isSettling = settlingOrderId === order.id;

      return (
        <Button 
            onClick={() => onSettle(order)}
            disabled={isSettling}
            size="sm"
        >
            {isSettling && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {isSettling ? 'جاري التسوية...' : 'تسوية'}
        </Button>
      )
    },
  },
]
