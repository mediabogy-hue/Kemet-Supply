'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import type { UserProfile } from '@/lib/types';

export interface SessionContextState {
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
  firestore: ReturnType<typeof useFirebase>['firestore']
}

const SessionContext = createContext<SessionContextState | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const { auth, firestore } = useFirebase();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // This listener handles auth state changes (login/logout)
    const unsubscribeAuth = onAuthStateChanged(auth, (authUser) => {
      setUser(authUser);
      if (!authUser) {
        // If user logs out, we are done loading.
        setIsLoading(false);
        setProfile(null);
      }
    }, (authError) => {
      console.error("Auth state error:", authError);
      setError(authError);
      setIsLoading(false);
      setUser(null);
      setProfile(null);
    });

    return () => unsubscribeAuth();
  }, [auth]);

  useEffect(() => {
    if (!user) {
      // If there is no authenticated user, no profile to fetch.
      // The isLoading state is handled by the auth listener when user becomes null.
      return;
    }

    // When we have a user, but not yet a profile, we are loading.
    setIsLoading(true);
    const profileDocRef = doc(firestore, 'users', user.uid);
    
    const unsubscribeProfile = onSnapshot(profileDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setProfile({ id: docSnap.id, ...docSnap.data() } as UserProfile);
      } else {
        // Handle case where user exists in Auth but not Firestore
        setProfile(null);
        setError(new Error('User profile does not exist in Firestore.'));
      }
      // Finished loading profile data
      setIsLoading(false);
    }, (profileError) => {
      console.error("Profile snapshot error:", profileError);
      setError(profileError);
      setProfile(null);
      // Finished loading (with an error)
      setIsLoading(false);
    });

    return () => unsubscribeProfile();
  }, [user, firestore]); // Rerun when user object changes

  const contextValue = useMemo((): SessionContextState => {
    const role = profile?.role || null;
    const isAdmin = role === 'Admin';
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
      isStaff: ['Admin', 'OrdersManager', 'FinanceManager'].includes(role || ''),
      isDropshipper: role === 'Dropshipper',
      firestore,
    };
  }, [user, profile, isLoading, error, firestore]);

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
