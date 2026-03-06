
'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { User, onAuthStateChanged, Unsubscribe } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import type { UserProfile } from '@/lib/types';

export interface SessionContextState {
  user: User | null;
  profile: UserProfile | null;
  role: 'Dropshipper' | 'Admin' | 'OrdersManager' | 'FinanceManager' | 'Merchant' | null;
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
  const { auth, firestore } = useFirebase();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Always start true
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let profileUnsubscribe: Unsubscribe | undefined;

    const authUnsubscribe = onAuthStateChanged(auth, (authUser) => {
      // Cleanup previous profile listener
      if (profileUnsubscribe) {
        profileUnsubscribe();
      }

      setUser(authUser); // Set user immediately

      if (authUser) {
        // User is logged in, now fetch profile. Still loading.
        setIsLoading(true);
        const profileDocRef = doc(firestore, 'users', authUser.uid);
        
        profileUnsubscribe = onSnapshot(profileDocRef, (docSnap) => {
          if (docSnap.exists()) {
            setProfile({ id: docSnap.id, ...docSnap.data() } as UserProfile);
          } else {
            // User exists in Auth, but not in Firestore. This is a valid state to report.
            // The UI can decide what to do (e.g., redirect, show error, force logout).
            // Do NOT force logout from here.
            setProfile(null);
            console.error(`User with UID ${authUser.uid} has a valid auth session but no profile document in Firestore.`);
          }
          // We have a definitive state for the user and their profile (or lack thereof). Stop loading.
          setIsLoading(false);
          setError(null);
        }, (profileError) => {
          console.error("Error fetching user profile:", profileError);
          setError(profileError);
          setProfile(null);
          // We have a definitive (error) state. Stop loading.
          setIsLoading(false);
        });
      } else {
        // No user is logged in. This is a definitive state.
        setProfile(null);
        setUser(null);
        setIsLoading(false); // Stop loading.
        setError(null);
      }
    }, (authError) => {
      console.error("Authentication state error:", authError);
      setError(authError);
      setUser(null);
      setProfile(null);
      setIsLoading(false);
    });

    return () => {
      authUnsubscribe();
      if (profileUnsubscribe) {
        profileUnsubscribe();
      }
    };
  }, [auth, firestore]);

  const contextValue = useMemo((): SessionContextState => {
    const role = profile?.role || null;
    const isAdmin = role === 'Admin';
    const isStaff = ['Admin', 'OrdersManager', 'FinanceManager'].includes(role || '');

    return {
      user,
      profile,
      isLoading,
      error,
      role,
      isAdmin,
      isOrdersManager: role === 'OrdersManager' || isAdmin,
      isFinanceManager: role === 'FinanceManager' || isAdmin,
      isMerchant: role === 'Merchant',
      isStaff: isStaff,
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
