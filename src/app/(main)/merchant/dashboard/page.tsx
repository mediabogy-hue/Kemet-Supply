
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// This page now redirects to the main admin dashboard for Product Managers (Merchants).
export default function MerchantDashboardRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/dashboard');
  }, [router]);

  return (
    <div className="flex h-full w-full items-center justify-center">
      <p>جاري التوجيه إلى لوحة التحكم...</p>
    </div>
  );
}
