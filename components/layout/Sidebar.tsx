'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, UserPlus, CreditCard, BookOpen, Package,
  CalendarDays, ClipboardCheck, Settings, Users, Mail,
  User, BarChart3, ExternalLink, LogOut, Zap, FileText
} from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
import { cn } from '@/lib/utils'

const navItems = [
  { label: 'Dashboard',       href: '/dashboard',       icon: LayoutDashboard },
  { label: 'Admission',       href: '/admission',       icon: UserPlus },
  { label: 'Fee Management',  href: '/fee-management',  icon: CreditCard },
  { label: 'Academics',       href: '/academics',       icon: BookOpen },
  { label: 'Inventory',       href: '/inventory',       icon: Package },
  { label: 'Timetable',       href: '/timetable',       icon: CalendarDays },
  { label: 'Attendance',      href: '/attendance',      icon: ClipboardCheck },
  { label: 'Settings',        href: '/settings',        icon: Settings },
  { label: 'Staff Management',href: '/staff',           icon: Users },
  { label: 'Messaging',       href: '/messaging',       icon: Mail },
  { label: 'Student Info',    href: '/students',        icon: User },
  { label: 'Reports',         href: '/reports',         icon: BarChart3 },
  { label: 'Results',         href: '/results',         icon: Zap },
  { label: 'Report Card',     href: '/report-card',     icon: FileText },
  { label: 'Portal',          href: '/portal',          icon: ExternalLink },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuthStore()

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
             style={{ background: 'rgba(201,160,32,0.15)', border: '1px solid rgba(201,160,32,0.3)' }}>
          <BookOpen size={18} style={{ color: '#C9A020' }} />
        </div>
        <div>
          <div className="font-bold text-white text-base leading-tight">EduManage</div>
          <div className="text-xs leading-tight" style={{ color: 'rgba(255,255,255,0.45)' }}>School Administration</div>
        </div>
      </div>

      {/* Term Badge */}
      <div className="px-4 py-2.5">
        <div className="rounded-lg px-3 py-2 text-xs font-medium"
             style={{ background: 'rgba(201,160,32,0.10)', color: '#C9A020', border: '1px solid rgba(201,160,32,0.2)' }}>
          📅 2025 – Spring Term
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 space-y-0.5">
        {navItems.map(({ label, href, icon: Icon }) => {
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

      {/* Bottom: User + Logout */}
      <div className="border-t p-3 space-y-1" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <Link href="/profile" className="sidebar-nav-item">
          <div className="w-6 h-6 rounded-full bg-gold/30 flex items-center justify-center text-xs font-bold"
               style={{ color: '#C9A020' }}>
            {user ? (user.name?.[0] ?? 'A') : 'A'}
          </div>
          <span>Admin Profile</span>
        </Link>
        <button onClick={logout} className="sidebar-nav-item w-full text-left hover:text-red-400">
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  )
}
