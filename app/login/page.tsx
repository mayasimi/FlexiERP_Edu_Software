'use client'
import { useEffect, useState, type FormEvent } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import AppFooter from '@/components/layout/AppFooter'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/lib/auth-store'
import Image from 'next/image'

export default function LoginPage() {
  const { login, isLoading } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [remember, setRemember] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const savedEmail = localStorage.getItem('edu_remember_email')
    if (savedEmail) {
      setEmail(savedEmail)
      setRemember(true)
    }
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      await login(email, password)
      if (remember) {
        localStorage.setItem('edu_remember_email', email)
      } else {
        localStorage.removeItem('edu_remember_email')
      }
      toast.success('Welcome back!')
    } catch (err: any) {
      const message = err?.response?.data?.message ?? 'Invalid credentials. Please try again.'
      setError(message)
      toast.error(message)
    }
  }

  return (
    <div className="min-h-screen flex flex-col"
         style={{ background: '#F7F6F3', fontFamily: '"Palatino Linotype", Palatino, serif' }}>
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-10">

      {/* Logo */}
      <div className="flex items-center justify-center gap-3 mb-8">
          <Image
            src="/FLEXI_LOGO.png"
            alt="FlexiERP Logo"
            width={200}
            height={200}
            priority
            className="object-contain"
          />
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-white rounded-2xl p-8"
           style={{ border: '1px solid #E4E1D8', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>

        <h1 className="text-2xl font-bold text-center mb-1" style={{ color: '#0D0D0D' }}>Welcome Back</h1>
        <p className="text-sm text-center mb-7" style={{ color: '#6B6660' }}>Sign in to your account</p>
         
        {error && (
          <p role="alert" style={{ color: 'red', margin: 0 }}>
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold tracking-widest uppercase mb-2"
                   style={{ color: '#6B6660' }}>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@school.com"
              required
              autoComplete="email"
              className="input"
            />
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <label className="text-xs font-semibold tracking-widest uppercase"
                     style={{ color: '#6B6660' }}>Password</label>
              <button
                type="button"
                onClick={() => toast('Password reset is not configured yet.')}
                className="text-xs font-medium"
                style={{ color: '#C9A020' }}>
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="input pr-11"
              />
              <button type="button" onClick={() => setShowPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ color: '#6B6660' }}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer">
            <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
                   className="rounded" style={{ accentColor: '#C9A020' }} />
            <span className="text-sm" style={{ color: '#6B6660' }}>Remember me</span>
          </label>

          <button type="submit" disabled={isLoading}
                  className="w-full py-3 rounded-xl text-white font-semibold transition-all duration-200"
                  style={{ background: isLoading ? '#A08018' : '#C9A020' }}>
            {isLoading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <a href="#" className="text-sm font-medium" style={{ color: '#C9A020' }}>
            Try demo version
          </a>
        </div>
      </div>

      </main>
      <AppFooter compact />
    </div>
  )
}
