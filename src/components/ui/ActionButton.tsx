"use client";

import { Button, type ButtonProps } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActionButtonProps extends ButtonProps {
  loading: boolean;
  loadingText?: string;
}

export function ActionButton({
  loading,
  loadingText = "جاري التنفيذ...",
  children,
  className,
  ...props
}: ActionButtonProps) {
  return (
    <Button
      className={cn("transition-all", className)}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="me-2 h-4 w-4 animate-spin" />
          {loadingText}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
