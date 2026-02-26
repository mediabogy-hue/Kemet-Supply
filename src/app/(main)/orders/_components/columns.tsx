
"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Order, Product } from "@/lib/types"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, ArrowUpDown, Eye, Banknote, RotateCw } from "lucide-react"
import { format } from 'date-fns'
import { OrderStatusBadge } from "@/app/(main)/admin/orders/_components/order-status-badge"
import { Badge } from "@/components/ui/badge"

const paymentStatusVariant: { [key: string]: "default" | "secondary" | "destructive" } = {
  Verified: "default",
  Pending: "secondary",
  Rejected: "destructive",
};
const paymentStatusText: { [key: string]: string } = {
  Verified: "مؤكد",
  Pending: "قيد المراجعة",
  Rejected: "مرفوض",
};


export const getDropshipperOrderColumns = (
    onViewShipment: (order: Order) => void,
    onMakePayment: (order: Order) => void,
    onReorder: (product: Partial<Product>) => void,
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
    accessorKey: "customer",
    header: "العميل",
    cell: ({ row }) => {
        const order = row.original;
        return (
            <div className="flex flex-col">
                <span className="font-medium">{order.customerName}</span>
                <span className="text-muted-foreground text-xs">{order.customerCity}</span>
            </div>
        );
    }
  },
  {
    accessorKey: "amount",
    header: "المبالغ",
    cell: ({ row }) => {
        const order = row.original;
        return (
            <div className="flex flex-col">
                <span className="font-semibold">{order.totalAmount.toFixed(2)} ج.م</span>
                <span className="text-green-600 text-xs">الربح: {order.totalCommission.toFixed(2)} ج.م</span>
            </div>
        )
    }
  },
  {
    accessorKey: "status",
    header: "حالة الطلب",
    cell: ({ row }) => {
        return <OrderStatusBadge status={row.original.status} />
    }
  },
    {
    accessorKey: "paymentStatus",
    header: "حالة الدفع للمنصة",
    cell: ({ row }) => {
        const order = row.original;
        const amountToPay = order.totalAmount - order.totalCommission;
        if (amountToPay <= 0) {
            return <Badge variant="default">لا يوجد</Badge>
        }
        if (order.customerPaymentStatus) {
            return <Badge variant={paymentStatusVariant[order.customerPaymentStatus]}>{paymentStatusText[order.customerPaymentStatus]}</Badge>
        }
        return <Badge variant="destructive">مطلوب الدفع</Badge>
    }
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          التاريخ
          <ArrowUpDown className="ms-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
        const date = row.original.createdAt.toDate();
        return <div className="text-center">{format(date, 'yyyy/MM/dd')}</div>
    }
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const order = row.original;
      const amountToPay = order.totalAmount - order.totalCommission;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>الإجراءات</DropdownMenuLabel>
            {amountToPay > 0 && !order.customerPaymentStatus && (
                <DropdownMenuItem onClick={() => onMakePayment(order)}>
                    <Banknote className="me-2" />
                    تسجيل إثبات الدفع
                </DropdownMenuItem>
            )}
             {order.shipmentId && (
                <DropdownMenuItem onClick={() => onViewShipment(order)}>
                    <Eye className="me-2" />
                    تتبع الشحنة
                </DropdownMenuItem>
             )}
             <DropdownMenuItem onClick={() => onReorder({ id: order.productId })}>
                <RotateCw className="me-2" />
                طلب نفس المنتج مرة أخرى
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
