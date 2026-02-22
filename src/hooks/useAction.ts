'use client';

import { useState, useCallback } from 'react';
import { safeAction } from '@/lib/safeAction';

type ActionState<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
};

export function useAction<T>() {
  const [state, setState] = useState<ActionState<T>>({
    data: null,
    error: null,
    loading: false,
  });

  const run = useCallback(async (actionFn: () => Promise<T>) => {
    if (state.loading) return { ok: false as const, error: "Action already in progress."};

    setState({ data: null, error: null, loading: true });

    const result = await safeAction(actionFn);

    if (result.ok) {
      setState({ data: result.data, error: null, loading: false });
      return { ok: true as const, data: result.data };
    } else {
      setState({ data: null, error: result.error, loading: false });
      return { ok: false as const, error: result.error };
    }
  }, [state.loading]);

  const reset = useCallback(() => {
    setState({ data: null, error: null, loading: false });
  }, []);

  return {
    run,
    reset,
    ...state,
  };
}
