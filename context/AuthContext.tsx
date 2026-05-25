'use client';

/**
 * context/AuthContext.tsx
 *
 * Provides authentication state to the entire application.
 * Wrap your root layout with <AuthProvider> so every page
 * and component can access the current user via useAuth().
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { authApi, type AuthUser, type LoginPayload } from '@/lib/api/auth';

/*
|--------------------------------------------------------------------------
| Types
|--------------------------------------------------------------------------
*/

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
};

/*
|--------------------------------------------------------------------------
| Context
|--------------------------------------------------------------------------
*/

const AuthContext = createContext<AuthContextValue | null>(null);

/*
|--------------------------------------------------------------------------
| Token helpers  (localStorage keeps the frontend stateless between pages)
|--------------------------------------------------------------------------
*/

const TOKEN_KEY = 'flexi_token';

function saveToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

/*
|--------------------------------------------------------------------------
| Provider
|--------------------------------------------------------------------------
*/

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser]         = useState<AuthUser | null>(null);
  const [isLoading, setLoading] = useState(true);

  /**
   * On mount: check whether a stored token is still valid.
   * This restores the session after a page refresh.
   */
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    authApi
      .me(token)
      .then(({ user }) => setUser(user))
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  /**
   * Login: call the API, persist the token, update state.
   */
  const login = useCallback(async (payload: LoginPayload) => {
    const { user, token } = await authApi.login(payload);
    saveToken(token);
    setUser(user);
    // Redirect based on role
    router.push(roleDashboard(user.role));
  }, [router]);

  /**
   * Logout: revoke token on server, clear local state.
   */
  const logout = useCallback(async () => {
    const token = getToken();
    if (token) {
      await authApi.logout(token).catch(() => { /* best-effort */ });
    }
    clearToken();
    setUser(null);
    router.push('/login');
  }, [router]);

  const value: AuthContextValue = {
    user,
    isLoading,
    isAuthenticated: user !== null,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/*
|--------------------------------------------------------------------------
| Hook
|--------------------------------------------------------------------------
*/

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/*
|--------------------------------------------------------------------------
| Helper: map role → dashboard path
|--------------------------------------------------------------------------
*/

function roleDashboard(role: AuthUser['role']): string {
  const map: Record<string, string> = {
    admin:   '/dashboard',
    teacher: '/instructor-dashboard',
    student: '/portal',
    parent:  '/portal',
  };
  return map[role] ?? '/dashboard';
}
