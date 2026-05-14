'use client'
import { Bell, Plus, Search } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
import { getInitials } from '@/lib/utils'

interface TopbarProps {
  title?: string
  action?: { label: string; onClick: () => void }
}

export default function Topbar({ title, action }: TopbarProps) {
  const { user } = useAuthStore()

  return (
    <header className="topbar">
      <div className="flex items-center gap-3 flex-1">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            placeholder="Search..."
            className="pl-9 pr-4 py-2 text-sm rounded-lg border outline-none w-56 transition-all"
            style={{ borderColor: '#E4E1D8', fontFamily: 'inherit', background: '#F7F6F3' }}
            onFocus={e => { e.target.style.borderColor = '#C9A020'; e.target.style.width = '300px' }}
            onBlur={e => { e.target.style.borderColor = '#E4E1D8'; e.target.style.width = '224px' }}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        {action && (
          <button onClick={action.onClick} className="btn-gold text-sm flex items-center gap-1.5">
            <Plus size={14} />
            {action.label}
          </button>
        )}

        {/* Notifications */}
        <button className="relative w-9 h-9 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
                style={{ border: '1px solid #E4E1D8' }}>
          <Bell size={16} style={{ color: '#0D0D0D' }} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
                style={{ background: '#C9A020' }} />
        </button>

        {/* Avatar */}
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white cursor-pointer"
             style={{ background: '#C9A020' }}>
          {user ? getInitials(user.name) : 'AD'}
        </div>
      </div>
    </header>
  )
}
