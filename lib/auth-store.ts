import { create } from 'zustand'
import Cookies from 'js-cookie'

/*
|--------------------------------------------------------------------------
| Types
|--------------------------------------------------------------------------
*/

interface User {
  id: number
  name: string
  email: string
  role: 'admin' | 'staff' | 'teacher' | 'parent' | 'student'
  school_id?: string | null
  staff_id?: string | null
  student_id?: string | null
  role_title?: string | null
  department?: string | null
  section?: string | null
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

/*
|--------------------------------------------------------------------------
| Storage helpers
| - token  → localStorage + cookie (cookie needed for Next.js middleware)
| - user   → localStorage (restore session on refresh without API call)
| - role   → localStorage
|--------------------------------------------------------------------------
*/

const TOKEN_KEY = 'flexi_token'
const USER_KEY  = 'flexi_user'
const ROLE_KEY  = 'edu_user_role'

const VALID_ROLES = ['admin', 'staff', 'teacher', 'parent', 'student'] as const



function saveToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
  Cookies.set(TOKEN_KEY, token, {
    expires: 7,
    sameSite: 'lax',
    secure: false,
  })
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

function saveUser(user: User) {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveRole(role: string) {
  localStorage.setItem(ROLE_KEY, role)
}

function getStoredRole(): User['role'] | null {
  if (typeof window === 'undefined') return null
  const value = localStorage.getItem(ROLE_KEY)
  if (VALID_ROLES.includes(value as User['role'])) {
    return value as User['role']
  }
  return null
}

function clearAll() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  localStorage.removeItem(ROLE_KEY)
  Cookies.remove(TOKEN_KEY)
}

/*
|--------------------------------------------------------------------------
| API base URL
|--------------------------------------------------------------------------
*/

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api'

async function apiCall<T>(
  endpoint: string,
  options: { method?: string; body?: object; token?: string } = {}
): Promise<T> {

  const { method = 'GET', body, token } = options

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'ngrok-skip-browser-warning': 'true', 
  }

  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  const json = await res.json().catch(() => ({}))

  if (!res.ok) {
    const err = new Error(json.message ?? 'Request failed') as Error & { status: number }
    err.status = res.status
    throw err
  }

  return json as T
}

/*
|--------------------------------------------------------------------------
| Store
|--------------------------------------------------------------------------
*/

export const useAuthStore = create<AuthState>(() => ({
  // Restore state from localStorage on store initialisation
  user:            getStoredUser(),
  role:            getStoredRole(),
  token:           getToken(),
  isAuthenticated: !!getToken(),
  isLoading:       false,

  setRole: (role) => {
    saveRole(role)
    useAuthStore.setState({ role })
  },

  login: async (email: string, password: string) => {

    useAuthStore.setState({ isLoading: true })

    try {
      const res = await apiCall<{ user: User; token: string }>('/auth/login', {
        method: 'POST',
        body: { email, password },
      })

      const { token, user } = res
      const role = user.role

      saveToken(token)
      saveUser(user)
      saveRole(role)

      useAuthStore.setState({
        token,
        user,
        role,
        isAuthenticated: true,
        isLoading: false,
      })

    } catch (err) {
      useAuthStore.setState({ isLoading: false })
      throw err
    }
  },

  logout: async () => {
    const token = getToken()
    if (token) {
      await apiCall('/auth/logout', { method: 'POST', token }).catch(() => {})
    }
    clearAll()
    useAuthStore.setState({
      user: null,
      token: null,
      role: null,
      isAuthenticated: false,
    })
    window.location.href = '/login'
  },

  fetchMe: async () => {
    const token = getToken()
    if (!token) return

    try {
      const res = await apiCall<{ user: User }>('/auth/me', { token })
      const { user } = res
      const role = user.role

      saveUser(user)
      saveRole(role)

      useAuthStore.setState({ user, role, isAuthenticated: true })
    } catch {
      clearAll()
      useAuthStore.setState({
        user: null,
        token: null,
        role: null,
        isAuthenticated: false,
      })
    }
  },
}))

/*
|--------------------------------------------------------------------------
| Mounted hook — prevents hydration mismatch
|--------------------------------------------------------------------------
*/

import { useState, useEffect } from 'react'

export function useAuthStoreMounted() {
  const store = useAuthStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return { ...store, mounted }
}
