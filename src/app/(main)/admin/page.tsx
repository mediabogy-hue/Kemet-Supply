
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// This page acts as a redirect from /admin to /admin/dashboard
export default function AdminRootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/dashboard');
  }, [router]);

  return (
    <div className="flex h-full w-full items-center justify-center">
      <p>جاري التوجيه إلى لوحة تحكم الأدمن...</p>
    </div>
  );
}
