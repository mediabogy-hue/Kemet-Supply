'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// This page acts as a redirect from /policies to /policy
export default function PoliciesRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/policy');
  }, [router]);

  return (
    <div className="flex h-full w-full items-center justify-center">
      <p>جاري التوجيه...</p>
    </div>
  );
}
