"use client"

import { Table } from "@tanstack/react-table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { DataTableViewOptions } from "./data-table-view-options"
import { X, Download } from "lucide-react"
import { exportToExcel } from "@/lib/export"
import type { Order } from "@/lib/types"

interface DataTableToolbarProps<TData> {
  table: Table<TData>
}

export function DataTableToolbar<TData>({
  table,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0

  const handleExport = () => {
    const dataToExport = table.getFilteredRowModel().rows.map(row => row.original as Order);
    const headers = {
        id: "رقم الطلب",
        customerName: "اسم العميل",
        customerPhone: "هاتف العميل",
        customerCity: "المدينة",
        productName: "اسم المنتج",
        quantity: "الكمية",
        totalAmount: "المبلغ الإجمالي",
        totalCommission: "الربح",
        status: "الحالة",
        dropshipperName: "اسم المسوق",
        createdAt: "تاريخ الإنشاء",
    };
    // Format data before exporting
    const formattedData = dataToExport.map(order => ({
        ...order,
        createdAt: order.createdAt.toDate().toLocaleString('ar-EG'),
    }));
    exportToExcel(formattedData, "orders-report", "الطلبات", headers);
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2 space-x-reverse">
        <Input
          placeholder="ابحث بالاسم، الهاتف، أو المدينة..."
          value={(table.getColumn("customer")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("customer")?.setFilterValue(event.target.value)
          }
          className="h-10 w-[200px] lg:w-[300px]"
        />
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => table.resetColumnFilters()}
            className="h-10 px-2 lg:px-3"
          >
            إلغاء
            <X className="ms-2 h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={handleExport} className="h-10">
            <Download className="me-2"/>
            تصدير
        </Button>
        <DataTableViewOptions table={table} />
      </div>
    </div>
  )
}
