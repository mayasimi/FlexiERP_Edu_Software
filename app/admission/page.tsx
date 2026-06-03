'use client'
import { useMemo, useState, useRef, useEffect } from 'react'
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
  const [showMoreFilters, setShowMoreFilters] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')
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

  useEffect(() => {
    try {
      const raw = localStorage.getItem('edu_admission_applications')
      const stored = raw ? (JSON.parse(raw) as AdmissionRow[]) : []
      if (!Array.isArray(stored) || stored.length === 0) return

      setLocalAdmissions((prev) => {
        const seen = new Set<string>()
        return [...stored, ...prev].filter((item) => {
          if (!item?.id) return false
          if (seen.has(item.id)) return false
          seen.add(item.id)
          return true
        })
      })
    } catch {
    }
  }, [])

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

  useEffect(() => {
    setPage(1)
  }, [activeTab, dateFrom, dateTo, program, search, statusFilter, sortOrder])

  const parseAppliedDate = (value: string) => {
    const d = new Date(value)
    if (!Number.isNaN(d.getTime())) return d
    return null
  }

  const filteredAdmissions = useMemo(() => {
    const fromDate = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null
    const toDate = dateTo ? new Date(`${dateTo}T23:59:59`) : null
    const q = search.trim().toLowerCase()
    const programValue = program.trim().toLowerCase()
    const statusValue = statusFilter.trim().toLowerCase()

    const tabFiltered = localAdmissions.filter((row) => {
      const status = (row.status ?? '').toLowerCase()
      if (activeTab === 1) return status === 'under evaluation' || status === 'shortlisted'
      if (activeTab === 2) return status === 'admitted' || status === 'enrolled'
      return true
    })

    const searched = tabFiltered.filter((row) => {
      if (!q) return true
      return (
        row.id.toLowerCase().includes(q) ||
        row.student_name.toLowerCase().includes(q) ||
        row.program.toLowerCase().includes(q) ||
        row.status.toLowerCase().includes(q)
      )
    })

    const programFiltered = searched.filter((row) => {
      if (!programValue) return true
      return row.program.toLowerCase() === programValue
    })

    const statusFiltered = programFiltered.filter((row) => {
      if (!statusValue) return true
      return row.status.toLowerCase() === statusValue
    })

    const dateFiltered = statusFiltered.filter((row) => {
      if (!fromDate && !toDate) return true
      const applied = parseAppliedDate(row.date_applied)
      if (!applied) return true
      if (fromDate && applied < fromDate) return false
      if (toDate && applied > toDate) return false
      return true
    })

    const sorted = [...dateFiltered].sort((a, b) => {
      const da = parseAppliedDate(a.date_applied)?.getTime() ?? 0
      const db = parseAppliedDate(b.date_applied)?.getTime() ?? 0
      return sortOrder === 'newest' ? db - da : da - db
    })

    return sorted
  }, [activeTab, dateFrom, dateTo, localAdmissions, program, search, sortOrder, statusFilter])

  const PAGE_SIZE = 10
  const totalPages = Math.max(1, Math.ceil(filteredAdmissions.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const displayData = filteredAdmissions.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const availableStatuses = useMemo(() => {
    const seen = new Set<string>()
    const values: string[] = []
    for (const row of localAdmissions) {
      const value = (row.status ?? '').trim()
      if (!value) continue
      const key = value.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      values.push(value)
    }
    return values.sort((a, b) => a.localeCompare(b))
  }, [localAdmissions])

  const handleUpdateStatus = (id: string, newStatus: string) => {
    setLocalAdmissions(prev => prev.map(item => 
      item.id === id ? { ...item, status: newStatus } : item
    ))
    setOpenDropdownId(null)
  }

  return (
    <AppLayout>
      <Topbar action={{ label: 'New Admission', onClick: () => router.push('/application/form?from=/admission') }} />

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
            <button className="btn-outline flex items-center gap-1.5" onClick={() => setShowMoreFilters(v => !v)}>
              <Filter size={14} /> More Filters
            </button>
          </div>

          {showMoreFilters && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6660' }}>Search</label>
                <input value={search} onChange={(e) => setSearch(e.target.value)} className="input" placeholder="Search by App ID, student name, program, or status..." />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6660' }}>Status</label>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="select">
                  <option value="">All Statuses</option>
                  {availableStatuses.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6660' }}>Sort</label>
                <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')} className="select">
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  className="btn-outline w-full"
                  onClick={() => {
                    setDateFrom('2025-01-01')
                    setDateTo('2025-03-31')
                    setProgram('')
                    setSearch('')
                    setStatusFilter('')
                    setSortOrder('newest')
                  }}
                >
                  Reset Filters
                </button>
              </div>
            </div>
          )}
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
              Showing {filteredAdmissions.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1} to {Math.min(currentPage * PAGE_SIZE, filteredAdmissions.length)} of {filteredAdmissions.length} entries
            </span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-sm border transition-colors hover:border-gold-500"
                      style={{ borderColor: '#E4E1D8' }}>
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 5).map(n => (
                <button key={n} onClick={() => setPage(n)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-all"
                        style={{
                          background: currentPage === n ? '#C9A020' : 'transparent',
                          color: currentPage === n ? 'white' : '#0D0D0D',
                          border: currentPage === n ? 'none' : '1px solid #E4E1D8'
                        }}>
                  {n}
                </button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))}
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
