
'use client';

import { useRef } from 'react';
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw, ExternalLink, Eye } from "lucide-react";
import { AddProductDialog } from '../../products/_components/add-product-dialog';
import { useSession } from '@/auth/SessionProvider';

const EXTERNAL_URL = "https://app.easy-orders.net/#/products";

export default function ExternalInventoryPage() {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const { isAdmin, isProductManager } = useSession();
    const canHaveSpecialFeatures = isAdmin || isProductManager;

    const handleRefresh = () => {
        if (iframeRef.current) {
            // This reloads the iframe by setting its src to itself
            iframeRef.current.src = EXTERNAL_URL;
        }
    };

    return (
        <div className="flex flex-col h-full space-y-4">
            {/* Top Action Bar */}
            <div className="flex items-center gap-4 flex-wrap">
                <Button variant="outline" size="icon" asChild>
                    <Link href="/admin/products">
                        <ArrowLeft />
                        <span className="sr-only">العودة للكتالوج</span>
                    </Link>
                </Button>
                <div className="flex-1">
                    <h1 className="text-xl font-bold">إدارة مخزون التجار (Easy Orders)</h1>
                    <p className="text-sm text-muted-foreground">
                        إدارة المنتجات والمخزون من خلال لوحة تحكم Easy Orders.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {canHaveSpecialFeatures && <AddProductDialog />}
                     <Button variant="outline" size="sm" asChild>
                        <a href="https://kemet-s.myeasyorders.com/" target="_blank" rel="noopener noreferrer">
                            <Eye className="me-2 h-4 w-4" />
                            عرض الكتالوج العام
                        </a>
                    </Button>
                     <Button variant="outline" size="sm" onClick={handleRefresh}>
                        <RefreshCw className="me-2 h-4 w-4" />
                        تحديث الصفحة
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                        <a href={EXTERNAL_URL} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="me-2 h-4 w-4" />
                            فتح في تبويب جديد
                        </a>
                    </Button>
                </div>
            </div>

            {/* Iframe Container */}
            <div className="flex-1 border rounded-lg overflow-hidden">
                <iframe
                    ref={iframeRef}
                    src={EXTERNAL_URL}
                    title="Easy Orders Inventory Management"
                    className="w-full h-full border-0"
                />
            </div>
        </div>
    );
}
