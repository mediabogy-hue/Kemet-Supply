export default function Loading() {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", direction: "rtl" }}>
      <div style={{ textAlign: "center", opacity: 0.9 }}>
        <div style={{ fontSize: 18, marginBottom: 8 }}>جاري التحميل…</div>
        <div style={{ fontSize: 12, opacity: 0.7 }}>انتظر لحظة</div>
      </div>
    </div>
  );
}