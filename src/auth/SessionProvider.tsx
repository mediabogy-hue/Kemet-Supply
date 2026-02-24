'use client';

import React, { createContext, useState, useEffect, useMemo, useCallback, useContext } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import type { UserRole } from './permissions';
import { User } from 'firebase/auth';

export interface SessionState {
  user: User | null;
  profile: UserProfile | null;
  role: UserRole | null;
  isLoading: boolean; // True if either auth or profile is loading
  error: string | null;
  isAdmin: boolean;
  isOrdersManager: boolean;
  isFinanceManager: boolean;
  isProductManager: boolean;
  isStaff: boolean;
  isDropshipper: boolean;
  refreshSession: () => void;
}

export const SessionContext = createContext<SessionState | undefined>(undefined);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { user: authUser, isUserLoading: isAuthLoading } = useUser();
  const firestore = useFirestore();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async (user: User) => {
    if (!firestore) {
        setError("Firestore service is not available.");
        setProfileLoading(false);
        return;
    };
    
    setProfileLoading(true);
    setError(null);

    try {
      const userDocRef = doc(firestore, 'users', user.uid);
      const docSnap = await getDoc(userDocRef);

      if (docSnap.exists()) {
        const userProfile = docSnap.data() as UserProfile;
        if (!userProfile.role) {
            // This is a critical data integrity issue.
            throw new Error(`User profile for ${user.uid} is missing a 'role'.`);
        }
        setProfile(userProfile);
      } else {
        // This case should ideally not happen for a logged-in user if registration is correct.
        // It indicates a severe data inconsistency.
        throw new Error(`User profile document not found for user ${user.uid}. The user may be in an inconsistent state.`);
      }
    } catch (e: any) {
      console.error("SessionProvider Error (fetchProfile):", e);
      setError(e.message || "An unknown error occurred while fetching your profile.");
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  }, [firestore]);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }
    if (!authUser) {
      setProfile(null);
      setProfileLoading(false);
      setError(null);
      return;
    }
    fetchProfile(authUser);
  }, [authUser, isAuthLoading, fetchProfile]);
  
  const refreshSession = useCallback(() => {
    if (authUser) {
        fetchProfile(authUser);
    }
  }, [authUser, fetchProfile]);

  const sessionValue = useMemo(() => {
    const role = profile?.role || null;
    const isAdmin = role === 'Admin';
    const isOrdersManager = role === 'OrdersManager';
    const isFinanceManager = role === 'FinanceManager';
    const isProductManager = role === 'ProductManager';
    
    return {
      user: authUser,
      profile,
      role,
      isLoading: isAuthLoading || profileLoading,
      error,
      isAdmin,
      isOrdersManager,
      isFinanceManager,
      isProductManager,
      isStaff: isAdmin || isOrdersManager || isFinanceManager || isProductManager,
      isDropshipper: role === 'Dropshipper',
      refreshSession,
    };
  }, [authUser, profile, isAuthLoading, profileLoading, error, refreshSession]);

  return (
    <SessionContext.Provider value={sessionValue}>
      {children}
    </SessionContext.Provider>
  );
}

export const useSession = (): SessionState => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};
