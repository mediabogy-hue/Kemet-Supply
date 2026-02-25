
'use client';

import React, { useState, useEffect, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence, type Firestore } from 'firebase/firestore';
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
    const firestore = getFirestore(firebaseApp);
    const storage = getStorage(firebaseApp);

    try {
        enableIndexedDbPersistence(firestore).catch((err) => {
            if (err.code === 'failed-precondition') {
                console.warn('Firebase persistence failed: Multiple tabs open.');
            } else if (err.code === 'unimplemented') {
                console.warn('Firebase persistence failed: Browser does not support it.');
            }
        });
    } catch(e) {
        console.error("Error enabling Firestore persistence:", e);
    }

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
    if (typeof window !== 'undefined' && !clientServices) {
        setClientServices(initializeFirebaseServices());
    }
  }, []); // FIX: Changed dependency from [clientServices] to [] to prevent re-initialization loop.

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
