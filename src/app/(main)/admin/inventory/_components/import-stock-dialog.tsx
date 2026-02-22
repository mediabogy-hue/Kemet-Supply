"use client";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { FileUp } from "lucide-react";

export function ImportStockDialog() {
  const { toast } = useToast();

  const handleClick = () => {
     toast({
      title: "قيد التطوير",
      description: "سيتم تفعيل ميزة استيراد المخزون قريبًا.",
    });
  }

  return (
     <Button variant="secondary" onClick={handleClick}><FileUp className="me-2" /> استيراد ورقة مخزون</Button>
  );
}
