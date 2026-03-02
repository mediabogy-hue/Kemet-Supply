'use client';

import { useMemo, type DependencyList } from 'react';

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

// Re-export provider hooks from the provider file itself to avoid cycles
import { useFirebase, useAuth, useFirestore, useStorage, useFirebaseApp } from './provider';

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
  // Re-export the provider hooks
  useFirebase,
  useAuth,
  useFirestore,
  useStorage,
  useFirebaseApp
};


type MemoFirebase <T> = T & {__memo?: boolean};

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T | (MemoFirebase<T>) {
  const memoized = useMemo(factory, deps);
  
  if(typeof memoized !== 'object' || memoized === null) return memoized;
  (memoized as MemoFirebase<T>).__memo = true;
  
  return memoized;
}
