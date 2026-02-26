
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from "@/components/ui/toaster"
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { SessionProvider } from '@/auth/SessionProvider';
import './globals.css';
import { PwaFeatures } from '@/components/pwa-features';
import { cn } from '@/lib/utils';

const fontSans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

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
        <link rel="icon" href="/favicon.ico" type="image/x-icon" sizes="any" />
      </head>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          fontSans.variable
        )}
      >
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
