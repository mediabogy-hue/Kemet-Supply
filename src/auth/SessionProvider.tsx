
'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { User, onAuthStateChanged, Unsubscribe } from 'firebase/auth';
import { doc, onSnapshot, DocumentData, FirestoreError } from 'firebase/firestore';
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

  // STAGE 1: AUTH LOADING
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // STAGE 2: PROFILE LOADING
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);

  const [error, setError] = useState<Error | null>(null);

  // Effect 1: Handle Auth State ONLY
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      setUser(authUser);
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, [auth]);

  // Effect 2: Handle Profile State, triggered by user changes
  useEffect(() => {
    if (!user) {
      // If no user, there's no profile to load. We're done with this stage.
      setProfile(null);
      setIsProfileLoading(false);
      return;
    }

    // If there is a user, start loading their profile.
    setIsProfileLoading(true);
    const profileDocRef = doc(firestore, 'users', user.uid);

    const unsubscribe = onSnapshot(
      profileDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setProfile({ id: docSnap.id, ...docSnap.data() } as UserProfile);
        } else {
          // User exists in auth, but not in firestore (e.g., during signup)
          setProfile(null);
        }
        setError(null);
        setIsProfileLoading(false);
      },
      (profileError: FirestoreError) => {
        console.error("Error fetching user profile:", profileError);
        setProfile(null);
        setError(profileError);
        setIsProfileLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, firestore]); // This effect depends on the user object

  // The overall loading state is true if either auth or profile is loading.
  const isLoading = isAuthLoading || isProfileLoading;

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
