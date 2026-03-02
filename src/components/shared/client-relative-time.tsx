'use client';

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

interface ClientRelativeTimeProps {
    date: Date | undefined | null;
    className?: string;
    placeholderClassName?: string;
}

export function ClientRelativeTime({ date, className, placeholderClassName = "h-4 w-24" }: ClientRelativeTimeProps) {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    if (!date) {
        return null;
    }

    if (!isClient) {
        // On server and initial client render, render a placeholder.
        return <Skeleton className={placeholderClassName} />;
    }
    
    // On subsequent client renders, render the actual time.
    const timeAgo = formatDistanceToNow(date, { addSuffix: true, locale: ar });

    return (
        <span className={className}>
            {timeAgo}
        </span>
    );
}
