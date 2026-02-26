
'use client';

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

// Define and export granular hooks
import { useFirebase } from './provider';
import { useSession } from '@/auth/SessionProvider';
import type { Auth } from 'firebase/auth';
import type { FirebaseApp } from 'firebase/app';
import type { Firestore } from 'firebase/firestore';
import type { Storage } from 'firebase/storage';
import { useMemo, type DependencyList } from 'react';

// These hooks are safe to export from a barrel file.
export const useAuth = (): Auth => useFirebase().auth;
export const useFirestore = (): Firestore => useFirebase().firestore;
export const useStorage = (): Storage => useFirebase().storage;
export const useFirebaseApp = (): FirebaseApp => useFirebase().firebaseApp;

// This hook is also safe because its dependency `useSession` is imported from its original source.
export const useUser = () => {
    const { user, isLoading, error } = useSession();
    return { user, isUserLoading: isLoading, userError: error };
};

type MemoFirebase <T> = T & {__memo?: boolean};

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T | (MemoFirebase<T>) {
  const memoized = useMemo(factory, deps);
  
  if(typeof memoized !== 'object' || memoized === null) return memoized;
  (memoized as MemoFirebase<T>).__memo = true;
  
  return memoized;
}
