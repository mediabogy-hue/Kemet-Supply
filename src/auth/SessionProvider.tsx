

'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import { UserProfile } from '@/lib/types';
import { useRouter, usePathname } from 'next/navigation';
import { getDefaultPath, hasPermission } from './permissions';

type SessionContextType = {
  user: User | null;
  profile: UserProfile | null;
  role: UserProfile['role'] | null;
  isLoading: boolean;
  error: string | null;
  isAdmin: boolean;
  isOrdersManager: boolean;
  isFinanceManager: boolean;
  isMerchant: boolean;
  isStaff: boolean;
  isDropshipper: boolean;
  refreshSession: () => void;
};

const SessionContext = createContext<SessionContextType | null>(null);

const loadSessionData = async (firestore: any, user: User): Promise<{ profile: UserProfile | null, role: UserProfile['role'] | null }> => {
    if (!firestore || !user) {
        return { profile: null, role: null };
    }
    const userDocRef = doc(firestore, 'users', user.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
        const profile = userDocSnap.data() as UserProfile;
        // The role from the user document is the source of truth
        return { profile, role: profile.role };
    }
    // Fallback for older accounts that might not have the role field
    const adminRoleRef = doc(firestore, 'roles_admin', user.uid);
    const adminRoleSnap = await getDoc(adminRoleRef);
    if (adminRoleSnap.exists()) {
        const profile = { email: user.email, role: 'Admin' } as UserProfile;
        return { profile, role: 'Admin' };
    }

    return { profile: null, role: null };
};


export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { auth, firestore } = useFirebase();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserProfile['role'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshSession = useCallback(async () => {
    if (auth?.currentUser && firestore) {
      setIsLoading(true);
      const { profile: refreshedProfile, role: refreshedRole } = await loadSessionData(firestore, auth.currentUser);
      setProfile(refreshedProfile);
      setRole(refreshedRole);
      setIsLoading(false);
    }
  }, [auth, firestore]);
  
  useEffect(() => {
    if (!auth || !firestore) {
      setIsLoading(false);
      return;
    };

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setIsLoading(true);
      if (firebaseUser) {
        try {
            setUser(firebaseUser);
            const { profile: loadedProfile, role: loadedRole } = await loadSessionData(firestore, firebaseUser);
            setProfile(loadedProfile);
            setRole(loadedRole);
            
            if (!loadedProfile) {
                setError("User profile not found in database.");
            }

        } catch (e: any) {
            console.error("Failed to load session data:", e);
            setError("Failed to load user session. Please try again.");
            // Gracefully clear session data on error instead of crashing
            setUser(null);
            setProfile(null);
            setRole(null);
        }

      } else {
        setUser(null);
        setProfile(null);
        setRole(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [auth, firestore]);
  
  const contextValue = useMemo(() => ({
    user,
    profile,
    role,
    isLoading,
    error,
    isAdmin: role === 'Admin',
    isOrdersManager: role === 'OrdersManager' || role === 'Admin',
    isFinanceManager: role === 'FinanceManager' || role === 'Admin',
    isMerchant: role === 'Merchant' || role === 'Admin',
    isStaff: ['Admin', 'OrdersManager', 'FinanceManager', 'Merchant'].includes(role || ''),
    isDropshipper: role === 'Dropshipper',
    refreshSession,
  }), [user, profile, role, isLoading, error, refreshSession]);


  return (
    <SessionContext.Provider value={contextValue}>
      {children}
    </SessionContext.Provider>
  );
}

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};
