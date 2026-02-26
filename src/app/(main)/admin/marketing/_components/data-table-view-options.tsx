"use client"

import { DropdownMenuTrigger } from "@radix-ui/react-dropdown-menu"
import { Table } from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { SlidersHorizontal } from "lucide-react"

interface DataTableViewOptionsProps<TData> {
  table: Table<TData>
}

// Manual translation map for column headers
const columnNames: Record<string, string> = {
    firstName: "التاجر",
    phone: "الهاتف",
    products: "المنتجات",
    sales: "المبيعات",
    isActive: "الحالة",
    createdAt: "تاريخ الانضمام",
};


export function DataTableViewOptions<TData>({
  table,
}: DataTableViewOptionsProps<TData>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto hidden h-10 lg:flex"
        >
          <SlidersHorizontal className="me-2" />
          الأعمدة
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[150px]">
        <DropdownMenuLabel>عرض/إخفاء الأعمدة</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {table
          .getAllColumns()
          .filter(
            (column) =>
              typeof column.accessorFn !== "undefined" && column.getCanHide()
          )
          .map((column) => {
            return (
              <DropdownMenuCheckboxItem
                key={column.id}
                className="capitalize"
                checked={column.getIsVisible()}
                onCheckedChange={(value) => column.toggleVisibility(!!value)}
              >
                {columnNames[column.id] || column.id}
              </DropdownMenuCheckboxItem>
            )
          })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
