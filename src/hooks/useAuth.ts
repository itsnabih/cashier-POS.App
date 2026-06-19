'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { AuthUser } from '@/lib/auth';
import type { Permission } from '@/lib/rbac';

// ============================================================
// useAuth hook — client-side auth state
// ============================================================

interface AuthState {
  user: (AuthUser & { permissions: Permission[] }) | null;
  loading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success) {
          setState({
            user: { ...data.data.user, permissions: data.data.permissions },
            loading: false,
          });
        } else {
          setState({ user: null, loading: false });
        }
      })
      .catch(() => setState({ user: null, loading: false }));
  }, []);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }, []);

  const hasPermission = useCallback(
    (permission: Permission) => {
      if (!state.user) return false;
      return state.user.permissions.includes(permission);
    },
    [state.user]
  );

  return { ...state, logout, hasPermission };
}
