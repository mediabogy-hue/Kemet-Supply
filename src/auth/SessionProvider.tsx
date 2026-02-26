
'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
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
}

const SessionContext = createContext<SessionContextState | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const { auth, firestore } = useFirebase();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      // Reset state for every auth change
      setIsLoading(true);
      setUser(null);
      setProfile(null);
      setError(null);
      
      if (!authUser) {
        // No user, we are done.
        setIsLoading(false);
        return;
      }
      
      // User is logged in, set the auth user object.
      setUser(authUser);

      try {
        // Fetch the profile document once.
        const profileDocRef = doc(firestore, 'users', authUser.uid);
        const docSnap = await getDoc(profileDocRef);

        if (docSnap.exists()) {
          // If profile exists, set it.
          // Note: for real-time updates on profile, a hybrid approach would be needed,
          // but for login stability, getDoc is more robust.
          const userProfile = { id: docSnap.id, ...docSnap.data() } as UserProfile;
          setProfile(userProfile);
        } else {
          // User exists in auth, but not firestore. This is a valid state for newly created users.
          setProfile(null);
          setError(new Error(`User profile not found for UID: ${authUser.uid}.`));
        }
      } catch (profileError: any) {
        // Catch errors from getDoc (e.g., permission denied)
        setProfile(null);
        setError(profileError);
      } finally {
        // CRITICAL: Ensure loading is always set to false after attempting to fetch profile.
        setIsLoading(false);
      }
    });

    // Cleanup the auth listener on unmount
    return () => unsubscribe();
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
      isAdmin: isAdmin,
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
