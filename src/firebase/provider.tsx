'use client';

import React, { createContext, useContext, useState, useMemo, type ReactNode } from 'react';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { firebaseConfig } from './config';

export interface FirebaseContextState {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  storage: FirebaseStorage;
}

// Initialize Firebase App in a robust, idempotent way
function initializeFirebaseApp() {
  const apps = getApps();
  if (apps.length > 0) {
    return apps[0];
  }
  return initializeApp(firebaseConfig);
}

export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

export function FirebaseProvider({ children }: { children: ReactNode }) {
  // Use useState with a function initializer to ensure this runs only once on the client
  const [firebaseContext] = useState<FirebaseContextState>(() => {
    const app = initializeFirebaseApp();
    return {
      firebaseApp: app,
      firestore: getFirestore(app),
      auth: getAuth(app),
      storage: getStorage(app),
    };
  });

  return (
    <FirebaseContext.Provider value={firebaseContext}>
      {children}
    </FirebaseContext.Provider>
  );
}

export const useFirebase = (): FirebaseContextState => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }
  return context;
};

// Define and export main hooks from here to avoid circular dependencies with a barrel file.
export const useAuth = (): Auth => useFirebase().auth;
export const useFirestore = (): Firestore => useFirebase().firestore;
export const useStorage = (): FirebaseStorage => useFirebase().storage;
export const useFirebaseApp = (): FirebaseApp => useFirebase().firebaseApp;