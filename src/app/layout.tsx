import type { Metadata } from 'next';
import { Toaster } from "@/components/ui/toaster"
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { SessionProvider } from '@/auth/SessionProvider';
import './globals.css';
import { PwaFeatures } from '@/components/pwa-features';

export const metadata: Metadata = {
  title: 'Tashghil Dropship',
  description: 'Your dropshipping platform.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap" rel="stylesheet" />
        <link rel="icon" href="/favicon.ico" type="image/x-icon" sizes="any" />
      </head>
      <body className="font-body antialiased">
        <FirebaseClientProvider>
          <SessionProvider>
            {children}
            <Toaster />
            <PwaFeatures />
          </SessionProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
