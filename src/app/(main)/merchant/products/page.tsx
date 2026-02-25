
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// This page now redirects to the main admin products page for Product Managers (Merchants).
export default function MerchantProductsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/products');
  }, [router]);

  return (
    <div className="flex h-full w-full items-center justify-center">
      <p>جاري التوجيه إلى صفحة المنتجات...</p>
    </div>
  );
}
