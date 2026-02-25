
'use client';

import React, { useState, useEffect, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

interface FirebaseServices {
    firebaseApp: FirebaseApp;
    auth: Auth;
    firestore: Firestore;
    storage: FirebaseStorage;
}

let firebaseApp: FirebaseApp | null = null;
let services: FirebaseServices | null = null;

// This function initializes Firebase services ONCE and returns them.
function initializeFirebaseServices(): FirebaseServices {
    if (services) {
        return services;
    }
    
    // Initialize the Firebase app, handling server-side rendering and hot-reloading.
    firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    
    const auth = getAuth(firebaseApp);
    // New initialization method for Firestore with persistence
    const firestore = initializeFirestore(firebaseApp, {
        localCache: persistentLocalCache()
    });
    const storage = getStorage(firebaseApp);
    
    // The old try/catch block for enableIndexedDbPersistence is now replaced by the above.
    // Firebase will handle logging any persistence errors (like multi-tab issues) automatically.

    services = { firebaseApp, auth, firestore, storage };
    return services;
}


export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  // On the server, services will be null.
  // On the client, this will be populated after the effect runs.
  const [clientServices, setClientServices] = useState<FirebaseServices | null>(null);

  useEffect(() => {
    // This effect runs only once on the client after the initial render.
    // It's the designated safe space to perform client-side initializations.
    if (typeof window !== 'undefined' && !services) {
        setClientServices(initializeFirebaseServices());
    } else if (services) {
        setClientServices(services);
    }
  }, []);

  return (
    <FirebaseProvider
      firebaseApp={clientServices?.firebaseApp || null}
      auth={clientServices?.auth || null}
      firestore={clientServices?.firestore || null}
      storage={clientServices?.storage || null}
    >
      {children}
    </FirebaseProvider>
  );
}
