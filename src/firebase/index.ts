'use client';

// This barrel file re-exports all Firebase-related modules for easy and consistent imports.

// Main provider and core hooks
export {
  FirebaseProvider,
  useFirebase,
  useAuth,
  useFirestore,
  useStorage,
  useFirebaseApp,
} from './provider';

// Firestore data hooks
export { useCollection } from './firestore/use-collection';
export type { UseCollectionResult, WithId } from './firestore/use-collection';
export { useDoc } from './firestore/use-doc';
export type { UseDocResult } from './firestore/use-doc';

// Auth hooks
export { useUser } from './auth/use-user';

// Utility hooks
export { useMemoFirebase } from '@/hooks/useMemoFirebase';

// Error handling
export { errorEmitter } from './error-emitter';
export { FirestorePermissionError } from './errors';
export type { AppEvents } from './error-emitter';
export type { SecurityRuleContext } from './errors';