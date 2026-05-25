'use client'
import { useState, useEffect } from 'react'
import Navbar from '@/components/layout/Navbar'
import AppFooter from '@/components/layout/AppFooter'
import PortalSidebar from './PortalSidebar'
import { Dashboard, Subjects, Fees, Attendance, ReportCard, ParentSwitch } from './PortalViews'
import { PageType, RoleType } from './portalTypes'

import { useAuthStore } from '@/lib/auth-store';

const PAGE_TITLES: Record<PageType, string> = {
  dashboard: 'Dashboard Overview',
  subjects: 'Subjects & Scores',
  fees: 'School Fees',
  attendance: 'Attendance',
  reportcard: 'Report Card',
  switch: 'My Children',
}

export default function PortalPage() {

  const { user, logout } = useAuthStore();
  const [role, setRole] = useState<RoleType>('student')
  const [page, setPage] = useState<PageType>('dashboard')
  const [activeChild, setActiveChild] = useState(0)
  // const portalUser = role === 'parent'
  //   ? { name: 'Parent User', email: 'parent@school.edu', role: 'Parent' }
  //   : { name: 'Student User', email: 'student@school.edu', role: 'Student' }

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render anything until client has hydrated
  if (!mounted) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <p>Loading...</p>
      </div>
    );
  }

  const displayName =  user?.name || 'Student User'
  const displayRole  = user?.role  ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Student'
  const displayEmail = user?.email || 'student@school.edu'

  const content = (() => {
    switch (page) {
      case 'dashboard':
        return <Dashboard role={role} />
      case 'subjects':
        return <Subjects />
      case 'fees':
        return <Fees />
      case 'attendance':
        return <Attendance />
      case 'reportcard':
        return <ReportCard />
      case 'switch':
        return <ParentSwitch activeChild={activeChild} setActiveChild={setActiveChild} />
      default:
        return <Dashboard role={role} />
    }
  })()

  return (
    <div style={{ minHeight: '100vh', background: '#F7F5F0', color: '#0D0D0D' }}>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <PortalSidebar page={page} role={role} setRole={setRole} setPage={setPage} />

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <Navbar
            userName={displayName}
            userEmail={displayEmail}
            userRole={displayRole}
            settingsHref="/portal"
          />

          <main style={{ flex: 1, padding: '28px 26px 32px' }}>
            <div style={{ maxWidth: 1300, margin: '0 auto' }}>
              <header style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 11, color: '#5C5750', letterSpacing: 1.2, textTransform: 'uppercase', fontFamily: 'monospace' }}>
                      Parent/Student Portal
                    </p>
                    <h1 style={{ margin: '8px 0 0', fontSize: 34, fontFamily: "'Georgia',serif", color: '#0D0D0D', fontWeight: 400 }}>
                      {PAGE_TITLES[page]}
                    </h1>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ background: '#FFFFFF', border: '1px solid #E8E4DC', borderRadius: 999, padding: '10px 14px', fontSize: 12, color: '#5C5750', fontWeight: 600 }}>
                    Active view: {PAGE_TITLES[page]}
                  </span>
                  <span style={{ background: '#FFFFFF', border: '1px solid #E8E4DC', borderRadius: 999, padding: '10px 14px', fontSize: 12, color: '#5C5750', fontWeight: 600 }}>
                    Portal role: {role}
                  </span>
                </div>
              </header>

              <section>{content}</section>
            </div>
          </main>
          <AppFooter />
        </div>
      </div>
    </div>
  )
}
