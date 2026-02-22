
'use client';

import React from 'react';
import { Logo } from '@/components/logo';

interface SalesReportPrintProps {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  topProducts: { name: string; quantity: number; revenue: number }[];
  topMarketers: { id: string; name: string; orderCount: number; totalSales: number }[];
}

export const SalesReportPrint = React.forwardRef<HTMLDivElement, SalesReportPrintProps>(
  ({ totalRevenue, totalOrders, avgOrderValue, topProducts, topMarketers }, ref) => {
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
            <h1 className="text-3xl font-bold">تقرير المبيعات</h1>
            <p className="text-sm text-gray-600">تاريخ الطباعة: {currentDate}</p>
          </div>
          <Logo />
        </header>

        <main>
          <section className="my-8 grid grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-gray-100 border border-gray-200">
              <p className="text-sm text-gray-600">إجمالي الإيرادات</p>
              <p className="text-2xl font-bold">{totalRevenue.toFixed(2)} ج.م</p>
            </div>
            <div className="p-4 rounded-lg bg-gray-100 border border-gray-200">
              <p className="text-sm text-gray-600">إجمالي الطلبات</p>
              <p className="text-2xl font-bold">{totalOrders}</p>
            </div>
            <div className="p-4 rounded-lg bg-gray-100 border border-gray-200">
              <p className="text-sm text-gray-600">متوسط قيمة الطلب</p>
              <p className="text-2xl font-bold">{avgOrderValue.toFixed(2)} ج.م</p>
            </div>
          </section>

          <section className="grid grid-cols-2 gap-8">
            <div>
              <h2 className="text-xl font-bold mb-4">المنتجات الأكثر مبيعاً</h2>
              <table className="w-full text-sm text-right border-collapse">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="p-3 font-semibold border border-gray-300">المنتج</th>
                    <th className="p-3 font-semibold border border-gray-300">الكمية</th>
                    <th className="p-3 font-semibold border border-gray-300">الإيرادات</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map(p => (
                    <tr key={p.name} className="border-b border-gray-200">
                      <td className="p-2 border border-gray-300">{p.name}</td>
                      <td className="p-2 border border-gray-300 text-center">{p.quantity}</td>
                      <td className="p-2 border border-gray-300 text-center">{p.revenue.toFixed(2)} ج.م</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <h2 className="text-xl font-bold mb-4">المسوقين الأكثر مبيعاً</h2>
              <table className="w-full text-sm text-right border-collapse">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="p-3 font-semibold border border-gray-300">المسوق</th>
                    <th className="p-3 font-semibold border border-gray-300">الطلبات</th>
                    <th className="p-3 font-semibold border border-gray-300">المبيعات</th>
                  </tr>
                </thead>
                <tbody>
                  {topMarketers.map(m => (
                    <tr key={m.id} className="border-b border-gray-200">
                      <td className="p-2 border border-gray-300">{m.name}</td>
                      <td className="p-2 border border-gray-300 text-center">{m.orderCount}</td>
                      <td className="p-2 border border-gray-300 text-center">{m.totalSales.toFixed(2)} ج.م</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </main>
        
        <footer className="pt-8 mt-8 border-t text-center text-xs text-gray-500">
            <p>هذا التقرير تم إنشاؤه بواسطة نظام KEMET SUPPLY</p>
        </footer>
      </div>
    );
  }
);

SalesReportPrint.displayName = 'SalesReportPrint';
