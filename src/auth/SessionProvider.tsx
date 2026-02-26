
'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import type { FirebaseApp } from 'firebase/app';
import { Firestore, doc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged } from 'firebase/auth';
import type { Storage } from 'firebase/storage';
import { app, auth, db, storage } from '@/lib/firebaseClient';
import type { UserProfile } from '@/lib/types';
import { Rocket } from 'lucide-react';

export interface SessionContextState {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  storage: Storage;
  user: User | null;
  profile: UserProfile | null;
  role: UserProfile['role'] | null;
  isLoading: boolean;
  error: Error | null;
  isAdmin: boolean;
  isOrdersManager: boolean;
  isFinanceManager: boolean;
  isMerchant: boolean;
  isStaff: boolean;
  isDropshipper: boolean;
}

const SessionContext = createContext<SessionContextState | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Always start as loading
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const authUnsubscribe = onAuthStateChanged(auth, (authUser) => {
      // If a user logs out, authUser will be null
      if (!authUser) {
        setUser(null);
        setProfile(null);
        setIsLoading(false);
        setError(null);
        return;
      }

      // If a user logs in (or is already logged in)
      setUser(authUser);

      // Now, subscribe to their profile document in real-time
      const profileDocRef = doc(db, 'users', authUser.uid);
      const profileUnsubscribe = onSnapshot(profileDocRef,
        (docSnap) => {
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
            setError(null);
          } else {
            setProfile(null);
            setError(new Error('User profile not found.'));
          }
          setIsLoading(false);
        },
        (profileError) => {
          setProfile(null);
          setError(profileError);
          setIsLoading(false);
        }
      );

      // Return a cleanup function for the profile subscription when authUser changes
      return () => profileUnsubscribe();

    }, (authError) => {
      // Handle errors from the auth listener itself
      setUser(null);
      setProfile(null);
      setError(authError);
      setIsLoading(false);
    });

    // Return the cleanup function for the auth listener
    return () => authUnsubscribe();

  }, []); // Empty dependency array ensures this effect runs only once on mount

  const contextValue = useMemo((): SessionContextState => {
    const role = profile?.role || null;
    return {
      user,
      profile,
      isLoading,
      error,
      firebaseApp: app,
      firestore: db,
      auth: auth,
      storage: storage,
      role,
      isAdmin: role === 'Admin',
      isOrdersManager: role === 'OrdersManager' || role === 'Admin',
      isFinanceManager: role === 'FinanceManager' || role === 'Admin',
      isMerchant: role === 'Merchant',
      isStaff: ['Admin', 'OrdersManager', 'FinanceManager'].includes(role || ''),
      isDropshipper: role === 'Dropshipper',
    };
  }, [user, profile, isLoading, error]);

  return (
    <SessionContext.Provider value={contextValue}>
      {children}
    </SessionContext.Provider>
  );
}

export const useSession = (): SessionContextState => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider.');
  }
  return context;
};
