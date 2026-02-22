'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// This page is deprecated and now redirects to the correct admin page.
export default function WithdrawalsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/withdrawals');
  }, [router]);

  return (
    <div className="flex h-full w-full items-center justify-center">
      <p>جاري التوجيه إلى صفحة طلبات السحب...</p>
    </div>
  );
}
