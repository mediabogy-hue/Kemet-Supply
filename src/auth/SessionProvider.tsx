'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { User, onAuthStateChanged, Unsubscribe } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import type { UserProfile } from '@/lib/types';

export interface SessionContextState {
  user: User | null;
  profile: UserProfile | null;
  role: 'Dropshipper' | 'Admin' | 'OrdersManager' | 'FinanceManager' | null;
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
    let unsubscribeProfile: Unsubscribe | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (authUser) => {
      // If a profile listener is active from a previous user, unsubscribe from it.
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }

      if (authUser) {
        const profileDocRef = doc(firestore, 'users', authUser.uid);
        unsubscribeProfile = onSnapshot(profileDocRef, (docSnap) => {
          setUser(authUser); // Set user only when we have profile info
          if (docSnap.exists()) {
            setProfile({ id: docSnap.id, ...docSnap.data() } as UserProfile);
            setError(null);
          } else {
            setProfile(null);
            setError(new Error('User profile does not exist in Firestore.'));
          }
          setIsLoading(false);
        }, (profileError) => {
          console.error("Profile snapshot error:", profileError);
          setUser(authUser);
          setProfile(null);
          setError(profileError);
          setIsLoading(false);
        });
      } else {
        // No authenticated user.
        setUser(null);
        setProfile(null);
        setError(null);
        setIsLoading(false);
      }
    }, (authError) => {
      console.error("Auth state error:", authError);
      setUser(null);
      setProfile(null);
      setError(authError);
      setIsLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, [auth, firestore]);

  const contextValue = useMemo((): SessionContextState => {
    // NORMALIZE ROLE: If the user has the legacy 'Merchant' role in the DB,
    // treat them as a 'Dropshipper' for permissions and navigation to prevent loops.
    let normalizedRole = profile?.role || null;
    if (normalizedRole === 'Merchant') {
      normalizedRole = 'Dropshipper';
    }
    
    const originalRole = profile?.role || null;
    const isAdmin = normalizedRole === 'Admin';

    return {
      user,
      profile,
      isLoading,
      error,
      role: normalizedRole as SessionContextState['role'],
      isAdmin,
      isOrdersManager: normalizedRole === 'OrdersManager' || isAdmin,
      isFinanceManager: normalizedRole === 'FinanceManager' || isAdmin,
      isMerchant: originalRole === 'Merchant',
      isStaff: ['Admin', 'OrdersManager', 'FinanceManager'].includes(normalizedRole || ''),
      isDropshipper: normalizedRole === 'Dropshipper',
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
