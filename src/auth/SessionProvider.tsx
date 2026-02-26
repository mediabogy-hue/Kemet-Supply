
'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
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

const loadSessionData = async (firestore: any, user: User): Promise<{ profile: UserProfile | null, role: UserProfile['role'] | null }> => {
    if (!firestore || !user) {
        return { profile: null, role: null };
    }
    const userDocRef = doc(firestore, 'users', user.uid);
    const userDocSnap = await getDoc(userDocRef);

    let profile: UserProfile | null = null;
    let primaryRole: UserProfile['role'] | null = null;

    if (userDocSnap.exists()) {
        const data = userDocSnap.data() as UserProfile;
        profile = data;
        primaryRole = data.role || null;
    }

    // Role Verification & Correction Logic
    let authoritativeRole: UserProfile['role'] | null = primaryRole;
    let verifiedRoleFromCollection: UserProfile['role'] | null = null;

    const roleChecks: Array<{ roleName: UserProfile['role'], path: string }> = [
        { roleName: 'Admin', path: `roles_admin/${user.uid}` },
        { roleName: 'Merchant', path: `roles_merchant/${user.uid}` },
        { roleName: 'OrdersManager', path: `roles_orders_manager/${user.uid}` },
        { roleName: 'FinanceManager', path: `roles_finance_manager/${user.uid}` },
    ];

    for (const check of roleChecks) {
        try {
            const roleDocSnap = await getDoc(doc(firestore, check.path));
            if (roleDocSnap.exists()) {
                verifiedRoleFromCollection = check.roleName;
                break; // Found the highest-precedence role, stop checking
            }
        } catch (e) {
            console.warn(`Could not check role at path: ${check.path}`);
        }
    }
    
    // If a role was found in a specific collection, it is the source of truth.
    if (verifiedRoleFromCollection) {
        authoritativeRole = verifiedRoleFromCollection;
    } 
    // If no specific role doc was found, but we have a profile, assume Dropshipper if role is missing.
    else if (profile && !primaryRole) {
        authoritativeRole = 'Dropshipper';
    }

    // Self-Healing: If the authoritative role differs from what's in the user profile, correct the profile.
    if (authoritativeRole && profile && profile.role !== authoritativeRole) {
        console.warn(`Correcting user role mismatch for ${user.uid}. Was: ${profile.role}, Should be: ${authoritativeRole}`);
        profile.role = authoritativeRole; // Correct in-memory profile for the current session.
        // Fire-and-forget update to the database to fix it for the future.
        updateDoc(userDocRef, { role: authoritativeRole, updatedAt: serverTimestamp() }).catch(err => {
            console.error(`Failed to self-heal user role for ${user.uid}:`, err);
        });
    }
    
    // If no profile exists at all, but we found a role, create a minimal profile.
    if (!profile && authoritativeRole) {
         profile = { 
            id: user.uid,
            email: user.email!, 
            firstName: user.displayName?.split(' ')[0] || '',
            lastName: user.displayName?.split(' ')[1] || '',
            role: authoritativeRole 
        } as UserProfile;
    }

    return { profile, role: authoritativeRole };
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
