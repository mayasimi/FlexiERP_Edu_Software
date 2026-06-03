'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import AppLayout from '@/components/layout/AppLayout'
import Topbar from '@/components/layout/Topbar'
import { staffApi } from '@/lib/api'
import { getInitials } from '@/lib/utils'
import { Users, UserCheck, UserX, LayoutGrid, List, Eye, Pencil } from 'lucide-react'

const statusColors: Record<string, { bg: string; text: string }> = {
  Active:   { bg: '#ECFDF5', text: '#059669' },
  Inactive: { bg: '#FEF2F2', text: '#991B1B' },
  'On Leave': { bg: '#FFF7ED', text: '#C2410C' },
}

export default function StaffPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [search,   setSearch]   = useState('')
  const [dept,     setDept]     = useState('')
  const [status,   setStatus]   = useState('')

  const { data = { data: [], total: 0, current_page: 1, last_page: 1 } } = useQuery({
    queryKey: ['staff', search, dept, status],
    queryFn:  () => staffApi.list({ search, department: dept, status, per_page: 50 }).then(r => r.data),
  })

  // Compute stats from real data
  const members    = data.data ?? []
  const totalStaff = data.total ?? members.length
  const active     = members.filter((m: any) => m.status === 'Active').length
  const onLeave    = members.filter((m: any) => m.status === 'On Leave').length

  return (
    <AppLayout>
      <Topbar action={{ label: 'Add Staff Member', onClick: () => {} }} />

      <div className="page-header animate-in">
        <div className="gold-accent" />
        <h1 className="page-title">Faculty Directory</h1>
        <p className="page-subtitle">Manage institutional staff, roles, and departmental assignments.</p>
      </div>

      <div className="px-6 pb-8 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 animate-in stagger-1">
          {[
            { label: 'Total Staff',  value: totalStaff, icon: Users,      color: '#C9A020' },
            { label: 'Active Today', value: active,     icon: UserCheck,  color: '#10B981' },
            { label: 'On Leave',     value: onLeave,    icon: UserX,      color: '#F59E0B' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="stat-card">
              <div className="flex items-center justify-between">
                <span className="stat-label">{label}</span>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
                  <Icon size={16} style={{ color }} />
                </div>
              </div>
              <div className="stat-value">{value}</div>
            </div>
          ))}
        </div>

        {/* Filters + View Toggle */}
        <div className="flex flex-wrap gap-3 items-end justify-between animate-in stagger-2">
          <div className="flex gap-2 flex-wrap">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search staff..."
              className="input w-48"
            />
            <select value={dept} onChange={e => setDept(e.target.value)} className="select w-44">
              <option value="">All Departments</option>
              <option>Mathematics</option><option>Physics</option>
              <option>Administration</option><option>English</option>
              <option>Biology</option><option>Chemistry</option>
            </select>
            <select value={status} onChange={e => setStatus(e.target.value)} className="select w-36">
              <option value="">All Status</option>
              <option>Active</option><option>Inactive</option><option>On Leave</option>
            </select>
          </div>
          <div className="flex gap-1 p-1 rounded-lg" style={{ background: '#F7F6F3', border: '1px solid #E4E1D8' }}>
            <button onClick={() => setViewMode('grid')} className="p-2 rounded-md transition-all"
              style={{ background: viewMode === 'grid' ? 'white' : 'transparent', boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
              <LayoutGrid size={16} style={{ color: viewMode === 'grid' ? '#C9A020' : '#6B6660' }} />
            </button>
            <button onClick={() => setViewMode('list')} className="p-2 rounded-md transition-all"
              style={{ background: viewMode === 'list' ? 'white' : 'transparent', boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
              <List size={16} style={{ color: viewMode === 'list' ? '#C9A020' : '#6B6660' }} />
            </button>
          </div>
        </div>

        {members.length === 0 && (
          <p className="text-center py-8 text-sm" style={{ color: '#6B6660' }}>No staff records found.</p>
        )}

        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in stagger-3">
            {members.map((member: any) => {
              const sc = statusColors[member.status] ?? { bg: '#F3F4F6', text: '#4B5563' }
              return (
                <div key={member.id} className="card-hover">
                  <div className="flex justify-end mb-3">
                    <span className="badge text-xs px-2.5 py-0.5 rounded-full font-medium"
                      style={{ background: sc.bg, color: sc.text }}>
                      {member.status}
                    </span>
                  </div>
                  <div className="flex flex-col items-center text-center mb-4">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white mb-3"
                      style={{ background: 'linear-gradient(135deg, #C9A020, #8B6E10)' }}>
                      {getInitials(member.name)}
                    </div>
                    <h3 className="font-bold text-base">{member.name}</h3>
                    <p className="text-sm font-medium" style={{ color: '#C9A020' }}>{member.role}</p>
                  </div>
                  <div className="space-y-1.5 mb-4 text-sm">
                    <div className="flex items-center gap-2" style={{ color: '#6B6660' }}>
                      <span>🏛</span> {member.department}
                    </div>
                    <div className="flex items-center gap-2 truncate" style={{ color: '#6B6660' }}>
                      <span>✉</span> {member.email}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="flex-1 btn-outline text-xs py-1.5 flex items-center justify-center gap-1">
                      <Eye size={13} /> View
                    </button>
                    <button className="btn-outline px-3 py-1.5 text-xs">
                      <Pencil size={13} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="card p-0 overflow-hidden animate-in stagger-3">
            <table className="table">
              <thead>
                <tr>
                  <th>Staff Member</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m: any) => {
                  const sc = statusColors[m.status] ?? { bg: '#F3F4F6', text: '#4B5563' }
                  return (
                    <tr key={m.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg, #C9A020, #8B6E10)' }}>
                            {getInitials(m.name)}
                          </div>
                          <div>
                            <span className="font-semibold">{m.name}</span>
                            <p className="text-xs" style={{ color: '#6B6660' }}>{m.staff_id}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ color: '#6B6660' }}>{m.role}</td>
                      <td style={{ color: '#6B6660' }}>{m.department}</td>
                      <td style={{ color: '#6B6660' }}>{m.email}</td>
                      <td>
                        <span className="badge text-xs px-2.5 py-0.5 rounded-full"
                          style={{ background: sc.bg, color: sc.text }}>{m.status}</span>
                      </td>
                      <td>
                        <div className="flex gap-1">
                          <button className="btn-outline text-xs px-2.5 py-1.5 flex items-center gap-1"><Eye size={12} /> View</button>
                          <button className="btn-outline text-xs px-2.5 py-1.5"><Pencil size={12} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
