'use client';

import { useContext, useMemo, type DependencyList } from 'react';
import type { Auth } from 'firebase/auth';
import type { FirebaseApp } from 'firebase/app';
import type { Firestore } from 'firebase/firestore';
import type { Storage } from 'firebase/storage';
import { FirebaseContext, type FirebaseContextState } from './provider';

// Re-export hooks and utilities from other files
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';

// DO NOT RE-EXPORT PROVIDERS from here to avoid circular dependencies.
// Import providers directly in your layout files.
// e.g., import { FirebaseProvider } from '@/firebase/provider';
// e.g., import { SessionProvider } from '@/auth/SessionProvider';

// Define and export useFirebase hook
export const useFirebase = (): FirebaseContextState => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }
  return context;
};

// These hooks are safe to export from a barrel file.
export const useAuth = (): Auth => useFirebase().auth;
export const useFirestore = (): Firestore => useFirebase().firestore;
export const useStorage = (): Storage => useFirebase().storage;
export const useFirebaseApp = (): FirebaseApp => useFirebase().firebaseApp;

type MemoFirebase <T> = T & {__memo?: boolean};

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T | (MemoFirebase<T>) {
  const memoized = useMemo(factory, deps);
  
  if(typeof memoized !== 'object' || memoized === null) return memoized;
  (memoized as MemoFirebase<T>).__memo = true;
  
  return memoized;
}
