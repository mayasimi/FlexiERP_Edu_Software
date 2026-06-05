'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard, UserPlus, CreditCard, BookOpen, Package,
  CalendarDays, ClipboardCheck, Settings, Users, Mail,
  User, BarChart3, ExternalLink, Zap, FileText, Bell,
  ClipboardList, WalletCards, LogOut
} from 'lucide-react'
import { useAuthStoreMounted } from '@/lib/auth-store'
import { cn } from '@/lib/utils'

const adminNavItems = [
  { label: 'Dashboard',        href: '/dashboard',       icon: LayoutDashboard },
  { label: 'Admission',        href: '/admission',       icon: UserPlus },
  { label: 'Fee Management',   href: '/fee-management',  icon: CreditCard },
  { label: 'Payroll',          href: '/admin/payroll',   icon: WalletCards },
  { label: 'Academics',        href: '/academics',       icon: BookOpen },
  { label: 'Inventory',        href: '/inventory',       icon: Package },
  { label: 'Timetable',        href: '/timetable',       icon: CalendarDays },
  { label: 'Attendance',       href: '/attendance',      icon: ClipboardCheck },
  { label: 'Settings',         href: '/settings',        icon: Settings },
  { label: 'Staff Management', href: '/staff',           icon: Users },
  { label: 'Messaging',        href: '/messaging',       icon: Mail },
  { label: 'Student Info',     href: '/students',        icon: User },
  { label: 'Reports',          href: '/reports',         icon: BarChart3 },
  { label: 'Results',          href: '/results',         icon: Zap },
  { label: 'Report Card',      href: '/report-card',     icon: FileText },
  { label: 'Portal',           href: '/portal',          icon: ExternalLink },
]

const studentNavItems = [
  { label: 'Dashboard',             href: '/dashboard',       icon: LayoutDashboard },
  { label: 'Assignments/Projects',  href: '/projects',        icon: ClipboardList },
  { label: 'Subjects & Scores',     href: '/subjects',        icon: BookOpen },
  { label: 'Scheme of Work',        href: '/scheme-of-work',  icon: CalendarDays },
  { label: 'School Fees',           href: '/fees',            icon: CreditCard },
  { label: 'Attendance',            href: '/attendance',      icon: ClipboardCheck },
  { label: 'Report Card',           href: '/report-card',     icon: FileText },
  { label: 'Portal',                href: '/portal',          icon: ExternalLink },
]

const parentNavItems = [
  { label: 'My Children',       href: '/switch',          icon: Users },
  { label: 'Notifications',     href: '/notifications',   icon: Bell },
  { label: 'Dashboard',         href: '/dashboard',       icon: LayoutDashboard },
  { label: 'Subjects & Scores', href: '/subjects',        icon: BookOpen },
  { label: 'School Fees',       href: '/fees',            icon: CreditCard },
  { label: 'Attendance',        href: '/attendance',      icon: ClipboardCheck },
  { label: 'Report Card',       href: '/report-card',     icon: FileText },
  { label: 'Portal',            href: '/portal',          icon: ExternalLink },
]

export default function Sidebar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { role, user, logout, mounted } = useAuthStoreMounted()
  const [resultsOpen, setResultsOpen] = useState(false)
  const resultsTab = searchParams.get('tab') || 'view'

  // Return null on server to prevent hydration mismatch
  if (!mounted) return null

  const navItems =
    role === 'student' ? studentNavItems :
    role === 'parent'  ? parentNavItems  :
    adminNavItems

  const displayName = (mounted ? user?.name : null) || 'User'
  const initials    = displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <aside className="sidebar">
      <nav className="flex-1 overflow-y-auto py-2 space-y-0.5">
        {navItems.map(({ label, href, icon: Icon }) => {
          if (role !== 'student' && role !== 'parent' && href === '/results') {
            const parentActive = pathname === '/results' || pathname.startsWith('/results/')
            const children = [
              { label: 'Result Settings', href: '/results?tab=settings', active: pathname === '/results' && resultsTab === 'settings' },
              { label: 'View Results', href: '/results?tab=view', active: pathname === '/results' && resultsTab === 'view' },
            ]
            return (
              <div key={href} className="px-2">
                <button
                  type="button"
                  onClick={() => setResultsOpen((v) => !v)}
                  className={cn('sidebar-nav-item w-full', parentActive && 'active')}
                  aria-expanded={resultsOpen}
                >
                  <Icon size={16} />
                  <span className="flex-1">{label}</span>
                  <span style={{ transform: resultsOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s ease', opacity: 0.8 }}>
                    ▶
                  </span>
                </button>

                {resultsOpen ? (
                  <div className="mt-1 space-y-0.5">
                    {children.map((c) => (
                      <Link
                        key={c.href}
                        href={c.href}
                        className={cn('sidebar-nav-item', c.active && 'active')}
                        style={{ marginLeft: 12, width: 'calc(100% - 12px)' }}
                      >
                        <span style={{ width: 6, height: 6, borderRadius: 999, background: c.active ? '#C9A020' : 'rgba(255,255,255,0.35)' }} />
                        <span>{c.label}</span>
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            )
          }

          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link key={href} href={href}
              className={cn('sidebar-nav-item', active && 'active')}>
              <Icon size={16} />
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* ── User info + Logout ── */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '12px' }}>
        {/* User info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', marginBottom: 4 }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: 'rgba(201,160,32,0.25)', color: '#C9A020',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, flexShrink: 0,
          }}>
            {initials}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {displayName}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', textTransform: 'capitalize' }}>
              {mounted ? (role ?? '') : ''}
            </div>
          </div>
        </div>

        {/* Logout button */}
        <button
          type="button"
          onClick={() => logout()}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            width: '100%', padding: '8px 12px', borderRadius: 8,
            background: 'transparent', border: 'none',
            color: 'rgba(255,255,255,0.45)', cursor: 'pointer',
            fontSize: 13, fontFamily: 'inherit',
            transition: 'color 0.18s ease, background 0.18s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = '#EF4444'
            e.currentTarget.style.background = 'rgba(239,68,68,0.08)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = 'rgba(255,255,255,0.45)'
            e.currentTarget.style.background = 'transparent'
          }}
        >
          <LogOut size={15} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  )
}
