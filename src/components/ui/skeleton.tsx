
import { cn } from "@/lib/utils"
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { usePageVisibility } from "@/hooks/use-page-visibility";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}


interface RefreshIndicatorProps {
  lastUpdated: Date | null;
  isLoading: boolean;
}

export function RefreshIndicator({ lastUpdated, isLoading }: RefreshIndicatorProps) {
  const [timeAgo, setTimeAgo] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false); // State to track client-side mount
  const isVisible = usePageVisibility();

  useEffect(() => {
    // This effect runs only on the client, after the initial render.
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!lastUpdated || !isVisible) {
      return;
    }

    const update = () => {
      const seconds = Math.floor((new Date().getTime() - lastUpdated.getTime()) / 1000);
      if (seconds < 5) {
        setTimeAgo('الآن');
      } else if (seconds < 60) {
        setTimeAgo(`منذ ${seconds} ثانية`);
      } else {
        setTimeAgo(`منذ ${Math.floor(seconds / 60)} دقيقة`);
      }
    };

    update();
    const intervalId = setInterval(update, 10000); // update every 10 seconds

    return () => clearInterval(intervalId);
  }, [lastUpdated, isVisible]);

  // On the server and during the initial client render, render nothing to ensure consistency.
  if (!isClient) {
    return null;
  }

  // After mounting on the client, render the actual indicator.
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      {isLoading && !lastUpdated ? ( // Show only if initial load
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>جاري التحميل...</span>
        </>
      ) : timeAgo ? (
        <>
          {isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
          <span>آخر تحديث: {timeAgo}</span>
        </>
      ): null}
    </div>
  );
}


export { Skeleton }
