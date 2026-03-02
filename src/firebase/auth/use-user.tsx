'use client';

import { useSession } from '@/auth/SessionProvider';
import type { User } from 'firebase/auth';

/**
 * A simple hook to get the current Firebase authenticated user object.
 * This is a convenience wrapper around `useSession` to easily access the `User` object.
 * @returns The Firebase `User` object, or `null` if not authenticated.
 */
export function useUser(): User | null {
  const { user } = useSession();
  return user;
}
