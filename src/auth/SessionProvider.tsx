'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { onSnapshot } from 'firebase/firestore';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc } from 'firebase/firestore';
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
  const { auth, firestore } = useFirebase(); // Consume the Firebase context
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const authUnsubscribe = onAuthStateChanged(auth, (authUser) => {
      if (!authUser) {
        setUser(null);
        setProfile(null);
        setIsLoading(false);
        setError(null);
        return;
      }
      
      setUser(authUser);
      const profileDocRef = doc(firestore, 'users', authUser.uid);
      
      const profileUnsubscribe = onSnapshot(profileDocRef, 
        (docSnap) => {
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
            setError(null);
          } else {
            setProfile(null);
            setError(new Error(`User profile not found for UID: ${authUser.uid}. This might happen if the user record was deleted or not created properly.`));
          }
          setIsLoading(false);
        },
        (profileError) => {
          console.error("Error fetching user profile:", profileError);
          setProfile(null);
          setError(profileError);
          setIsLoading(false);
        }
      );

      return () => profileUnsubscribe();
    }, 
    (authError) => {
      console.error("Auth state change error:", authError);
      setUser(null);
      setProfile(null);
      setError(authError);
      setIsLoading(false);
    });

    return () => authUnsubscribe();
  }, [auth, firestore]);

  const contextValue = useMemo((): SessionContextState => {
    const role = profile?.role || null;
    return {
      user,
      profile,
      isLoading,
      error,
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
