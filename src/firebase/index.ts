'use client';

import { useMemo, type DependencyList } from 'react';
import type { Auth } from 'firebase/auth';
import type { FirebaseApp } from 'firebase/app';
import type { Firestore } from 'firebase/firestore';
import type { Storage } from 'firebase/storage';
import { useFirebase } from './provider'; // Import from provider

// Re-export hooks and utilities from other files
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';

// Re-export useFirebase from provider
export { useFirebase };

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
export { useUser } from "@/hooks/useUser";