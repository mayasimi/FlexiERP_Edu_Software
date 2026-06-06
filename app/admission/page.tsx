'use client'
import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import AppLayout from '@/components/layout/AppLayout'
import Topbar from '@/components/layout/Topbar'
import { admissionApi } from '@/lib/api'
import { getStatusColor } from '@/lib/utils'
import {
  MoreVertical, ChevronLeft, ChevronRight,
  CheckCircle2, XCircle, Clock, Eye, X,
  User, Phone, Mail, MapPin, GraduationCap, Users,
  FileText, Download, AlertCircle,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

// ── Types ──────────────────────────────────────────────────────────────────
interface AdmissionRow {
  id:           string   // application_no
  db_id:        number
  student_name: string
  first_name:   string
  last_name:    string
  email:        string
  phone:        string
  program:      string
  level:        string
  date_applied: string
  date_applied_raw: string
  status:       'pending' | 'under_evaluation' | 'admitted' | 'rejected'
  status_label: string
  reviewed_by:  string | null
  admitted_at:  string | null
  student_id:   number | null
  // full detail fields (loaded on demand)
  date_of_birth?:         string
  gender?:                string
  state_of_origin?:       string
  lga?:                   string
  address?:               string
  previous_school?:       string
  guardian_name?:         string
  guardian_relationship?: string
  guardian_phone?:        string
  guardian_email?:        string
  guardian_occupation?:   string
  notes?:                 string
  documents?:             { name: string; url: string; size: string }[]
}

const TABS = ['All Applications', 'Under Review', 'Admitted', 'Rejected']

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending:          { label: 'Pending Review',    color: '#92400E', bg: '#FEF3C7', icon: <Clock        size={12} /> },
  under_evaluation: { label: 'Under Evaluation',  color: '#1D4ED8', bg: '#EFF6FF', icon: <AlertCircle  size={12} /> },
  admitted:         { label: 'Admitted',           color: '#065F46', bg: '#ECFDF5', icon: <CheckCircle2 size={12} /> },
  rejected:         { label: 'Rejected',           color: '#991B1B', bg: '#FEF2F2', icon: <XCircle      size={12} /> },
}

const PAGE_SIZE = 10

export default function AdmissionPage() {
  const router        = useRouter()
  const queryClient   = useQueryClient()
  const dropdownRef   = useRef<HTMLDivElement>(null)

  const [activeTab,        setActiveTab]        = useState(0)
  const [page,             setPage]             = useState(1)
  const [search,           setSearch]           = useState('')
  const [dateFrom,         setDateFrom]         = useState('')
  const [dateTo,           setDateTo]           = useState('')
  const [program,          setProgram]          = useState('')
  const [openDropdownId,   setOpenDropdownId]   = useState<string | null>(null)
  const [detailRow,        setDetailRow]        = useState<AdmissionRow | null>(null)
  const [confirmAdmit,     setConfirmAdmit]     = useState<AdmissionRow | null>(null)
  const [statusNote,       setStatusNote]       = useState('')

  // Tab → status filter
  const tabStatus = ['', 'under_evaluation', 'admitted', 'rejected'][activeTab]

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdownId(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => { setPage(1) }, [activeTab, search, dateFrom, dateTo, program])

  // ── Fetch admissions ──────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['admissions', activeTab, page, search, dateFrom, dateTo, program],
    queryFn:  () => admissionApi.list({
      status:    tabStatus,
      search:    search || undefined,
      date_from: dateFrom || undefined,
      date_to:   dateTo   || undefined,
      program:   program  || undefined,
      page,
      per_page:  PAGE_SIZE,
    }).then(r => r.data),
    placeholderData: { data: [], total: 0, current_page: 1, last_page: 1 },
  })

  const rows: AdmissionRow[] = data?.data ?? []
  const totalPages = data?.last_page ?? 1
  const totalRows  = data?.total ?? 0

  // ── Fetch full detail of selected row ─────────────────────────────────────
  const { data: fullDetail } = useQuery({
    queryKey: ['admission-detail', detailRow?.id],
    queryFn:  () => admissionApi.show(detailRow!.id).then(r => r.data),
    enabled:  !!detailRow,
  })

  // ── Update status mutation ────────────────────────────────────────────────
  const statusMutation = useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: string; notes?: string }) =>
      admissionApi.updateStatus(id, { status, notes }),
    onSuccess: (res, vars) => {
      const label = STATUS_CONFIG[vars.status]?.label ?? vars.status
      toast.success(`Application ${label}.`)
      if (vars.status === 'admitted' && res.data?.student) {
        toast.success(`Student record created: ${res.data.student.student_id}`, { duration: 5000 })
      }
      queryClient.invalidateQueries({ queryKey: ['admissions'] })
      queryClient.invalidateQueries({ queryKey: ['admission-detail'] })
      setConfirmAdmit(null)
      setStatusNote('')
      setOpenDropdownId(null)
    },
    onError: () => toast.error('Failed to update status.'),
  })

  const handleStatusChange = (row: AdmissionRow, status: string) => {
    if (status === 'admitted') {
      // Show confirmation modal for admit — this creates a student record
      setConfirmAdmit(row)
    } else {
      statusMutation.mutate({ id: row.id, status })
    }
  }

  const statusBadge = (status: string) => {
    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending
    return (
      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
        style={{ background: cfg.bg, color: cfg.color }}>
        {cfg.icon} {cfg.label}
      </span>
    )
  }

  return (
    <AppLayout>
      <Topbar action={{ label: 'New Application', onClick: () => router.push('/application/form?from=/admission') }} />

      <div className="page-header animate-in">
        <div className="gold-accent" />
        <h1 className="page-title">Admission Portal</h1>
        <p className="page-subtitle">Manage incoming applications and enrolments.</p>
      </div>

      <div className="px-6 pb-8">
        {/* Tabs */}
        <div className="flex gap-0 mb-5 border-b" style={{ borderColor: '#E4E1D8' }}>
          {TABS.map((tab, i) => (
            <button key={tab} onClick={() => setActiveTab(i)}
              className="px-5 py-2.5 text-sm font-medium transition-all relative"
              style={{ color: activeTab === i ? '#C9A020' : '#6B6660', background: 'none', border: 'none', cursor: 'pointer' }}>
              {tab}
              {activeTab === i && <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t" style={{ background: '#C9A020' }} />}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="card mb-5 animate-in stagger-1">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-48">
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6660' }}>Search</label>
              <input value={search} onChange={e => setSearch(e.target.value)} className="input"
                placeholder="Name, App ID, email, phone..." />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6660' }}>From</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6660' }}>To</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6660' }}>Programme</label>
              <select value={program} onChange={e => setProgram(e.target.value)} className="select w-40">
                <option value="">All</option>
                <option>Science</option><option>Commercial</option>
                <option>Arts</option><option>General Studies</option><option>Technical</option>
              </select>
            </div>
            <button onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); setProgram('') }}
              className="btn-outline">Reset</button>
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
                  <th>Level</th>
                  <th>Programme</th>
                  <th>Date Applied</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr><td colSpan={7} className="text-center py-8 text-sm" style={{ color: '#6B6660' }}>Loading...</td></tr>
                )}
                {!isLoading && rows.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-8 text-sm" style={{ color: '#6B6660' }}>No applications found.</td></tr>
                )}
                {rows.map(row => (
                  <tr key={row.id}>
                    <td className="font-mono text-sm" style={{ color: '#6B6660' }}>{row.id}</td>
                    <td className="font-semibold">{row.student_name}</td>
                    <td style={{ color: '#6B6660' }}>{row.level || '—'}</td>
                    <td style={{ color: '#6B6660' }}>{row.program}</td>
                    <td style={{ color: '#6B6660' }}>{row.date_applied}</td>
                    <td>{statusBadge(row.status)}</td>
                    <td className="relative">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setDetailRow(row)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" title="View detail">
                          <Eye size={15} style={{ color: '#6B6660' }} />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); setOpenDropdownId(openDropdownId === row.id ? null : row.id) }}
                          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                          <MoreVertical size={15} style={{ color: '#6B6660' }} />
                        </button>
                      </div>

                      {openDropdownId === row.id && (
                        <div ref={dropdownRef}
                          className="absolute right-0 mt-1 w-44 bg-white border rounded-xl shadow-xl z-[100] overflow-hidden"
                          style={{ borderColor: '#E4E1D8', top: '100%' }}>
                          <div className="py-1">
                            {row.status !== 'under_evaluation' && (
                              <button onClick={() => handleStatusChange(row, 'under_evaluation')}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left hover:bg-gray-50"
                                style={{ color: '#1D4ED8' }}>
                                <AlertCircle size={14} /> Under Review
                              </button>
                            )}
                            {row.status !== 'admitted' && (
                              <button onClick={() => handleStatusChange(row, 'admitted')}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left hover:bg-gray-50"
                                style={{ color: '#10B981' }}>
                                <CheckCircle2 size={14} /> Admit Student
                              </button>
                            )}
                            {row.status !== 'rejected' && (
                              <button onClick={() => handleStatusChange(row, 'rejected')}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left hover:bg-gray-50"
                                style={{ color: '#EF4444' }}>
                                <XCircle size={14} /> Reject
                              </button>
                            )}
                            {row.status !== 'pending' && (
                              <button onClick={() => handleStatusChange(row, 'pending')}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left hover:bg-gray-50"
                                style={{ color: '#6B6660' }}>
                                <Clock size={14} /> Reset to Pending
                              </button>
                            )}
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
              {totalRows === 0 ? 'No entries' : `Page ${page} of ${totalPages} · ${totalRows} total`}
            </span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg border text-sm disabled:opacity-30"
                style={{ borderColor: '#E4E1D8' }}>
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(n => (
                <button key={n} onClick={() => setPage(n)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium"
                  style={{ background: page === n ? '#C9A020' : 'transparent', color: page === n ? 'white' : '#0D0D0D', border: page === n ? 'none' : '1px solid #E4E1D8' }}>
                  {n}
                </button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="w-8 h-8 flex items-center justify-center rounded-lg border text-sm disabled:opacity-30"
                style={{ borderColor: '#E4E1D8' }}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Detail Modal ──────────────────────────────────────────────────── */}
      {detailRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto py-8"
          style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="card w-full max-w-2xl mx-4 animate-in" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-bold text-lg">{detailRow.student_name}</h2>
                <p className="text-sm font-mono" style={{ color: '#6B6660' }}>{detailRow.id}</p>
              </div>
              <div className="flex items-center gap-2">
                {statusBadge(detailRow.status)}
                <button onClick={() => setDetailRow(null)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Use fullDetail if loaded, else detailRow */}
            {(() => {
              const d = fullDetail ?? detailRow
              return (
                <div className="space-y-6">
                  <DetailSection title="Personal Information" icon={<User size={14} />}>
                    <DetailGrid>
                      <DetailField label="First Name"  value={d.first_name} />
                      <DetailField label="Last Name"   value={d.last_name} />
                      <DetailField label="Date of Birth" value={(d as any).date_of_birth} />
                      <DetailField label="Gender"      value={(d as any).gender} />
                      <DetailField label="State"       value={(d as any).state_of_origin} />
                      <DetailField label="LGA"         value={(d as any).lga} />
                      <DetailField label="Email"       value={d.email} />
                      <DetailField label="Phone"       value={d.phone} />
                      <DetailField label="Address" value={(d as any).address} span />
                    </DetailGrid>
                  </DetailSection>

                  <DetailSection title="Academic Details" icon={<GraduationCap size={14} />}>
                    <DetailGrid>
                      <DetailField label="Level"           value={d.level} />
                      <DetailField label="Programme"       value={d.program} />
                      <DetailField label="Previous School" value={(d as any).previous_school} span />
                    </DetailGrid>
                  </DetailSection>

                  <DetailSection title="Parent / Guardian" icon={<Users size={14} />}>
                    <DetailGrid>
                      <DetailField label="Name"         value={(d as any).guardian_name} />
                      <DetailField label="Relationship" value={(d as any).guardian_relationship} />
                      <DetailField label="Phone"        value={(d as any).guardian_phone} />
                      <DetailField label="Email"        value={(d as any).guardian_email} />
                      <DetailField label="Occupation"   value={(d as any).guardian_occupation} />
                    </DetailGrid>
                  </DetailSection>

                  {((d as any).documents?.length > 0) && (
                    <DetailSection title="Documents" icon={<FileText size={14} />}>
                      <div className="space-y-2">
                        {(d as any).documents.map((doc: any, i: number) => (
                          <div key={i} className="flex items-center gap-3 p-2 rounded-lg"
                            style={{ background: '#F7F6F3', border: '1px solid #E4E1D8' }}>
                            <FileText size={14} style={{ color: '#C9A020' }} />
                            <span className="flex-1 text-sm truncate">{doc.name}</span>
                            <span className="text-xs" style={{ color: '#6B6660' }}>{doc.size}</span>
                            <a href={doc.url} target="_blank" rel="noreferrer"
                              className="flex items-center gap-1 text-xs font-medium" style={{ color: '#3B82F6' }}>
                              <Download size={12} /> View
                            </a>
                          </div>
                        ))}
                      </div>
                    </DetailSection>
                  )}

                  {(d as any).notes && (
                    <DetailSection title="Notes" icon={<FileText size={14} />}>
                      <p className="text-sm p-3 rounded-lg" style={{ background: '#F7F6F3' }}>{(d as any).notes}</p>
                    </DetailSection>
                  )}

                  {d.reviewed_by && (
                    <p className="text-xs" style={{ color: '#6B6660' }}>
                      Reviewed by {d.reviewed_by} {d.admitted_at ? `· Admitted ${d.admitted_at}` : ''}
                    </p>
                  )}
                </div>
              )
            })()}

            {/* Action buttons in detail modal */}
            {detailRow.status !== 'admitted' && (
              <div className="flex gap-2 mt-6 pt-5 border-t" style={{ borderColor: '#E4E1D8' }}>
                {detailRow.status !== 'under_evaluation' && (
                  <button onClick={() => { statusMutation.mutate({ id: detailRow.id, status: 'under_evaluation' }); setDetailRow(null) }}
                    className="btn-outline text-sm" style={{ color: '#1D4ED8', borderColor: '#1D4ED8' }}>
                    <AlertCircle size={14} /> Mark Under Review
                  </button>
                )}
                <button onClick={() => { setConfirmAdmit(detailRow); setDetailRow(null) }}
                  className="btn-gold text-sm">
                  <CheckCircle2 size={14} /> Admit Student
                </button>
                {detailRow.status !== 'rejected' && (
                  <button onClick={() => { statusMutation.mutate({ id: detailRow.id, status: 'rejected' }); setDetailRow(null) }}
                    className="btn-outline text-sm ml-auto" style={{ color: '#EF4444', borderColor: '#EF4444' }}>
                    <XCircle size={14} /> Reject
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Admit Confirmation Modal ──────────────────────────────────────── */}
      {confirmAdmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="card w-full max-w-md mx-4 animate-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#ECFDF5' }}>
                <CheckCircle2 size={20} style={{ color: '#10B981' }} />
              </div>
              <div>
                <h2 className="font-bold text-lg">Admit Student</h2>
                <p className="text-sm" style={{ color: '#6B6660' }}>{confirmAdmit.student_name}</p>
              </div>
            </div>

            <div className="rounded-xl p-4 mb-4" style={{ background: '#FEF3C7', border: '1px solid #FDE68A' }}>
              <p className="text-sm font-semibold" style={{ color: '#92400E' }}>
                This will automatically create a student record for {confirmAdmit.first_name} {confirmAdmit.last_name}.
              </p>
              <p className="text-xs mt-1" style={{ color: '#92400E' }}>
                The application will remain visible here for report purposes. You can assign their class section afterwards.
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6660' }}>
                Admission Note (optional)
              </label>
              <textarea value={statusNote} onChange={e => setStatusNote(e.target.value)}
                className="input" rows={3} placeholder="Add any notes about this admission..." />
            </div>

            <div className="flex gap-3 justify-end">
              <button onClick={() => { setConfirmAdmit(null); setStatusNote('') }} className="btn-outline">Cancel</button>
              <button
                onClick={() => statusMutation.mutate({ id: confirmAdmit.id, status: 'admitted', notes: statusNote || undefined })}
                disabled={statusMutation.isPending}
                className="btn-gold">
                <CheckCircle2 size={14} />
                {statusMutation.isPending ? 'Admitting...' : 'Confirm Admission'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}

// ── Reusable detail components ────────────────────────────────────────────
function DetailSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#6B6660' }}>
        {icon} {title}
      </h3>
      {children}
    </div>
  )
}
function DetailGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-6 gap-y-3">{children}</div>
}
function DetailField({ label, value, span }: { label: string; value?: string | null; span?: boolean }) {
  return (
    <div className={span ? 'col-span-2' : ''}>
      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#9B9590' }}>{label}</p>
      <p className="text-sm mt-1" style={{ color: value ? '#0D0D0D' : '#C9C4BC' }}>{value || '—'}</p>
    </div>
  )
}
