
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Download, WifiOff } from 'lucide-react';

// Offline Banner
function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    // Initial check on mount
    setIsOffline(!navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-destructive text-destructive-foreground p-3 text-center text-sm z-50 flex items-center justify-center gap-2">
      <WifiOff className="h-4 w-4" />
      أنت غير متصل بالإنترنت. يتم عرض البيانات المحفوظة.
    </div>
  );
}

// PWA Install Button
function InstallPwaButton() {
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  const [isStandalone, setIsStandalone] = useState(true); // Default to true (don't show) to prevent flash

  useEffect(() => {
    // This runs only on the client
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches);
    
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = () => {
    if (!installPrompt) return;
    (installPrompt as any).prompt();
    (installPrompt as any).userChoice.then((choiceResult: { outcome: 'accepted' | 'dismissed' }) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      setInstallPrompt(null);
    });
  };
  
  if (isStandalone || !installPrompt) {
    return null;
  }

  return (
    <Button onClick={handleInstallClick} variant="secondary" className="fixed bottom-20 right-4 z-50 shadow-lg">
      <Download className="me-2" />
      تثبيت التطبيق
    </Button>
  );
}

// Main PWA Features Component
export function PwaFeatures() {
  const { toast } = useToast();

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const swUrl = `/sw.js`;
      
      navigator.serviceWorker.register(swUrl)
        .then(registration => {
          console.log('Service Worker registered with scope:', registration.scope);
          
          // Logic to check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New content is available, show a toast to the user.
                  const { dismiss } = toast({
                    title: 'تحديث جديد متاح!',
                    description: 'أغلق التطبيق وأعد فتحه لتطبيق التحديثات.',
                    duration: Infinity,
                    action: (
                      <Button onClick={() => {
                        newWorker.postMessage({ type: 'SKIP_WAITING' });
                        dismiss();
                      }}>
                        تحديث الآن
                      </Button>
                    ),
                  });
                }
              });
            }
          });
        })
        .catch(error => {
          console.error('Service Worker registration failed:', error);
        });

      // Reload the page when the controller changes.
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          window.location.reload();
          refreshing = true;
        }
      });
    }
  }, [toast]);

  return (
    <>
      <OfflineBanner />
      <InstallPwaButton />
    </>
  );
}
