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
  const [authLoading, setAuthLoading] = useState(true); // For onAuthStateChanged
  const [profileLoading, setProfileLoading] = useState(false); // For onSnapshot
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let unsubscribeProfile: Unsubscribe | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (authUser) => {
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = undefined;
      }
      
      setUser(authUser); // Set user immediately, can be null

      if (authUser) {
        setProfileLoading(true); // Start loading profile since we have an auth user
        const profileDocRef = doc(firestore, 'users', authUser.uid);
        
        unsubscribeProfile = onSnapshot(profileDocRef, (docSnap) => {
          if (docSnap.exists()) {
            setProfile({ id: docSnap.id, ...docSnap.data() } as UserProfile);
            setError(null);
          } else {
            // Auth user exists but no profile. This is an invalid state.
            setProfile(null);
            console.error(`User with UID ${authUser.uid} has no profile. Forcing sign out.`);
            // Force sign out, which will re-trigger onAuthStateChanged to a clean, logged-out state.
            signOut(auth);
          }
          setProfileLoading(false); // Profile loading is complete (or failed but handled).
        }, (profileError) => {
          console.error("Profile snapshot error:", profileError);
          setError(profileError);
          setProfileLoading(false); // Finish loading profile (with an error)
        });
      } else {
        // No auth user, so no profile to load. Reset all states.
        setProfile(null);
        setProfileLoading(false);
      }
      setAuthLoading(false); // Auth check is complete.
    }, (authError) => {
      console.error("Auth state error:", authError);
      setError(authError);
      setAuthLoading(false);
      setProfileLoading(false);
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
    const isLoading = authLoading || profileLoading;

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
  }, [user, profile, authLoading, profileLoading, error]);

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