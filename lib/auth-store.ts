import { create } from 'zustand'
import { authApi } from './api'

interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'staff' | 'teacher'
  avatar?: string
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  fetchMe: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: typeof window !== 'undefined' ? localStorage.getItem('edu_token') : null,
  isAuthenticated: false,
  isLoading: false,

  login: async (email, password) => {
    set({ isLoading: true })
    try {
      const res = await authApi.login(email, password)
      const { token, user } = res.data
      localStorage.setItem('edu_token', token)
      set({ token, user, isAuthenticated: true, isLoading: false })
    } catch (err) {
      set({ isLoading: false })
      throw err
    }
  },

  logout: async () => {
    try { await authApi.logout() } catch {}
    localStorage.removeItem('edu_token')
    set({ user: null, token: null, isAuthenticated: false })
    window.location.href = '/login'
  },

  fetchMe: async () => {
    try {
      const res = await authApi.me()
      set({ user: res.data, isAuthenticated: true })
    } catch {
      localStorage.removeItem('edu_token')
      set({ user: null, token: null, isAuthenticated: false })
    }
  },
}))
