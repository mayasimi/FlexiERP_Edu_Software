'use client'
import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import AppLayout from '@/components/layout/AppLayout'
import Topbar from '@/components/layout/Topbar'
import { admissionApi } from '@/lib/api'
import { getStatusColor } from '@/lib/utils'
import { adminMockViews } from '@/lib/admin-mock-db'
import { MoreVertical, ChevronLeft, ChevronRight, Filter, Plus, X, Upload, CheckCircle2, XCircle, Clock } from 'lucide-react'

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
  const [showNewAdmissionForm, setShowNewAdmissionForm] = useState(false)
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)
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

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    const firstName = formData.get('firstName') as string
    const lastName = formData.get('lastName') as string
    const selectedProgram = formData.get('program') as string

    setLocalAdmissions(prev => {
      const newApplicant: AdmissionRow = {
        id: `APP-25-${(prev.length + 1).toString().padStart(3, '0')}`,
        student_name: `${firstName} ${lastName}`,
        program: selectedProgram,
        date_applied: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        status: 'Pending Review',
      }
      return [newApplicant, ...prev]
    })
    setShowNewAdmissionForm(false)
  }

  return (
    <AppLayout>
      <Topbar action={{ label: 'New Admission', onClick: () => setShowNewAdmissionForm(true) }} />

      <div className="page-header animate-in">
        <div className="gold-accent" />
        <h1 className="page-title">{showNewAdmissionForm ? 'New Admission' : 'Admission Portal'}</h1>
        <p className="page-subtitle">
          {showNewAdmissionForm 
            ? 'Complete the form below to register a new student application.' 
            : 'Manage incoming applications and enrollments.'}
        </p>
      </div>

      <div className="px-6 pb-8">
        {showNewAdmissionForm ? (
          <div className="animate-in">
            <button 
              onClick={() => setShowNewAdmissionForm(false)}
              className="flex items-center gap-2 text-sm font-medium mb-6 hover:translate-x-[-4px] transition-transform" 
              style={{ color: '#C9A020' }}
            >
              <ChevronLeft size={16} />
              Back to Portal
            </button>

            <div className="card max-w-4xl mx-auto">
              <form className="space-y-8" onSubmit={handleFormSubmit}>
                {/* Section: Student Information */}
                <div>
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <span className="w-1.5 h-6 rounded-full" style={{ background: '#C9A020' }} />
                    Student Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="label">First Name</label>
                      <input type="text" name="firstName" className="input" placeholder="e.g. John" required />
                    </div>
                    <div>
                      <label className="label">Last Name</label>
                      <input type="text" name="lastName" className="input" placeholder="e.g. Doe" required />
                    </div>
                    <div>
                      <label className="label">Date of Birth</label>
                      <input type="date" name="dob" className="input" required />
                    </div>
                    <div>
                      <label className="label">Gender</label>
                      <select name="gender" className="select" required>
                        <option value="">Select Gender</option>
                        <option>Male</option>
                        <option>Female</option>
                        <option>Other</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section: Academic Details */}
                <div>
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <span className="w-1.5 h-6 rounded-full" style={{ background: '#C9A020' }} />
                    Academic Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Program Applied For</label>
                      <select name="program" className="select" required>
                        <option value="">Select Program</option>
                        <option>Computer Science</option>
                        <option>Business Admin</option>
                        <option>Engineering</option>
                        <option>Literature</option>
                        <option>Architecture</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">Level / Grade</label>
                      <select name="level" className="select" required>
                        <option value="">Select Level</option>
                        <option>JSS 1</option>
                        <option>JSS 2</option>
                        <option>JSS 3</option>
                        <option>SS 1</option>
                        <option>SS 2</option>
                        <option>SS 3</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section: Guardian Information */}
                <div>
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <span className="w-1.5 h-6 rounded-full" style={{ background: '#C9A020' }} />
                    Guardian Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Guardian Full Name</label>
                      <input type="text" name="guardianName" className="input" placeholder="e.g. Jane Doe" required />
                    </div>
                    <div>
                      <label className="label">Relationship</label>
                      <input type="text" name="relationship" className="input" placeholder="e.g. Mother" required />
                    </div>
                    <div>
                      <label className="label">Phone Number</label>
                      <input type="tel" name="phone" className="input" placeholder="e.g. +234 800 000 0000" required />
                    </div>
                    <div>
                      <label className="label">Email Address</label>
                      <input type="email" name="email" className="input" placeholder="e.g. jane.doe@example.com" required />
                    </div>
                  </div>
                </div>

                {/* Section: Documents */}
                <div>
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <span className="w-1.5 h-6 rounded-full" style={{ background: '#C9A020' }} />
                    Required Documents
                  </h3>
                  <div className="p-8 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-3 transition-colors hover:bg-gray-50" style={{ borderColor: '#E4E1D8' }}>
                    <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: '#F7F6F3' }}>
                      <Upload size={24} style={{ color: '#C9A020' }} />
                    </div>
                    <div className="text-center">
                      <p className="font-semibold">Click to upload or drag and drop</p>
                      <p className="text-xs mt-1" style={{ color: '#6B6660' }}>Birth Certificate, Previous Result, ID Card (PDF, JPG, max 5MB)</p>
                    </div>
                    <input type="file" className="hidden" id="doc-upload" multiple />
                    <button type="button" onClick={() => document.getElementById('doc-upload')?.click()} className="btn-outline mt-2">Browse Files</button>
                  </div>
                </div>

                {/* Submit Buttons */}
                <div className="flex justify-end gap-3 pt-6 border-t" style={{ borderColor: '#E4E1D8' }}>
                  <button type="button" onClick={() => setShowNewAdmissionForm(false)} className="btn-outline px-8">Cancel</button>
                  <button type="submit" className="btn-gold px-12">Submit Application</button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>
    </AppLayout>
  )
}
