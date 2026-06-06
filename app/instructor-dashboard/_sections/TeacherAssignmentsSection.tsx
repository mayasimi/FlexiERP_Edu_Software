'use client'

import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Eye, Edit2, Trash2, X, Save, Users, Calendar, CheckCircle2, Clock, AlertCircle, ChevronDown, Download, MessageSquare } from 'lucide-react'
import toast from 'react-hot-toast'
import { teacherApi } from '@/lib/api'
import { PageHeader, StudentAvatar } from '../_components'

// ── Types ──────────────────────────────────────────────────────────────────
interface AssignmentStats { total: number; submitted: number; pending: number; rate: number }
interface Assignment {
  id:            number
  title:         string
  description:   string
  subject:       string
  subject_id:    number
  class:         string
  section_id:    number
  due_date:      string
  due_raw:       string
  academic_term: string
  status:        'active' | 'closed' | 'draft'
  is_overdue:    boolean
  created_at:    string
  stats:         AssignmentStats
}
interface Group { section_id: number; section_name: string; subject_id: number; subject_name: string }
interface StudentSubmission {
  student_id:    string
  student_name:  string
  avatar:        string
  submitted:     boolean
  submitted_at:  string | null
  note:          string | null
  file_name:     string | null
  file_url:      string | null
  file_size:     string | null
  status:        string
  feedback:      string | null
  submission_id: number | null
}

const GOLD   = '#C9A020'
const RED    = '#EF4444'
const GREEN  = '#10B981'
const BLUE   = '#3B82F6'

const EMPTY_FORM = { title: '', description: '', subject_id: 0, class_section_id: 0, due_date: '', status: 'active' as const }

export default function TeacherAssignmentsSection() {
  const queryClient = useQueryClient()

  const [filterSection, setFilterSection] = useState<number | ''>('')
  const [filterStatus,  setFilterStatus]  = useState('')
  const [showCreate,    setShowCreate]     = useState(false)
  const [editingId,     setEditingId]      = useState<number | null>(null)
  const [viewingId,     setViewingId]      = useState<number | null>(null)
  const [form,          setForm]           = useState(EMPTY_FORM)
  const [feedbacks,     setFeedbacks]      = useState<Record<number, string>>({})
  const [feedbackOpen,  setFeedbackOpen]   = useState<number | null>(null)

  // ── Fetch teacher's groups (for create form dropdowns) ────────────────────
  const { data: groups = [] } = useQuery<Group[]>({
    queryKey: ['teacher-assignment-groups'],
    queryFn:  () => teacherApi.getAssignmentGroups().then(r => r.data),
  })

  // Unique sections for filter dropdown
  const uniqueSections = groups.filter((g, i, arr) =>
    arr.findIndex(x => x.section_id === g.section_id) === i
  )

  // Subjects for selected section in form
  const subjectsForSection = (sectionId: number) =>
    groups.filter(g => g.section_id === sectionId)

  // Set defaults when groups load
  useEffect(() => {
    if (groups.length > 0 && !form.class_section_id) {
      setForm(f => ({
        ...f,
        class_section_id: groups[0].section_id,
        subject_id:       groups[0].subject_id,
      }))
    }
  }, [groups])

  // ── Fetch assignments ─────────────────────────────────────────────────────
  const { data: assignments = [], isLoading } = useQuery<Assignment[]>({
    queryKey: ['teacher-assignments', filterSection, filterStatus],
    queryFn:  () => teacherApi.getAssignments(
      filterSection ? String(filterSection) : undefined,
      filterStatus || undefined
    ).then(r => r.data),
  })

  // ── Fetch submissions for viewed assignment ───────────────────────────────
  const { data: submissionsData } = useQuery({
    queryKey: ['assignment-submissions', viewingId],
    queryFn:  () => teacherApi.getAssignmentSubmissions(viewingId!).then(r => r.data),
    enabled:  viewingId !== null,
  })

  // ── Create mutation ───────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (data: typeof EMPTY_FORM) => teacherApi.createAssignment(data),
    onSuccess: () => {
      toast.success('Assignment created!')
      setShowCreate(false)
      setForm(EMPTY_FORM)
      queryClient.invalidateQueries({ queryKey: ['teacher-assignments'] })
    },
    onError: () => toast.error('Failed to create assignment.'),
  })

  // ── Update mutation ───────────────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<typeof EMPTY_FORM & { status: string }> }) =>
      teacherApi.updateAssignment(id, data),
    onSuccess: () => {
      toast.success('Assignment updated!')
      setEditingId(null)
      queryClient.invalidateQueries({ queryKey: ['teacher-assignments'] })
    },
    onError: () => toast.error('Failed to update.'),
  })

  // ── Delete mutation ───────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id: number) => teacherApi.deleteAssignment(id),
    onSuccess: () => {
      toast.success('Assignment deleted.')
      queryClient.invalidateQueries({ queryKey: ['teacher-assignments'] })
    },
    onError: () => toast.error('Failed to delete.'),
  })

  // ── Feedback mutation ─────────────────────────────────────────────────────
  const feedbackMutation = useMutation({
    mutationFn: ({ assignmentId, submissionId, feedback }: { assignmentId: number; submissionId: number; feedback: string }) =>
      teacherApi.leaveFeedback(assignmentId, submissionId, feedback),
    onSuccess: (_, vars) => {
      toast.success('Feedback saved!')
      setFeedbackOpen(null)
      setFeedbacks(prev => { const n = { ...prev }; delete n[vars.submissionId]; return n })
      queryClient.invalidateQueries({ queryKey: ['assignment-submissions', viewingId] })
    },
    onError: () => toast.error('Failed to save feedback.'),
  })

  const handleCreate = () => {
    if (!form.title.trim()) { toast.error('Title is required.'); return }
    if (!form.due_date)     { toast.error('Due date is required.'); return }
    createMutation.mutate(form)
  }

  const openEdit = (a: Assignment) => {
    setEditingId(a.id)
    setForm({ title: a.title, description: a.description, subject_id: a.subject_id, class_section_id: a.section_id, due_date: a.due_raw, status: a.status })
    setShowCreate(true)
  }

  const handleDelete = (id: number) => {
    if (!confirm('Delete this assignment? Student submissions will also be deleted.')) return
    deleteMutation.mutate(id)
  }

  const statusBadge = (a: Assignment) => {
    if (a.is_overdue)       return { label: 'Overdue',  color: RED,   bg: '#FEF2F2' }
    if (a.status === 'draft')  return { label: 'Draft',    color: '#6B6660', bg: '#F3F4F6' }
    if (a.status === 'closed') return { label: 'Closed',   color: '#6B6660', bg: '#F3F4F6' }
    return { label: 'Active', color: GREEN, bg: '#ECFDF5' }
  }

  // ── Submission view ───────────────────────────────────────────────────────
  if (viewingId !== null) {
    const viewedAssignment = assignments.find(a => a.id === viewingId)
    const data = submissionsData

    return (
      <div>
        <PageHeader
          title="Assignment Submissions"
          subtitle={viewedAssignment ? `${viewedAssignment.title} · ${viewedAssignment.class}` : ''}
          action={{ label: 'Back to Assignments', icon: <X size={14} />, onClick: () => setViewingId(null) }}
        />

        <div className="px-6 pb-8 space-y-4">
          {/* Stats */}
          {data?.stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in">
              {[
                { label: 'Total Students', value: data.stats.total,     color: '#0D0D0D' },
                { label: 'Submitted',      value: data.stats.submitted, color: GREEN     },
                { label: 'Pending',        value: data.stats.pending,   color: GOLD      },
                { label: 'Rate',           value: `${data.stats.rate}%`, color: BLUE     },
              ].map(({ label, value, color }) => (
                <div key={label} className="stat-card">
                  <span className="stat-label">{label}</span>
                  <div className="stat-value" style={{ color }}>{value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Submissions table */}
          <div className="card p-0 overflow-hidden animate-in stagger-1">
            <table className="table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>File</th>
                  <th>Note</th>
                  <th>Feedback</th>
                </tr>
              </thead>
              <tbody>
                {(data?.submissions ?? []).map((sub: StudentSubmission) => (
                  <tr key={sub.student_id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <StudentAvatar initials={sub.avatar} />
                        <div>
                          <p className="font-medium">{sub.student_name}</p>
                          <p className="text-xs" style={{ color: '#6B6660' }}>{sub.student_id}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      {sub.submitted ? (
                        <span className="badge badge-green">Submitted</span>
                      ) : (
                        <span className="badge" style={{ background: '#FEF2F2', color: RED }}>Not Submitted</span>
                      )}
                    </td>
                    <td className="text-sm" style={{ color: '#6B6660' }}>
                      {sub.submitted_at ?? '—'}
                    </td>
                    <td>
                      {sub.file_name ? (
                        <a href={sub.file_url ?? '#'} target="_blank" rel="noreferrer"
                          className="flex items-center gap-1 text-xs font-medium" style={{ color: BLUE }}>
                          <Download size={12} />
                          <span className="truncate max-w-32">{sub.file_name}</span>
                        </a>
                      ) : <span style={{ color: '#6B6660' }}>—</span>}
                    </td>
                    <td className="text-sm max-w-40 truncate" style={{ color: '#6B6660' }}>
                      {sub.note ?? '—'}
                    </td>
                    <td>
                      {sub.submitted && sub.submission_id ? (
                        feedbackOpen === sub.submission_id ? (
                          <div className="flex gap-2 items-start">
                            <textarea
                              value={feedbacks[sub.submission_id] ?? sub.feedback ?? ''}
                              onChange={e => setFeedbacks(prev => ({ ...prev, [sub.submission_id!]: e.target.value }))}
                              className="input text-xs"
                              rows={2}
                              style={{ minWidth: 180 }}
                              placeholder="Write feedback..."
                            />
                            <button
                              onClick={() => feedbackMutation.mutate({
                                assignmentId: viewingId,
                                submissionId: sub.submission_id!,
                                feedback:     feedbacks[sub.submission_id!] ?? sub.feedback ?? '',
                              })}
                              className="btn-gold text-xs px-2 py-1">
                              <Save size={12} />
                            </button>
                            <button onClick={() => setFeedbackOpen(null)} className="btn-outline text-xs px-2 py-1">
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setFeedbackOpen(sub.submission_id)}
                            className="flex items-center gap-1 text-xs font-medium"
                            style={{ color: sub.feedback ? GREEN : GOLD, background: 'none', border: 'none', cursor: 'pointer' }}>
                            <MessageSquare size={12} />
                            {sub.feedback ? 'Edit Feedback' : 'Add Feedback'}
                          </button>
                        )
                      ) : <span style={{ color: '#6B6660', fontSize: 12 }}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  // ── Main list view ────────────────────────────────────────────────────────
  return (
    <div>
      <PageHeader
        title="Assignments"
        subtitle="Create and manage assignments for your classes."
        action={{ label: 'New Assignment', icon: <Plus size={14} />, onClick: () => { setEditingId(null); setForm(EMPTY_FORM); setShowCreate(true) } }}
      />

      <div className="px-6 pb-8 space-y-4">
        {/* Filters */}
        <div className="card animate-in">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6660' }}>Class</label>
              <select value={filterSection} onChange={e => setFilterSection(e.target.value ? Number(e.target.value) : '')} className="select w-48">
                <option value="">All My Classes</option>
                {uniqueSections.map(g => <option key={g.section_id} value={g.section_id}>{g.section_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6660' }}>Status</label>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="select w-36">
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Summary stats */}
        {assignments.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in stagger-1">
            {[
              { label: 'Total',   value: assignments.length,                                     color: '#0D0D0D' },
              { label: 'Active',  value: assignments.filter(a => a.status === 'active').length,  color: GREEN     },
              { label: 'Overdue', value: assignments.filter(a => a.is_overdue).length,           color: RED       },
              { label: 'Avg Submission Rate', value: `${Math.round(assignments.reduce((s, a) => s + a.stats.rate, 0) / assignments.length)}%`, color: BLUE },
            ].map(({ label, value, color }) => (
              <div key={label} className="stat-card">
                <span className="stat-label">{label}</span>
                <div className="stat-value" style={{ color }}>{value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Assignment cards */}
        {isLoading && <div className="card animate-in"><p className="text-sm" style={{ color: '#6B6660' }}>Loading assignments...</p></div>}

        {!isLoading && assignments.length === 0 && (
          <div className="card animate-in text-center py-12">
            <Plus size={32} className="mx-auto mb-3" style={{ color: '#E4E1D8' }} />
            <p className="font-semibold">No assignments yet</p>
            <p className="text-sm mt-1" style={{ color: '#6B6660' }}>Click "New Assignment" to create one for your students.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 animate-in stagger-2">
          {assignments.map(a => {
            const badge = statusBadge(a)
            return (
              <div key={a.id} className="card-hover">
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex gap-2 flex-wrap">
                    <span className="badge" style={{ background: badge.bg, color: badge.color }}>{badge.label}</span>
                    <span className="badge badge-gray text-xs">{a.subject}</span>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => openEdit(a)} className="p-1.5 rounded hover:bg-gray-100"><Edit2 size={13} style={{ color: '#6B6660' }} /></button>
                    <button onClick={() => handleDelete(a.id)} className="p-1.5 rounded hover:bg-red-50"><Trash2 size={13} style={{ color: RED }} /></button>
                  </div>
                </div>

                <h3 className="font-bold text-base mb-1">{a.title}</h3>
                {a.description && <p className="text-sm mb-3 line-clamp-2" style={{ color: '#6B6660' }}>{a.description}</p>}

                <div className="space-y-1.5 mb-4">
                  <div className="flex items-center gap-2 text-xs" style={{ color: '#6B6660' }}>
                    <Users size={12} /> {a.class}
                  </div>
                  <div className="flex items-center gap-2 text-xs" style={{ color: a.is_overdue ? RED : '#6B6660' }}>
                    <Calendar size={12} /> Due {a.due_date}{a.is_overdue ? ' — Overdue' : ''}
                  </div>
                </div>

                {/* Submission progress bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span style={{ color: '#6B6660' }}>Submissions</span>
                    <span style={{ color: '#6B6660' }}>{a.stats.submitted}/{a.stats.total} ({a.stats.rate}%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full" style={{ background: '#F3F4F6' }}>
                    <div className="h-2 rounded-full transition-all"
                      style={{ width: `${a.stats.rate}%`, background: a.stats.rate >= 80 ? GREEN : a.stats.rate >= 50 ? GOLD : RED }} />
                  </div>
                </div>

                <div className="h-px mb-3" style={{ background: '#E4E1D8' }} />

                {/* Actions */}
                <div className="flex gap-2">
                  <button onClick={() => setViewingId(a.id)} className="btn-gold text-xs flex-1 justify-center flex items-center gap-1.5">
                    <Eye size={12} /> View Submissions
                  </button>
                  <button
                    onClick={() => updateMutation.mutate({ id: a.id, data: { status: a.status === 'active' ? 'closed' : 'active' } })}
                    className="btn-outline text-xs px-3">
                    {a.status === 'active' ? 'Close' : 'Reopen'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Create / Edit Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="card w-full max-w-lg mx-4 animate-in" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-lg">{editingId ? 'Edit Assignment' : 'New Assignment'}</h2>
              <button onClick={() => { setShowCreate(false); setEditingId(null) }}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6660' }}>Title *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="input" placeholder="e.g. Chapter 5 Problems" />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6660' }}>Instructions</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="input" rows={4} placeholder="What should students do? Include any specific requirements..." />
              </div>

              {/* Class + Subject */}
              {!editingId && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6660' }}>Class *</label>
                    <select
                      value={form.class_section_id}
                      onChange={e => {
                        const sId = Number(e.target.value)
                        const firstSubject = groups.find(g => g.section_id === sId)
                        setForm(f => ({ ...f, class_section_id: sId, subject_id: firstSubject?.subject_id ?? 0 }))
                      }}
                      className="select">
                      {uniqueSections.map(g => <option key={g.section_id} value={g.section_id}>{g.section_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6660' }}>Subject *</label>
                    <select
                      value={form.subject_id}
                      onChange={e => setForm(f => ({ ...f, subject_id: Number(e.target.value) }))}
                      className="select">
                      {subjectsForSection(form.class_section_id).map(g => (
                        <option key={g.subject_id} value={g.subject_id}>{g.subject_name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Due date + Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6660' }}>Due Date *</label>
                  <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                    className="input" min={new Date().toISOString().split('T')[0]} />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6660' }}>Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as 'active' | 'draft' }))} className="select">
                    <option value="active">Active (visible to students)</option>
                    <option value="draft">Draft (hidden)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => { setShowCreate(false); setEditingId(null) }} className="btn-outline">Cancel</button>
              <button
                onClick={() => {
                  if (editingId) {
                    updateMutation.mutate({ id: editingId, data: { title: form.title, description: form.description, due_date: form.due_date, status: form.status } })
                    setShowCreate(false)
                  } else {
                    handleCreate()
                  }
                }}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="btn-gold">
                <Save size={14} />
                {editingId
                  ? (updateMutation.isPending ? 'Saving...' : 'Save Changes')
                  : (createMutation.isPending ? 'Creating...' : 'Create Assignment')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
