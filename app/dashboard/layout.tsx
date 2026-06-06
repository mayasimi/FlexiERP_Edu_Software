'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore()
  const router = useRouter()
  const allowUnauthenticated = ['1', 'true', 'yes'].includes((process.env.NEXT_PUBLIC_AUTH_BYPASS ?? '').toLowerCase())

  useEffect(() => {
    if (!allowUnauthenticated && !isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [allowUnauthenticated, isAuthenticated, isLoading, router])

  if (isLoading || (!allowUnauthenticated && !isAuthenticated)) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <p>Loading...</p>
      </div>
    )
  }

  return <>{children}</>
}
