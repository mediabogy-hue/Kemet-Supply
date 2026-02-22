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
    firebaseApp: FirebaseApp | null;
    auth: Auth | null;
    firestore: Firestore | null;
    storage: FirebaseStorage | null;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const [services, setServices] = useState<FirebaseServices>({
    firebaseApp: null,
    auth: null,
    firestore: null,
    storage: null,
  });

  useEffect(() => {
    // This effect runs only on the client, after the initial render.
    // It's safe to initialize Firebase here.
    try {
      const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
      const auth = getAuth(app);
      const firestore = getFirestore(app);
      const storage = getStorage(app);

      enableIndexedDbPersistence(firestore).catch((err) => {
        if (err.code === 'failed-precondition') {
          // Multiple tabs open, persistence can only be enabled in one.
          // This is a normal condition, not an error.
          console.warn('Firebase persistence failed: Multiple tabs open.');
        } else if (err.code === 'unimplemented') {
          // The browser doesn't support indexedDb.
          console.warn('Firebase persistence failed: Browser does not support it.');
        }
      });

      setServices({ firebaseApp: app, auth, firestore, storage });
    } catch (e: any) {
        if (!e.message.includes('already been started')) {
          console.error("Firebase initialization error:", e);
        }
        // If an error occurs, try to get existing services as a fallback.
        if (getApps().length) {
            const app = getApp();
            setServices({
                firebaseApp: app,
                auth: getAuth(app),
                firestore: getFirestore(app),
                storage: getStorage(app),
            });
        }
    }
  }, []); // Empty dependency array ensures this runs once.

  return (
    <FirebaseProvider
      firebaseApp={services.firebaseApp}
      auth={services.auth}
      firestore={services.firestore}
      storage={services.storage}
    >
      {children}
    </FirebaseProvider>
  );
}
