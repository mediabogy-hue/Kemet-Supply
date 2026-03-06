'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { User, onAuthStateChanged, Unsubscribe, signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
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
  const [isLoading, setIsLoading] = useState(true); // Start loading and only set to false when a final state is reached.
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let unsubscribeProfile: Unsubscribe | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (authUser) => {
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = undefined;
      }
      
      if (authUser) {
        // User is authenticated, now try to fetch their profile.
        const profileDocRef = doc(firestore, 'users', authUser.uid);
        unsubscribeProfile = onSnapshot(profileDocRef, (docSnap) => {
          if (docSnap.exists()) {
            // SUCCESS: We have an auth user and a profile. The session is valid.
            setUser(authUser);
            setProfile({ id: docSnap.id, ...docSnap.data() } as UserProfile);
            setError(null);
            setIsLoading(false); // FINAL STATE: Logged in.
          } else {
            // CRITICAL ERROR: Auth user exists but no profile document.
            // This account is in a broken state. Log the user out to prevent infinite loops/broken UI.
            console.error(`User with UID ${authUser.uid} is authenticated but has no profile document. Forcing sign out.`);
            signOut(auth); // This triggers onAuthStateChanged again, isLoading remains true until the 'else' block is hit.
          }
        }, (profileError) => {
          // CRITICAL ERROR: Failed to read profile document (e.g., permission denied).
          console.error("Profile snapshot error, forcing sign out:", profileError);
          setError(profileError);
          signOut(auth); // This triggers onAuthStateChanged again.
        });
      } else {
        // No authenticated user. This is a stable, valid state.
        setUser(null);
        setProfile(null);
        setError(null);
        setIsLoading(false); // FINAL STATE: Logged out.
      }
    }, (authError) => {
      // An error occurred in the auth listener itself.
      console.error("Auth state error:", authError);
      setUser(null);
      setProfile(null);
      setError(authError);
      setIsLoading(false); // FINAL STATE: Error.
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, [auth, firestore]);

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
