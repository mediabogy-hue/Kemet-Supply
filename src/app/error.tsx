'use client';

import { useEffect } from 'react';
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-foreground" dir="rtl">
        <div className="text-center">
            <h1 className="text-6xl font-bold text-destructive">500</h1>
            <h2 className="mt-4 text-2xl font-semibold">حدث خطأ ما</h2>
            <p className="mt-2 text-muted-foreground">
                عفواً، حدث خطأ غير متوقع في هذه الصفحة. يمكنك محاولة إعادة تحميلها.
            </p>
            <Button onClick={() => reset()} className="mt-6">
                إعادة المحاولة
            </Button>
        </div>
    </div>
  );
}
