'use client';

import React, { createContext, useState, useEffect, useMemo, useCallback, useContext } from 'react';
import { useUser, useFirestore, useAuth } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import type { UserRole } from './permissions';
import { User, signOut } from 'firebase/auth';

export interface SessionState {
  user: User | null;
  profile: UserProfile | null;
  role: UserRole | null;
  isLoading: boolean;
  isAdmin: boolean;
  isOrdersManager: boolean;
  isFinanceManager: boolean;
  isProductManager: boolean;
  isStaff: boolean;
  isDropshipper: boolean;
  refreshSession: () => void;
}

export const SessionContext = createContext<SessionState | undefined>(undefined);

// Define keys for localStorage
const USER_ROLE_CACHE_KEY = 'kmt-user-role';
const USER_PROFILE_CACHE_KEY = 'kmt-user-profile';

// Helper to get cached data safely
function getCachedData<T>(key: string): T | null {
    if (typeof window === 'undefined') return null;
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
    } catch (e) {
        console.error(`Failed to parse cached data for key: ${key}`, e);
        return null;
    }
}

// Helper to set cached data safely
function setCachedData<T>(key: string, data: T) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.error(`Failed to cache data for key: ${key}`, e);
    }
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { user: authUser, isUserLoading: isAuthLoading } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  
  // Initialize state with cached data for instant UI response on reload
  const [profile, setProfile] = useState<UserProfile | null>(() => getCachedData<UserProfile>(USER_PROFILE_CACHE_KEY));
  const [role, setRole] = useState<UserRole | null>(() => getCachedData<UserRole>(USER_ROLE_CACHE_KEY));
  const [isProfileLoading, setIsProfileLoading] = useState(true);

  const clearSession = useCallback(() => {
    setProfile(null);
    setRole(null);
    if (typeof window !== 'undefined') {
        localStorage.removeItem(USER_PROFILE_CACHE_KEY);
        localStorage.removeItem(USER_ROLE_CACHE_KEY);
    }
  }, []);

  const fetchAndCacheProfile = useCallback(async (user: User) => {
    if (!firestore || !auth) return;

    // If we don't have a cached profile, we are in a hard loading state.
    if (!profile) {
      setIsProfileLoading(true);
    }

    try {
      const userDocRef = doc(firestore, 'users', user.uid);
      const docSnap = await getDoc(userDocRef);

      if (docSnap.exists()) {
        const userProfile = docSnap.data() as UserProfile;

        if (!userProfile.role) {
            console.error(`Critical Inconsistency: User profile for UID ${user.uid} is missing a 'role'. Forcing sign-out.`);
            await signOut(auth); // Use await here to be sure
            clearSession();
            return; // Stop execution
        }
        
        // Update state and cache
        setProfile(userProfile);
        setRole(userProfile.role);
        setCachedData(USER_PROFILE_CACHE_KEY, userProfile);
        setCachedData(USER_ROLE_CACHE_KEY, userProfile.role);

      } else {
        console.error(`Critical Inconsistency: User is authenticated (UID: ${user.uid}) but profile document is missing. Forcing sign-out.`);
        await signOut(auth); // Use await here
        clearSession();
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      // In case of a network error, we rely on the cached data and don't clear the session.
    } finally {
      setIsProfileLoading(false);
    }
  }, [firestore, auth, clearSession, profile]);

  useEffect(() => {
    if (isAuthLoading) return;

    if (!authUser) {
      // If authUser is null, it means user is logged out. Clear everything.
      clearSession();
      setIsProfileLoading(false);
      return;
    }

    // If we have an authUser but the cached profile's ID doesn't match, it's stale data.
    if (profile?.id !== authUser.uid) {
        clearSession(); // Clear stale data before fetching new.
    }

    // Auth is resolved, user is logged in. Fetch their profile to verify and get latest data.
    fetchAndCacheProfile(authUser);

  }, [authUser, isAuthLoading, fetchAndCacheProfile, clearSession, profile]);

  const refreshSession = useCallback(() => {
    if (authUser) {
        // Clear local state but not cache, to allow for a quick re-fetch
        setProfile(null);
        setRole(null);
        fetchAndCacheProfile(authUser);
    }
  }, [authUser, fetchAndCacheProfile]);


  const sessionValue = useMemo(() => {
    // We're loading if auth is still checking, OR if we have an authenticated user but no profile data yet (on first login without cache).
    const isLoading = isAuthLoading || (!profile && !!authUser); 
    
    const isAdmin = role === 'Admin';
    const isOrdersManager = role === 'OrdersManager';
    const isFinanceManager = role === 'FinanceManager';
    const isProductManager = role === 'ProductManager';
    
    return {
      user: authUser,
      profile,
      role,
      isLoading,
      isAdmin,
      isOrdersManager,
      isFinanceManager,
      isProductManager,
      isStaff: isAdmin || isOrdersManager || isFinanceManager || isProductManager,
      isDropshipper: role === 'Dropshipper',
      refreshSession,
    };
  }, [authUser, profile, role, isAuthLoading, refreshSession]);

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
