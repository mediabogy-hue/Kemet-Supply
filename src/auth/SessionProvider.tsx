'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, updateDoc, serverTimestamp, Firestore } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { UserProfile } from '@/lib/types';

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

/**
 * Loads the user profile from Firestore. This function is designed to be simple and robust.
 * It performs a single document read and avoids complex, multi-read verification logic
 * on the client-side. The role stored in the user document is trusted as the source of truth for the client.
 * @param firestore - The Firestore instance.
 * @param user - The authenticated Firebase user.
 * @returns An object containing the user's profile and role, or nulls if not found or on error.
 */
const loadSessionData = async (firestore: Firestore, user: User): Promise<{ profile: UserProfile | null; role: UserProfile['role'] | null }> => {
  const userDocRef = doc(firestore, 'users', user.uid);
  try {
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      const profile = userDocSnap.data() as UserProfile;
      // The role in the user document is the source of truth for the client.
      const role = profile.role || 'Dropshipper'; // Default to Dropshipper if role is missing.
      
      // Self-healing: If the role field is missing, update it in Firestore.
      if (!profile.role) {
        console.warn(`User ${user.uid} is missing a role. Defaulting to Dropshipper and updating profile.`);
        updateDoc(userDocRef, { role: 'Dropshipper', updatedAt: serverTimestamp() }).catch(console.error);
        profile.role = 'Dropshipper'; // Update in-memory profile for the current session.
      }
      
      return { profile, role };
    } else {
      // This case can happen if a user exists in Auth but their Firestore document was deleted
      // or failed to be created during registration.
      console.warn(`User profile not found in Firestore for UID: ${user.uid}.`);
      return { profile: null, role: null };
    }
  } catch (error) {
    console.error("Error fetching user profile:", error);
    // This could be a permissions error. We must handle it gracefully by returning nulls.
    return { profile: null, role: null };
  }
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
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setIsLoading(true);
      setError(null);

      if (firebaseUser) {
        setUser(firebaseUser);
        const { profile, role } = await loadSessionData(firestore, firebaseUser);
        setProfile(profile);
        setRole(role);
        if (!profile) {
            setError("User profile could not be loaded from the database.");
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
  
  const contextValue = useMemo(() => {
      const currentRole = role;
      return {
        user,
        profile,
        role: currentRole,
        isLoading,
        error,
        isAdmin: currentRole === 'Admin',
        isOrdersManager: currentRole === 'OrdersManager' || currentRole === 'Admin',
        isFinanceManager: currentRole === 'FinanceManager' || currentRole === 'Admin',
        isMerchant: currentRole === 'Merchant',
        isStaff: ['Admin', 'OrdersManager', 'FinanceManager'].includes(currentRole || ''),
        isDropshipper: currentRole === 'Dropshipper',
        refreshSession,
      }
  }, [user, profile, role, isLoading, error, refreshSession]);


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
