'use client'
import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import AppLayout from '@/components/layout/AppLayout'
import Topbar from '@/components/layout/Topbar'
import { admissionApi } from '@/lib/api'
import { getStatusColor } from '@/lib/utils'
import { adminMockViews } from '@/lib/admin-mock-db'
import { MoreVertical, ChevronLeft, ChevronRight, Filter, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { useRouter } from 'next/navigation'

const TABS = ['New Applications', 'Shortlisted', 'Enrolled']

const MOCK_ADMISSIONS = adminMockViews.admission
type AdmissionRow = {
  id: string
  student_name: string
  program: string
  date_applied: string
  status: string
}

export default function AdmissionPage() {
  const [activeTab, setActiveTab] = useState(0)
  const [page, setPage] = useState(1)
  const [dateFrom, setDateFrom] = useState('2025-01-01')
  const [dateTo, setDateTo] = useState('2025-03-31')
  const [program, setProgram] = useState('')
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)
  const router = useRouter()
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdownId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Local state for admissions to simulate persistence of newly added applicants
  const [localAdmissions, setLocalAdmissions] = useState<AdmissionRow[]>(() => [...MOCK_ADMISSIONS.data])

  const statusMap = ['', 'shortlisted', 'enrolled']

  const { data: _queryData } = useQuery({
    queryKey: ['admissions', page, activeTab, dateFrom, dateTo, program],
    queryFn: () => admissionApi.list({
      status: statusMap[activeTab],
      date_from: dateFrom, date_to: dateTo,
      program: program || undefined, page, per_page: 10
    }).then(r => r.data),
    placeholderData: MOCK_ADMISSIONS,
    enabled: false, // Disabling query for now to focus on local state as requested by user
  })

  // Display local admissions filtered by tab/search if needed, but for now we just show local list
  // In a real app, this would be handled by the backend
  const displayData = localAdmissions

  const handleUpdateStatus = (id: string, newStatus: string) => {
    setLocalAdmissions(prev => prev.map(item => 
      item.id === id ? { ...item, status: newStatus } : item
    ))
    setOpenDropdownId(null)
  }

  return (
    <AppLayout>
      <Topbar action={{ label: 'New Admission', onClick: () => router.push('/application/form') }} />

      <div className="page-header animate-in">
        <div className="gold-accent" />
        <h1 className="page-title">Admission Portal</h1>
        <p className="page-subtitle">Manage incoming applications and enrollments.</p>
      </div>

      <div className="px-6 pb-8">
        {/* Tabs */}
        <div className="flex gap-0 mb-5 border-b" style={{ borderColor: '#E4E1D8' }}>
          {TABS.map((tab, i) => (
            <button key={tab} onClick={() => { setActiveTab(i); setPage(1) }}
                    className="px-5 py-2.5 text-sm font-medium transition-all relative"
                    style={{ color: activeTab === i ? '#C9A020' : '#6B6660', background: 'none', border: 'none', cursor: 'pointer' }}>
              {tab}
              {activeTab === i && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t"
                      style={{ background: '#C9A020' }} />
              )}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="card mb-5 animate-in stagger-1">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-40">
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6660' }}>Date Range</label>
              <div className="flex gap-2">
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input flex-1" />
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input flex-1" />
              </div>
            </div>
            <div className="min-w-44">
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6660' }}>Program</label>
              <select value={program} onChange={e => setProgram(e.target.value)} className="select">
                <option value="">All Programs</option>
                <option>Computer Science</option>
                <option>Business Admin</option>
                <option>Engineering</option>
                <option>Literature</option>
                <option>Architecture</option>
              </select>
            </div>
            <button className="btn-outline flex items-center gap-1.5">
              <Filter size={14} /> More Filters
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="card animate-in stagger-2 p-0 overflow-hidden">
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>App ID</th>
                  <th>Student Name</th>
                  <th>Program</th>
                  <th>Date Applied</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayData.map((row: AdmissionRow) => (
                  <tr key={row.id}>
                    <td className="font-mono text-sm" style={{ color: '#6B6660' }}>{row.id}</td>
                    <td className="font-semibold">{row.student_name}</td>
                    <td style={{ color: '#6B6660' }}>{row.program}</td>
                    <td style={{ color: '#6B6660' }}>{row.date_applied}</td>
                    <td>
                      <span className={`badge ${getStatusColor(row.status)}`}>{row.status}</span>
                    </td>
                    <td className="relative">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdownId(openDropdownId === row.id ? null : row.id);
                        }}
                        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <MoreVertical size={15} style={{ color: '#6B6660' }} />
                      </button>

                      {openDropdownId === row.id && (
                        <div 
                          ref={dropdownRef}
                          className="absolute right-0 mt-1 w-36 bg-white border rounded-xl shadow-xl z-[100] overflow-hidden animate-in fade-in zoom-in duration-200"
                          style={{ borderColor: '#E4E1D8', top: '100%' }}
                        >
                          <div className="py-1">
                            <button 
                              onClick={() => handleUpdateStatus(row.id, 'Admitted')}
                              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left hover:bg-gray-50 transition-colors"
                              style={{ color: '#10B981' }}
                            >
                              <CheckCircle2 size={14} /> Admitted
                            </button>
                            <button 
                              onClick={() => handleUpdateStatus(row.id, 'Rejected')}
                              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left hover:bg-gray-50 transition-colors"
                              style={{ color: '#EF4444' }}
                            >
                              <XCircle size={14} /> Rejected
                            </button>
                            <button 
                              onClick={() => handleUpdateStatus(row.id, 'Pending Review')}
                              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left hover:bg-gray-50 transition-colors"
                              style={{ color: '#6B6660' }}
                            >
                              <Clock size={14} /> Pending
                            </button>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-4 py-3 flex items-center justify-between border-t" style={{ borderColor: '#E4E1D8' }}>
            <span className="text-sm" style={{ color: '#6B6660' }}>
              Showing 1 to {displayData.length} of {displayData.length} entries
            </span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-sm border transition-colors hover:border-gold-500"
                      style={{ borderColor: '#E4E1D8' }}>
                <ChevronLeft size={14} />
              </button>
              {[1].map(n => (
                <button key={n} onClick={() => setPage(n)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-all"
                        style={{
                          background: page === n ? '#C9A020' : 'transparent',
                          color: page === n ? 'white' : '#0D0D0D',
                          border: page === n ? 'none' : '1px solid #E4E1D8'
                        }}>
                  {n}
                </button>
              ))}
              <button onClick={() => setPage(p => p + 1)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-sm border transition-colors"
                      style={{ borderColor: '#E4E1D8' }}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
