
"use client"

import { ColumnDef } from "@tanstack/react-table"
import type { Order } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, ArrowUpDown } from "lucide-react"
import { format } from 'date-fns'
import { Badge } from "@/components/ui/badge"
import Image from "next/image"

export const getColumns = (
    onViewDetails: (order: Order) => void,
): ColumnDef<Order>[] => [
  {
    accessorKey: "product",
    header: "الطلب",
    cell: ({ row }) => {
        const order = row.original;
        return (
            <div className="flex items-center gap-3">
                <Image src={order.productImageUrl || '/placeholder.svg'} alt={order.productName} width={40} height={40} className="rounded-md object-cover" />
                <div className="flex flex-col">
                    <span className="font-medium text-primary">#{order.id.substring(0, 7).toUpperCase()}</span>
                    <span className="text-muted-foreground text-xs">{order.productName}</span>
                </div>
            </div>
        );
    }
  },
  {
    accessorKey: "customerName",
    header: "العميل",
    cell: ({ row }) => {
        const order = row.original;
        return (
             <div className="flex flex-col">
                <span className="font-medium">{order.customerName}</span>
                <span className="text-muted-foreground text-xs font-mono">{order.customerPhone}</span>
            </div>
        )
    }
  },
  {
    accessorKey: "totalAmount",
    header: "المبلغ",
    cell: ({ row }) => {
        return <span className="font-semibold text-base">{row.original.totalAmount.toFixed(2)} ج.م</span>
    }
  },
   {
    accessorKey: "customerPaymentMethod",
    header: "طريقة الدفع",
    cell: ({ row }) => {
        return <Badge variant="secondary">{row.original.customerPaymentMethod}</Badge>
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
          تاريخ الطلب
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
      const order = row.original

      return (
        <Button variant="outline" size="sm" onClick={() => onViewDetails(order)}>
            مراجعة الدفع
        </Button>
      )
    },
  },
]
