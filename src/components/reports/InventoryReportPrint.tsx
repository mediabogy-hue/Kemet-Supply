
'use client';

import React from 'react';
import type { Product } from '@/lib/types';
import { Logo } from '@/components/logo';

interface InventoryReportPrintProps {
  items: Product[];
  totalValue: number;
  totalUnits: number;
}

export const InventoryReportPrint = React.forwardRef<HTMLDivElement, InventoryReportPrintProps>(
  ({ items, totalValue, totalUnits }, ref) => {
    const currentDate = new Date().toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <div ref={ref} className="p-8 bg-white text-black" dir="rtl">
        <style type="text/css" media="print">
          {`
            @page {
              size: A4;
              margin: 20mm;
            }
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          `}
        </style>
        <header className="flex justify-between items-center pb-4 border-b-2 border-gray-300">
          <div>
            <h1 className="text-3xl font-bold">تقرير المخزون</h1>
            <p className="text-sm text-gray-600">تاريخ الطباعة: {currentDate}</p>
          </div>
          <Logo />
        </header>

        <main>
          <section className="my-8 grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-gray-100 border border-gray-200">
              <p className="text-sm text-gray-600">إجمالي قيمة المخزون</p>
              <p className="text-2xl font-bold">{totalValue.toFixed(2)} ج.م</p>
            </div>
            <div className="p-4 rounded-lg bg-gray-100 border border-gray-200">
              <p className="text-sm text-gray-600">إجمالي عدد الوحدات</p>
              <p className="text-2xl font-bold">{totalUnits}</p>
            </div>
          </section>

          <section>
            <table className="w-full text-sm text-right border-collapse">
              <thead>
                <tr className="bg-gray-200">
                  <th className="p-3 font-semibold border border-gray-300">المنتج</th>
                  <th className="p-3 font-semibold border border-gray-300">الكمية المتاحة</th>
                  <th className="p-3 font-semibold border border-gray-300">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {items.map(p => (
                  <tr key={p.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="p-3 border border-gray-300">{p.name}</td>
                    <td className="p-3 border border-gray-300 font-semibold text-center">{p.stockQuantity}</td>
                    <td className="p-3 border border-gray-300 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          p.stockQuantity === 0
                            ? 'bg-red-100 text-red-800'
                            : p.stockQuantity < 5
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {p.stockQuantity === 0 ? 'نفد' : p.stockQuantity < 5 ? 'منخفض' : 'متوفر'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </main>
        
        <footer className="pt-8 mt-8 border-t text-center text-xs text-gray-500">
            <p>هذا التقرير تم إنشاؤه بواسطة نظام KEMET SUPPLY</p>
        </footer>
      </div>
    );
  }
);

InventoryReportPrint.displayName = 'InventoryReportPrint';
