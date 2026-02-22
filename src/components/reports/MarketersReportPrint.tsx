
'use client';

import React from 'react';
import { Logo } from '@/components/logo';

interface MarketerData {
  id: string;
  name: string;
  orderCount: number;
  totalSales: number;
  totalCommission: number;
}

interface MarketersReportPrintProps {
  items: MarketerData[];
}

export const MarketersReportPrint = React.forwardRef<HTMLDivElement, MarketersReportPrintProps>(
  ({ items }, ref) => {
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
            <h1 className="text-3xl font-bold">تقرير أداء المسوقين</h1>
            <p className="text-sm text-gray-600">تاريخ الطباعة: {currentDate}</p>
          </div>
          <Logo />
        </header>

        <main className="my-8">
          <table className="w-full text-sm text-right border-collapse">
            <thead>
              <tr className="bg-gray-200">
                <th className="p-3 font-semibold border border-gray-300">المسوق</th>
                <th className="p-3 font-semibold border border-gray-300">الطلبات المكتملة</th>
                <th className="p-3 font-semibold border border-gray-300">إجمالي المبيعات</th>
                <th className="p-3 font-semibold border border-gray-300">إجمالي الربح</th>
              </tr>
            </thead>
            <tbody>
              {items.map(m => (
                <tr key={m.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="p-3 border border-gray-300">{m.name}</td>
                  <td className="p-3 border border-gray-300 text-center">{m.orderCount}</td>
                  <td className="p-3 border border-gray-300 text-center">{m.totalSales.toFixed(2)} ج.م</td>
                  <td className="p-3 border border-gray-300 text-center font-semibold text-green-700">{m.totalCommission.toFixed(2)} ج.م</td>
                </tr>
              ))}
            </tbody>
          </table>
        </main>
        
        <footer className="pt-8 mt-8 border-t text-center text-xs text-gray-500">
            <p>هذا التقرير تم إنشاؤه بواسطة نظام KEMET SUPPLY</p>
        </footer>
      </div>
    );
  }
);

MarketersReportPrint.displayName = 'MarketersReportPrint';
