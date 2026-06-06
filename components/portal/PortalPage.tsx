'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import Navbar from '@/components/layout/Navbar'
import AppFooter from '@/components/layout/AppFooter'
import PortalSidebar from './PortalSidebar'

// ── New real-data components s ────────────
import { Dashboard }    from './Dashboard'           
import SubjectsView     from './SubjectsView'         
import AttendanceView   from './AttendanceView'        
import FeesView         from './FeesView'              
import { ParentSwitch } from './ParentSwitch'
import { StudentProjects } from './StudentProjects'         

// ── Keep using PortalViews for sections not yet reworked ──────────────────
import { ReportCard, ParentNotifications } from './PortalViews'

import { SchoolPolicyHandbook } from './PortalViews'
import { SchemeOfWorkView } from '@/components/dashboard/StudentDashboard'
import { PageType, RoleType } from './portalTypes'
import { portalApi } from '@/lib/api'
import { useAuthStoreMounted } from '@/lib/auth-store'

const PAGE_TITLES: Record<PageType, string> = {
  dashboard:     'Dashboard Overview',
  subjects:      'Subjects & Scores',
  fees:          'School Fees',
  attendance:    'Attendance',
  reportcard:    'Report Card',
  switch:        'My Children',
  notifications: 'Notifications',
  projects:      'Assignments/Projects',
  scheme:        'Scheme of Work',
  policy:        'School Policy & Student Handbook',
}

export default function PortalPage() {
  const searchParams                      = useSearchParams()
  const { user, role: authRole, mounted } = useAuthStoreMounted()
  const [page,          setPage]          = useState<PageType>('dashboard')
  const [role,          setRole]          = useState<RoleType>('student')
  const [selectedChildId, setSelectedChildId] = useState<string>('')

  const selectedNotificationId = searchParams.get('notification')

  // ── Role from auth ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!mounted) return
    setRole(authRole === 'parent' ? 'parent' : 'student')
  }, [authRole, mounted])

  // ── URL param for notifications ────────────────────────────────────────
  useEffect(() => {
    const pageParam = searchParams.get('page')
    if (pageParam && Object.prototype.hasOwnProperty.call(PAGE_TITLES, pageParam)) {
      const nextPage = pageParam as PageType
      if (nextPage === 'notifications' || nextPage === 'switch') {
        setRole('parent')
      }
      setPage(nextPage)
    }
  }, [searchParams])

  // ── Fetch children / own student record ───────────────────────────────
  const { data: children = [] } = useQuery({
    queryKey: ['portal-children'],
    queryFn:  () => portalApi.getChildren().then(r => r.data),
    enabled:  mounted,
  })

  // Default to first child once loaded
  useEffect(() => {
    if (children.length > 0 && !selectedChildId) {
      setSelectedChildId(children[0].student_id)
    }
  }, [children, selectedChildId])

  const activeChild = children.find((c: any) => c.student_id === selectedChildId) ?? children[0]

  // ── Content ───────────────────────────────────────────────────────────
  const content = (() => {
    switch (page) {
      case 'dashboard':
        return <Dashboard role={role} studentId={selectedChildId} />
      case 'subjects':
        return <SubjectsView studentId={selectedChildId} />
      case 'fees':
        return <FeesView studentId={selectedChildId} />
      case 'attendance':
        return <AttendanceView studentId={selectedChildId} />
      case 'reportcard':
        return <ReportCard studentId={selectedChildId} />
      case 'switch':
        return (
          <ParentSwitch
            children={children}
            activeChildId={selectedChildId}
            onSelect={(id: string) => { setSelectedChildId(id); setPage('dashboard') }}
          />
        )
      case 'notifications':
        return <ParentNotifications selectedNotificationId={selectedNotificationId} baseHref="/portal?page=notifications" />
      case 'projects':
        return <StudentProjects studentId={selectedChildId} />
      case 'scheme':
        return <SchemeOfWorkView />
      case 'policy':
        return <SchoolPolicyHandbook role={role} />
      default:
        return <Dashboard role={role} studentId={selectedChildId} />
    }
  })()

  return (
    <div style={{ minHeight: '100vh', background: '#F7F5F0', color: '#0D0D0D' }}>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <PortalSidebar
          page={page}
          role={role}
          setRole={setRole}
          setPage={setPage}
          activeChild={activeChild}
          childCount={children.length}
        />

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <Navbar
            userName={mounted ? user?.name  : 'User'}
            userEmail={mounted ? user?.email : ''}
            userRole={role === 'parent' ? 'Parent' : 'Student'}
            settingsHref="/portal"
            getNotificationHref={(id) => `/portal?page=notifications&notification=${id}`}
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
                  {activeChild && (
                    <span style={{ background: '#FFFFFF', border: '1px solid #E8E4DC', borderRadius: 999, padding: '10px 14px', fontSize: 12, color: '#5C5750', fontWeight: 600 }}>
                      {activeChild.name} · {activeChild.class_section}
                    </span>
                  )}
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
