
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// This page now redirects to the main admin orders page for Product Managers (Merchants).
export default function MerchantOrdersRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/orders');
  }, [router]);

  return (
    <div className="flex h-full w-full items-center justify-center">
      <p>جاري التوجيه إلى صفحة الطلبات...</p>
    </div>
  );
}
