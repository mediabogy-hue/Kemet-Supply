'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// This page is deprecated and redirects to the main admin dashboard.
export default function RetailDashboardRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/dashboard');
  }, [router]);

  return (
    <div className="flex h-full w-full items-center justify-center">
      <p>جاري إعادة التوجيه...</p>
    </div>
  );
}
