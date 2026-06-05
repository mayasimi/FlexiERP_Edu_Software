'use client'

import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import AppLayout from '@/components/layout/AppLayout'
import Topbar from '@/components/layout/Topbar'
import { getInitials } from '@/lib/utils'
import { adminMockDb } from '@/lib/admin-mock-db'
import { Eye, LayoutGrid, List, Pencil, UserCheck, Users, UserX } from 'lucide-react'

const statusColors: Record<string, { bg: string; text: string }> = {
  Active: { bg: '#ECFDF5', text: '#059669' },
  Inactive: { bg: '#FEF2F2', text: '#991B1B' },
  'On Leave': { bg: '#FFF7ED', text: '#C2410C' },
}

export default function StaffPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [search, setSearch] = useState('')
  const [dept, setDept] = useState('')
  const [status, setStatus] = useState('')

  const members = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    return adminMockDb.staff_members.filter((member) => {
      const matchesSearch =
        !normalizedSearch ||
        member.name.toLowerCase().includes(normalizedSearch) ||
        member.role.toLowerCase().includes(normalizedSearch) ||
        member.email.toLowerCase().includes(normalizedSearch)
      const matchesDept = !dept || member.department === dept
      const matchesStatus = !status || member.status === status
      return matchesSearch && matchesDept && matchesStatus
    })
  }, [dept, search, status])

  const departments = Array.from(new Set(adminMockDb.staff_members.map((member) => member.department)))
  const active = members.filter((member) => member.status === 'Active').length
  const onLeave = members.filter((member) => member.status === 'On Leave').length

  return (
    <AppLayout>
      <Topbar action={{ label: 'Add Staff Member', onClick: () => toast('Staff creation form coming soon.') }} />

      <div className="page-header animate-in">
        <div className="gold-accent" />
        <h1 className="page-title">Faculty Directory</h1>
        <p className="page-subtitle">Manage institutional staff, roles, and departmental assignments.</p>
      </div>

      <div className="px-6 pb-8 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in stagger-1">
          {[
            { label: 'Total Staff', value: members.length, icon: Users, color: '#C9A020' },
            { label: 'Active Today', value: active, icon: UserCheck, color: '#10B981' },
            { label: 'On Leave', value: onLeave, icon: UserX, color: '#F59E0B' },
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

        <div className="flex flex-wrap gap-3 items-end justify-between animate-in stagger-2">
          <div className="flex gap-2 flex-wrap">
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search staff..." className="input w-48" />
            <select value={dept} onChange={(event) => setDept(event.target.value)} className="select w-48">
              <option value="">All Departments</option>
              {departments.map((department) => <option key={department}>{department}</option>)}
            </select>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="select w-36">
              <option value="">All Status</option>
              <option>Active</option>
              <option>Inactive</option>
              <option>On Leave</option>
            </select>
          </div>
          <div className="flex gap-1 p-1 rounded-lg" style={{ background: '#F7F6F3', border: '1px solid #E4E1D8' }}>
            <button onClick={() => setViewMode('grid')} className="p-2 rounded-md transition-all" style={{ background: viewMode === 'grid' ? 'white' : 'transparent' }} aria-label="Grid view">
              <LayoutGrid size={16} style={{ color: viewMode === 'grid' ? '#C9A020' : '#6B6660' }} />
            </button>
            <button onClick={() => setViewMode('list')} className="p-2 rounded-md transition-all" style={{ background: viewMode === 'list' ? 'white' : 'transparent' }} aria-label="List view">
              <List size={16} style={{ color: viewMode === 'list' ? '#C9A020' : '#6B6660' }} />
            </button>
          </div>
        </div>

        {members.length === 0 && <p className="text-center py-8 text-sm" style={{ color: '#6B6660' }}>No staff records found.</p>}

        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in stagger-3">
            {members.map((member) => {
              const sc = statusColors[member.status] ?? { bg: '#F3F4F6', text: '#4B5563' }
              return (
                <div key={member.id} className="card-hover">
                  <div className="flex justify-end mb-3">
                    <span className="badge text-xs px-2.5 py-0.5 rounded-full font-medium" style={{ background: sc.bg, color: sc.text }}>{member.status}</span>
                  </div>
                  <div className="flex flex-col items-center text-center mb-4">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white mb-3" style={{ background: 'linear-gradient(135deg, #C9A020, #8B6E10)' }}>
                      {getInitials(member.name)}
                    </div>
                    <h3 className="font-bold text-base">{member.name}</h3>
                    <p className="text-sm font-medium" style={{ color: '#C9A020' }}>{member.role}</p>
                  </div>
                  <div className="space-y-1.5 mb-4 text-sm">
                    <div style={{ color: '#6B6660' }}>{member.department}</div>
                    <div className="truncate" style={{ color: '#6B6660' }}>{member.email}</div>
                    <div style={{ color: '#6B6660' }}>{member.phone}</div>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn-outline text-xs px-3 py-1.5 flex items-center gap-1"><Eye size={12} /> View</button>
                    <button className="btn-outline text-xs px-3 py-1.5 flex items-center gap-1"><Pencil size={12} /> Edit</button>
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
                {members.map((member) => {
                  const sc = statusColors[member.status] ?? { bg: '#F3F4F6', text: '#4B5563' }
                  return (
                    <tr key={member.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0" style={{ background: 'linear-gradient(135deg, #C9A020, #8B6E10)' }}>
                            {getInitials(member.name)}
                          </div>
                          <span className="font-semibold">{member.name}</span>
                        </div>
                      </td>
                      <td style={{ color: '#6B6660' }}>{member.role}</td>
                      <td style={{ color: '#6B6660' }}>{member.department}</td>
                      <td style={{ color: '#6B6660' }}>{member.email}</td>
                      <td><span className="badge text-xs px-2.5 py-0.5 rounded-full" style={{ background: sc.bg, color: sc.text }}>{member.status}</span></td>
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
