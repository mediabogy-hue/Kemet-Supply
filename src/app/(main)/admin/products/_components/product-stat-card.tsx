'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import React from "react";

interface ProductStatCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    isLoading: boolean;
    description?: string;
}

export function ProductStatCard({ title, value, icon, isLoading, description }: ProductStatCardProps) {
    return (
        <div className="p-6 rounded-lg bg-card border">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
                <div className="text-muted-foreground">{icon}</div>
            </div>
            <div>
                {isLoading ? (
                    <Skeleton className="h-8 w-3/4" />
                ) : (
                    <div className="text-2xl font-bold">{value}</div>
                )}
                {description && !isLoading && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
            </div>
        </div>
    );
}
