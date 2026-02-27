'use client';

import React, { createContext, useMemo, type ReactNode } from 'react';
import type { FirebaseApp } from 'firebase/app';
import type { Firestore } from 'firebase/firestore';
import type { Auth } from 'firebase/auth';
import type { Storage } from 'firebase/storage';
import { app, auth, db, storage } from '@/lib/firebaseClient';

export interface FirebaseContextState {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  storage: Storage;
}

export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

export function FirebaseProvider({ children }: { children: ReactNode }) {
  const contextValue = useMemo(() => ({
    firebaseApp: app,
    firestore: db,
    auth: auth,
    storage: storage,
  }), []);

  return (
    <FirebaseContext.Provider value={contextValue}>
      {children}
    </FirebaseContext.Provider>
  );
}
