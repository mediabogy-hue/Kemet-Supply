
import type { Metadata } from 'next';
import { Toaster } from "@/components/ui/toaster"
import './globals.css';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { PwaFeatures } from '@/components/pwa-features';
import { SessionProvider } from '@/auth/SessionProvider';

export const metadata: Metadata = {
  title: {
    default: 'Kemet Supply',
    template: 'Kemet Supply — %s',
  },
  description: 'لوحة تحكم احترافية لإدارة المنتجات والطلبات والمدفوعات والتشغيل.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&display=swap" rel="stylesheet" />
        
        {/* PWA Manifest and Meta Tags */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#fbbf24" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />

      </head>
      <body className="font-body antialiased">
        <FirebaseClientProvider>
          <SessionProvider>
            {children}
            <PwaFeatures />
          </SessionProvider>
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
