
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// This page's content has been merged into the new Catalog page (/admin/products)
// This component now just redirects to the new centralized page.
export default function CategoriesRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/products');
  }, [router]);

  return (
    <div className="flex h-full w-full items-center justify-center">
      <p>جاري التوجيه إلى صفحة الكتالوج الجديدة...</p>
    </div>
  );
}
