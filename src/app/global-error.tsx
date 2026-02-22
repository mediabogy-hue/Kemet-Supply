'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error('Global Error:', error);

  return (
    <html lang="ar" dir="rtl">
      <body style={{ padding: 24, fontFamily: 'system-ui' }}>
        <h2 style={{ marginBottom: 8 }}>حدث خطأ عام في التطبيق</h2>
        <p style={{ opacity: 0.8, marginBottom: 16 }}>
          اضغط “إعادة تشغيل” لتجربة تحميل التطبيق من جديد.
        </p>

        <button
          onClick={() => reset()}
          style={{
            padding: '10px 14px',
            borderRadius: 10,
            border: '1px solid #333',
            cursor: 'pointer',
          }}
        >
          إعادة تشغيل
        </button>
      </body>
    </html>
  );
}