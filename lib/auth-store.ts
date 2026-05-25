import { create } from 'zustand'
import { authApi } from './api'
import { useState,useEffect } from 'react'
import Cookies from 'js-cookie'

interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'staff' | 'teacher' | 'parent' | 'student'
  avatar?: string
}

interface AuthState {
  user: User | null
  role: User['role'] | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  setRole: (role: User['role']) => void
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  fetchMe: () => Promise<void>
}

const TOKEN_KEY = 'edu_token'
const ROLE_KEY  = 'edu_user_role'
const USER_KEY  = 'edu_user'

const getStoredRole = () => {
  if (typeof window === 'undefined') return null
  const value = localStorage.getItem('edu_user_role')
  if (value === 'admin' || value === 'staff' || value === 'teacher' || value === 'parent' || value === 'student') {
    return value
  }
  return null
}

const getStoredUser = (): User | null => {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('edu_user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: getStoredUser(),          // ← was null, now reads from localStorage
  role: getStoredRole(),
  token: typeof window !== 'undefined' ? localStorage.getItem('edu_token') : null,
  isAuthenticated: typeof window !== 'undefined' ? !!localStorage.getItem('edu_token') : false,
  isLoading: false,

  setRole: (role) => {
    localStorage.setItem(ROLE_KEY, role)
    set({ role })
  },

  login: async (email, password) => {
    set({ isLoading: true })
    try {
      const res = await authApi.login(email, password)
      const { token, user } = res.data

      const role = user?.role ?? getStoredRole()

      // Save to localStorage
      localStorage.setItem(TOKEN_KEY, token)
      localStorage.setItem(ROLE_KEY, role ?? '')
      localStorage.setItem(USER_KEY, JSON.stringify(user))

      // Save to cookie so Next.js middleware can read it
      Cookies.set('flexi_token', token, {
        expires: 7,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      })

      set({ token, user, role, isAuthenticated: true, isLoading: false })

      // Redirect based on role
      const routes: Record<string, string> = {
        admin:   '/dashboard',
        teacher: '/instructor-dashboard',
        student: '/portal',
        parent:  '/portal',
        staff:   '/dashboard',
      }
      window.location.href = routes[role ?? ''] ?? '/dashboard'

    } catch (err) {
      set({ isLoading: false })
      throw err
    }
  },

  logout: async () => {
    try { await authApi.logout() } catch {}
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(ROLE_KEY)
    localStorage.removeItem(USER_KEY)
    Cookies.remove('flexi_token')
    set({ user: null, token: null, role: null, isAuthenticated: false })
    window.location.href = '/login'
  },

  fetchMe: async () => {
    try {
      const res = await authApi.me()
      const role = res.data?.role ?? getStoredRole()
      set({ user: res.data, role, isAuthenticated: true })
      if (role) localStorage.setItem(ROLE_KEY, role)
    } catch {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(ROLE_KEY)
      localStorage.removeItem(USER_KEY)
      Cookies.remove('flexi_token')
      set({ user: null, token: null, role: null, isAuthenticated: false })
    }
  },
  
}))


export function useAuthStoreMounted() {
  const store = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return { ...store, mounted };
}
