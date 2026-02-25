
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// This page now redirects to the profile page, as financial reports are there.
export default function MerchantReportsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/profile');
  }, [router]);

  return (
    <div className="flex h-full w-full items-center justify-center">
      <p>جاري التوجيه إلى الملف الشخصي...</p>
    </div>
  );
}
