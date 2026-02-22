"use client";

import { XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface InlineErrorProps {
  message: string | null;
  className?: string;
}

export function InlineError({ message, className }: InlineErrorProps) {
  if (!message) return null;

  return (
    <div className={cn("flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive", className)}>
      <XCircle className="h-4 w-4 shrink-0" />
      <p>{message}</p>
    </div>
  );
}
