'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStoreMounted } from '@/lib/auth-store';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, mounted } = useAuthStoreMounted();
  const router = useRouter();

  useEffect(() => {
    // Only redirect AFTER mounted and loading is done
    if (mounted && !isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [mounted, isAuthenticated, isLoading, router]);

  // Show loading while store is hydrating from localStorage
  if (!mounted || isLoading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <p>Loading...</p>
      </div>
    );
  }

  // Don't flash content if not authenticated
  if (!isAuthenticated) return null;

  return <>{children}</>;
}