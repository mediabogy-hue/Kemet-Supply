"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Order } from "@/lib/types"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import { MoreHorizontal, ArrowUpDown, Truck, Eye, Trash2, FilePen } from "lucide-react"
import { format } from 'date-fns'
import { OrderStatusBadge } from "./order-status-badge"

// This type is used to define the shape of our data.
// You can use a Zod schema here if you want.

export const getColumns = (
    onStatusUpdate: (order: Order, status: Order['status']) => void,
    onDelete: (order: Order) => void,
    onShip: (order: Order) => void,
    onViewShipment: (order: Order) => void
): ColumnDef<Order>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
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
    header: "المبالغ",
    cell: ({ row }) => {
        const order = row.original;
        return (
            <div className="flex flex-col">
                <span className="font-semibold text-base">{order.totalAmount.toFixed(2)} ج.م</span>
                <span className="text-green-600 text-xs">الربح: {order.totalCommission.toFixed(2)} ج.م</span>
            </div>
        )
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
      const order = row.original

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
            <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                    <FilePen className="me-2" />
                    <span>تغيير الحالة</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                        {(['Pending', 'Confirmed', 'Ready to Ship', 'Shipped', 'Delivered', 'Canceled', 'Returned'] as Order['status'][]).map(status => (
                             <DropdownMenuItem 
                                key={status}
                                onClick={() => onStatusUpdate(order, status)}
                                disabled={order.status === status}
                            >
                                <OrderStatusBadge status={status} />
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuSubContent>
                </DropdownMenuPortal>
            </DropdownMenuSub>

            <DropdownMenuSeparator />
            
            {order.status === 'Confirmed' && !order.shipmentId && (
                <DropdownMenuItem onClick={() => onShip(order)}>
                    <Truck className="me-2" />
                    إنشاء شحنة
                </DropdownMenuItem>
            )}

             {order.shipmentId && (
                <DropdownMenuItem onClick={() => onViewShipment(order)}>
                    <Eye className="me-2" />
                    عرض الشحنة
                </DropdownMenuItem>
             )}
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem className="text-destructive" onClick={() => onDelete(order)}>
                <Trash2 className="me-2" />
                حذف الطلب
            </DropdownMenuItem>

          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
