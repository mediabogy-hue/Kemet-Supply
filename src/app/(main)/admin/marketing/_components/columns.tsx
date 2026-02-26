"use client"

import { ColumnDef } from "@tanstack/react-table"
import type { UserProfile } from "@/lib/types"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import { MoreHorizontal, ArrowUpDown, Eye, Edit, Trash2, ShieldQuestion } from "lucide-react"
import { format } from 'date-fns'
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

type ColumnActions = {
    onEdit: (user: UserProfile) => void;
    onDelete: (user: UserProfile) => void;
    onViewDetails: (user: UserProfile) => void;
};

export const getColumns = ({ onEdit, onDelete, onViewDetails }: ColumnActions): ColumnDef<UserProfile>[] => [
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
    accessorKey: "firstName",
    header: "التاجر",
    cell: ({ row }) => {
        const user = row.original;
        const name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
        return (
            <div className="flex items-center gap-3">
                 <Avatar className="h-10 w-10 border">
                    {user.photoURL && <AvatarImage src={user.photoURL} alt={name} />}
                    <AvatarFallback>{`${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                    <span className="font-medium">{name || 'N/A'}</span>
                    <span className="text-muted-foreground text-xs">{user.email}</span>
                </div>
            </div>
        );
    }
  },
  {
    accessorKey: "phone",
    header: "الهاتف",
  },
  {
    accessorKey: "products",
    header: "المنتجات",
    cell: ({ row }) => {
        // Placeholder
        return <div className="text-center text-muted-foreground">-</div>
    }
  },
   {
    accessorKey: "sales",
    header: "المبيعات",
    cell: ({ row }) => {
        // Placeholder
        return <div className="text-center text-muted-foreground">-</div>
    }
  },
  {
    accessorKey: "isActive",
    header: "الحالة",
    cell: ({ row }) => {
        const isActive = row.original.isActive;
        return <Badge variant={isActive ? "default" : "destructive"}>{isActive ? 'نشط' : 'غير نشط'}</Badge>
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
          تاريخ الانضمام
          <ArrowUpDown className="ms-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
        const date = row.original.createdAt?.toDate();
        return <div className="text-center">{date ? format(date, 'yyyy/MM/dd') : 'N/A'}</div>
    }
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const user = row.original

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
            <DropdownMenuItem onClick={() => onViewDetails(user)}>
                <Eye className="me-2" />
                عرض التفاصيل
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(user)}>
                <Edit className="me-2" />
                تعديل البيانات
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={() => onDelete(user)}>
                <Trash2 className="me-2" />
                حذف الحساب
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
