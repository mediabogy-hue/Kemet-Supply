"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Order } from "@/lib/types"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, ArrowUpDown, FilePen } from "lucide-react"
import { format } from 'date-fns'
import { OrderStatusBadge } from "./order-status-badge"

export const getMerchantOrderColumns = (
    onStatusUpdate: (order: Order, status: Order['status']) => void,
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
                <span className="text-muted-foreground text-xs font-mono">{order.customerPhone}</span>
                <span className="text-muted-foreground text-xs">{order.customerCity}</span>
            </div>
        );
    }
  },
  {
    accessorKey: "amount",
    header: "المبلغ الإجمالي",
    cell: ({ row }) => {
        const order = row.original;
        return <span className="font-semibold text-base">{order.totalAmount.toFixed(2)} ج.م</span>
    }
  },
  {
    accessorKey: "status",
    header: "الحالة",
    cell: ({ row }) => {
        return <OrderStatusBadge status={row.original.status} />
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

      const canUpdateStatus = ['Pending', 'Confirmed', 'Ready to Ship'].includes(order.status);

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
            {canUpdateStatus ? (
               <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                    <FilePen className="me-2" />
                    <span>تغيير الحالة</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                        {order.status === 'Pending' && (
                             <DropdownMenuItem onClick={() => onStatusUpdate(order, 'Confirmed')}>
                                <OrderStatusBadge status="Confirmed" />
                            </DropdownMenuItem>
                        )}
                        {order.status === 'Confirmed' && (
                             <DropdownMenuItem onClick={() => onStatusUpdate(order, 'Ready to Ship')}>
                               <OrderStatusBadge status="Ready to Ship" />
                            </DropdownMenuItem>
                        )}
                         {order.status === 'Ready to Ship' && (
                             <DropdownMenuItem onClick={() => onStatusUpdate(order, 'Shipped')}>
                               <OrderStatusBadge status="Shipped" />
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuSubContent>
                </DropdownMenuPortal>
            </DropdownMenuSub>
            ) : (
                 <DropdownMenuItem disabled>
                    <p className="text-xs text-muted-foreground">لا توجد إجراءات متاحة</p>
                 </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
