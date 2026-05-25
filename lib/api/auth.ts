/**
 * lib/api/auth.ts
 *
 * All authentication-related API calls live here.
 * Components import from this file; they never call apiClient directly.
 */

import { apiClient } from './client';

/*
|--------------------------------------------------------------------------
| Types
|--------------------------------------------------------------------------
*/

export type UserRole = 'admin' | 'teacher' | 'student' | 'parent';

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  school_id: string | null;
  last_login: string | null;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type LoginResponse = {
  user: AuthUser;
  token: string;
};

/*
|--------------------------------------------------------------------------
| Auth calls
|--------------------------------------------------------------------------
*/

export const authApi = {
  /**
   * POST /api/auth/login
   * Returns the authenticated user + a bearer token.
   */
  login: (payload: LoginPayload) =>
    apiClient.post<LoginResponse>('/auth/login', payload),

  /**
   * POST /api/auth/logout
   * Revokes the current token on the server.
   */
  logout: (token: string) =>
    apiClient.post<{ message: string }>('/auth/logout', {}, token),

  /**
   * GET /api/auth/me
   * Fetches the current authenticated user (e.g. on page refresh).
   */
  me: (token: string) =>
    apiClient.get<{ user: AuthUser }>('/auth/me', token),
};
