'use client';

import { useMemo, type DependencyList } from 'react';
import type { Auth } from 'firebase/auth';
import type { FirebaseApp } from 'firebase/app';
import type { Firestore } from 'firebase/firestore';
import type { Storage } from 'firebase/storage';
import { useFirebase } from './provider';

// Explicitly re-export from other modules
import { useCollection } from './firestore/use-collection';
import type { WithId, UseCollectionResult } from './firestore/use-collection';
import { useDoc } from './firestore/use-doc';
import type { UseDocResult } from './firestore/use-doc';
import { setDocumentNonBlocking, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from './non-blocking-updates';
import { initiateAnonymousSignIn, initiateEmailSignUp, initiateEmailSignIn } from './non-blocking-login';
import { FirestorePermissionError } from './errors';
import { errorEmitter } from './error-emitter';
import type { AppEvents } from './error-emitter';
import { useUser } from './auth/use-user';

// Export types
export type {
  WithId,
  UseCollectionResult,
  UseDocResult,
  AppEvents,
};

// Export functions and objects
export {
  useCollection,
  useDoc,
  setDocumentNonBlocking,
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
  initiateAnonymousSignIn,
  initiateEmailSignUp,
  initiateEmailSignIn,
  FirestorePermissionError,
  errorEmitter,
  useUser,
};


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
