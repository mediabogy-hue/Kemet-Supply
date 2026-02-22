
"use client";

import { useEffect, useMemo } from "react";

type InventoryItem = {
  id: string;
  name: string;
  qty: number;
  status: string; // "متوفر" / ...
};

export default function InventoryPrintPage() {
  // هنستلم البيانات من localStorage (أضمن من query الطويل)
  const payload = useMemo(() => {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem("inventory_print_payload");
    if (!raw) return null;
    try {
      return JSON.parse(raw) as {
        totalValue: number;
        totalUnits: number;
        items: InventoryItem[];
        generatedAt: string;
      };
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    // اطبع تلقائي عند فتح الصفحة
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, []);

  if (!payload) {
    return (
      <div style={{ padding: 24, direction: "rtl", fontFamily: "system-ui" }}>
        <h2>لا توجد بيانات للطباعة</h2>
        <p>ارجع لصفحة التقرير واضغط "طباعة التقرير" مرة أخرى.</p>
      </div>
    );
  }

  const { totalValue, totalUnits, items, generatedAt } = payload;

  return (
    <div className="print-root">
      <header className="print-header">
        <div>
          <h1>تقرير المخزون</h1>
          <div className="muted">تاريخ الطباعة: {new Date(generatedAt).toLocaleString("ar-EG")}</div>
        </div>
        <div className="brand">KEMET SUPPLY</div>
      </header>

      <section className="print-summary">
        <div className="card">
          <div className="muted">إجمالي قيمة المخزون</div>
          <div className="value">{Number(totalValue || 0).toLocaleString("ar-EG")} ج.م</div>
        </div>
        <div className="card">
          <div className="muted">إجمالي عدد الوحدات</div>
          <div className="value">{Number(totalUnits || 0).toLocaleString("ar-EG")}</div>
        </div>
      </section>

      <section className="print-table">
        <table>
          <thead>
            <tr>
              <th>المنتج</th>
              <th style={{ width: 140 }}>الكمية المتاحة</th>
              <th style={{ width: 120 }}>الحالة</th>
            </tr>
          </thead>
          <tbody>
            {items?.map((it) => (
              <tr key={it.id}>
                <td className="name">{it.name}</td>
                <td>{it.qty}</td>
                <td>{it.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <style jsx global>{`
        /* صفحة A4 */
        @page { size: A4; margin: 12mm; }
        html, body { background: white !important; }
        body { margin: 0; direction: rtl; font-family: system-ui, -apple-system, Segoe UI, Arial; color: #111; }

        .print-root { padding: 0; }
        .print-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; border-bottom: 1px solid #ddd; padding-bottom: 10px; }
        .print-header h1 { margin: 0; font-size: 20px; }
        .brand { font-weight: 700; color: #0f172a; }
        .muted { color: #666; font-size: 12px; margin-top: 4px; }

        .print-summary { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 14px 0 18px; }
        .card { border: 1px solid #ddd; border-radius: 10px; padding: 12px; }
        .value { font-size: 18px; font-weight: 700; margin-top: 6px; }

        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 10px; font-size: 12px; vertical-align: top; }
        th { background: #f6f6f6; text-align: right; }
        .name { word-break: break-word; }

        /* إخفاء أي شيء غير لازم في الطباعة */
        @media print {
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}
