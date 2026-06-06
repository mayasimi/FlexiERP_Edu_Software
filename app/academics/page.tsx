'use client'
import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import AppLayout from '@/components/layout/AppLayout'
import Topbar from '@/components/layout/Topbar'
import { academicsApi } from '@/lib/api'
import { FolderOpen, Pencil, Plus, Trash2, Trophy, User, X, Save } from 'lucide-react'
import toast from 'react-hot-toast'

// ── Types ──────────────────────────────────────────────────────────────────
interface Section    { id: string; name: string; full_name?: string }
interface ClassNode  { id: string; name: string; level: string; sections: Section[] }
interface Subject {
  assignment_id: number
  id:            string
  code:          string
  name:          string
  type:          string
  teacher:       string
  teacher_id:    number | null
  max_marks:     string
  max_theory:    number
  max_practical: number
  academic_term: string
}
interface StaffMember { id: number; name: string; role: string }

const TYPE_STYLE: Record<string, string> = {
  Core: 'badge-green', Language: 'badge-gold', Elective: 'badge-blue',
}

const EMPTY_FORM = {
  code: '', name: '', type: 'Core',
  max_theory: 70, max_practical: 30,
  staff_id: '' as string | number,
}

export default function AcademicsPage() {
  const queryClient = useQueryClient()

  const [selectedClassId,   setSelectedClassId]   = useState<string>('')
  const [selectedSectionId, setSelectedSectionId] = useState<string>('')
  const [showModal,         setShowModal]          = useState(false)
  const [editingAssignment, setEditingAssignment]  = useState<Subject | null>(null)
  const [form,              setForm]               = useState(EMPTY_FORM)

  // ── Fetch classes ─────────────────────────────────────────────────────────
  const { data: classes = [] } = useQuery<ClassNode[]>({
    queryKey: ['academic-classes'],
    queryFn:  () => academicsApi.getClasses().then(r => r.data),
  })

  // Set defaults once loaded
  useEffect(() => {
    if (classes.length > 0 && !selectedClassId) {
      const first = classes[0]
      setSelectedClassId(first.id)
      setSelectedSectionId(first.sections[0]?.id ?? '')
    }
  }, [classes, selectedClassId])

  // Sync section when class changes
  useEffect(() => {
    const cls = classes.find(c => c.id === selectedClassId)
    if (cls && !cls.sections.find(s => s.id === selectedSectionId)) {
      setSelectedSectionId(cls.sections[0]?.id ?? '')
    }
  }, [selectedClassId, classes])

  const currentClass   = classes.find(c => c.id === selectedClassId)
  const currentSection = currentClass?.sections.find(s => s.id === selectedSectionId)

  // ── Fetch subjects for selected section ───────────────────────────────────
  const { data: subjects = [], isLoading: subjectsLoading } = useQuery<Subject[]>({
    queryKey: ['academic-subjects', selectedSectionId],
    queryFn:  () => academicsApi.getSubjects(selectedSectionId).then(r => r.data),
    enabled:  !!selectedSectionId,
  })

  // ── Fetch teaching staff for dropdown ─────────────────────────────────────
  const { data: staff = [] } = useQuery<StaffMember[]>({
    queryKey: ['academic-staff'],
    queryFn:  () => academicsApi.getStaff().then(r => r.data),
  })

  // ── Create mutation ───────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (data: typeof EMPTY_FORM & { class_section_id: string }) =>
      academicsApi.createSubject(data),
    onSuccess: () => {
      toast.success('Subject added and assigned!')
      closeModal()
      queryClient.invalidateQueries({ queryKey: ['academic-subjects', selectedSectionId] })
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message ?? 'Failed to create subject.'),
  })

  // ── Update mutation ───────────────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: ({ assignmentId, data }: { assignmentId: number; data: Partial<typeof EMPTY_FORM> }) =>
      academicsApi.updateSubject(assignmentId, data),
    onSuccess: () => {
      toast.success('Subject updated!')
      closeModal()
      queryClient.invalidateQueries({ queryKey: ['academic-subjects', selectedSectionId] })
    },
    onError: () => toast.error('Failed to update subject.'),
  })

  // ── Delete mutation ───────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (assignmentId: number) => academicsApi.deleteSubject(assignmentId),
    onSuccess: () => {
      toast.success('Subject removed from this section.')
      queryClient.invalidateQueries({ queryKey: ['academic-subjects', selectedSectionId] })
    },
    onError: () => toast.error('Failed to remove subject.'),
  })

  // ── Modal helpers ─────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditingAssignment(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  const openEdit = (s: Subject) => {
    setEditingAssignment(s)
    setForm({
      code:         s.code,
      name:         s.name,
      type:         s.type,
      max_theory:   s.max_theory,
      max_practical:s.max_practical,
      staff_id:     s.teacher_id ?? '',
    })
    setShowModal(true)
  }

  const closeModal = () => { setShowModal(false); setEditingAssignment(null); setForm(EMPTY_FORM) }

  const handleSave = () => {
    if (!form.code.trim() || !form.name.trim()) {
      toast.error('Subject code and name are required.'); return
    }
    if (editingAssignment) {
      updateMutation.mutate({
        assignmentId: editingAssignment.assignment_id,
        data: {
          name:          form.name,
          type:          form.type,
          max_theory:    form.max_theory,
          max_practical: form.max_practical,
          staff_id:      form.staff_id || undefined,
        } as any,
      })
    } else {
      createMutation.mutate({ ...form, class_section_id: selectedSectionId })
    }
  }

  const handleDelete = (s: Subject) => {
    if (!confirm(`Remove "${s.name}" from ${currentSection?.name ?? 'this section'}?\nThe subject will remain available for other classes.`)) return
    deleteMutation.mutate(s.assignment_id)
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <AppLayout>
      <Topbar action={{ label: 'Add Subject', onClick: openAdd }} />

      <div className="page-header animate-in">
        <div className="gold-accent" />
        <h1 className="page-title">Courses & Subjects</h1>
        <p className="page-subtitle">Manage curriculum, assign teachers, and configure grading per class section.</p>
      </div>

      <div className="px-6 pb-8">
        <div className="flex gap-4">

          {/* ── Class / Section Tree ─────────────────────────────────────── */}
          <div className="card w-56 flex-shrink-0 animate-in stagger-1 h-fit">
            <h3 className="font-bold mb-4">Class Structure</h3>
            {classes.length === 0 && (
              <p className="text-xs" style={{ color: '#6B6660' }}>Loading...</p>
            )}
            <div className="space-y-1">
              {classes.map(cls => (
                <div key={cls.id}>
                  <button
                    onClick={() => { setSelectedClassId(cls.id); setSelectedSectionId(cls.sections[0]?.id ?? '') }}
                    className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-sm text-left hover:bg-gray-50 transition-colors">
                    <FolderOpen size={14} style={{ color: '#6B6660' }} />
                    <span className="font-medium">{cls.name}</span>
                  </button>
                  {selectedClassId === cls.id && cls.sections.map(sec => (
                    <button key={sec.id}
                      onClick={() => setSelectedSectionId(sec.id)}
                      className="flex items-center gap-2 w-full pl-7 py-1.5 rounded-lg text-sm text-left transition-all"
                      style={{
                        background: selectedSectionId === sec.id ? 'rgba(201,160,32,0.1)' : 'transparent',
                        color:      selectedSectionId === sec.id ? '#C9A020' : '#6B6660',
                        fontWeight: selectedSectionId === sec.id ? 600 : 400,
                      }}>
                      <FolderOpen size={13} />
                      {sec.name}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* ── Subjects Table ───────────────────────────────────────────── */}
          <div className="flex-1 animate-in stagger-2">
            <div className="card">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h2 className="font-bold text-lg">
                    {currentClass?.name}{currentSection ? ` – ${currentSection.name}` : ''}
                  </h2>
                  <p className="text-sm mt-1" style={{ color: '#6B6660' }}>
                    {subjectsLoading ? 'Loading...' : `${subjects.length} subject${subjects.length !== 1 ? 's' : ''} assigned`}
                  </p>
                </div>
                <button className="btn-gold text-sm flex items-center gap-1.5" onClick={openAdd}
                  disabled={!selectedSectionId}>
                  <Plus size={14} /> Add Subject
                </button>
              </div>

              {!subjectsLoading && subjects.length === 0 ? (
                <div className="py-10 text-center">
                  <Trophy size={32} className="mx-auto mb-2" style={{ color: '#E4E1D8' }} />
                  <p className="text-sm" style={{ color: '#6B6660' }}>
                    No subjects assigned to this section yet.
                  </p>
                  <button className="btn-gold mt-4 text-sm" onClick={openAdd}>
                    <Plus size={14} /> Add First Subject
                  </button>
                </div>
              ) : (
                <div className="table-wrapper">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Subject</th>
                        <th>Type</th>
                        <th>Assigned Teacher</th>
                        <th>Max Marks</th>
                        <th>Term</th>
                        <th style={{ width: 130 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subjects.map(sub => (
                        <tr key={sub.assignment_id}>
                          <td>
                            <span className="badge badge-gray text-xs font-mono">{sub.code}</span>
                          </td>
                          <td className="font-semibold">{sub.name}</td>
                          <td>
                            <span className={`badge ${TYPE_STYLE[sub.type] ?? 'badge-gray'}`}>{sub.type}</span>
                          </td>
                          <td>
                            {sub.teacher !== '—' ? (
                              <div className="flex items-center gap-1.5">
                                <User size={13} style={{ color: '#C9A020' }} />
                                <span className="font-medium">{sub.teacher}</span>
                              </div>
                            ) : (
                              <span style={{ color: '#9B9590', fontStyle: 'italic', fontSize: 12 }}>Unassigned</span>
                            )}
                          </td>
                          <td>
                            <div className="flex items-center gap-1.5">
                              <Trophy size={13} style={{ color: '#C9A020' }} />
                              <span className="font-medium text-sm">{sub.max_marks}</span>
                            </div>
                          </td>
                          <td className="text-sm" style={{ color: '#6B6660' }}>{sub.academic_term}</td>
                          <td>
                            <div className="flex items-center gap-1">
                              <button
                                className="btn-outline px-2.5 py-1.5 text-xs flex items-center gap-1"
                                onClick={() => openEdit(sub)}>
                                <Pencil size={12} /> Edit
                              </button>
                              <button
                                className="btn-outline px-2.5 py-1.5 text-xs flex items-center gap-1"
                                style={{ borderColor: '#FCA5A5', color: '#EF4444' }}
                                onClick={() => handleDelete(sub)}
                                disabled={deleteMutation.isPending}>
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Info card */}
            <div className="card mt-4 animate-in stagger-3" style={{ borderLeft: '3px solid #C9A020' }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#C9A020' }}>
                How this works
              </p>
              <p className="text-sm" style={{ color: '#6B6660' }}>
                Subjects added here are assigned to <strong>{currentClass?.name} {currentSection?.name}</strong>.
                The assigned teacher will see this subject in their Assessment, Lesson Plans, and Assignments sections.
                Removing a subject from a section does not delete it from the system — it just removes the assignment.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Add / Edit Subject Modal ───────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="card w-full max-w-lg mx-4 animate-in">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-bold text-lg">{editingAssignment ? 'Edit Subject' : 'Add Subject'}</h2>
                <p className="text-xs mt-0.5" style={{ color: '#6B6660' }}>
                  {currentClass?.name} – {currentSection?.name}
                </p>
              </div>
              <button onClick={closeModal}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Code — read-only on edit */}
              <div>
                <label className="label">Subject Code *</label>
                <input value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                  className="input font-mono"
                  placeholder="e.g. PHY101"
                  readOnly={!!editingAssignment}
                  style={editingAssignment ? { background: '#F7F6F3' } : {}} />
                {editingAssignment && (
                  <p className="text-xs mt-1" style={{ color: '#9B9590' }}>Code cannot be changed after creation.</p>
                )}
              </div>

              {/* Type */}
              <div>
                <label className="label">Type</label>
                <select value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="select">
                  <option>Core</option>
                  <option>Language</option>
                  <option>Elective</option>
                  <option>Practical</option>
                  <option>Vocational</option>
                </select>
              </div>

              {/* Name — full width */}
              <div className="md:col-span-2">
                <label className="label">Subject Name *</label>
                <input value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="input" placeholder="e.g. Physics Fundamentals" />
              </div>

              {/* Assigned teacher */}
              <div className="md:col-span-2">
                <label className="label">Assign Teacher</label>
                <select value={form.staff_id}
                  onChange={e => setForm(f => ({ ...f, staff_id: e.target.value }))} className="select">
                  <option value="">— Unassigned —</option>
                  {staff.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                  ))}
                </select>
                <p className="text-xs mt-1" style={{ color: '#9B9590' }}>
                  The assigned teacher can input results, create lesson plans, and add assignments for this subject.
                </p>
              </div>

              {/* Max marks */}
              <div>
                <label className="label">Max Theory Marks</label>
                <input type="number" min={0} max={200}
                  value={form.max_theory}
                  onChange={e => setForm(f => ({ ...f, max_theory: Number(e.target.value) }))}
                  className="input" />
              </div>
              <div>
                <label className="label">Max Practical Marks</label>
                <input type="number" min={0} max={200}
                  value={form.max_practical}
                  onChange={e => setForm(f => ({ ...f, max_practical: Number(e.target.value) }))}
                  className="input" />
              </div>

              {/* Total preview */}
              <div className="md:col-span-2 rounded-lg px-4 py-3 flex items-center justify-between"
                style={{ background: 'rgba(201,160,32,0.08)', border: '1px solid rgba(201,160,32,0.2)' }}>
                <span className="text-sm font-semibold" style={{ color: '#6B6660' }}>Total Max Marks</span>
                <span className="font-bold text-lg" style={{ color: '#C9A020' }}>
                  {(form.max_theory || 0) + (form.max_practical || 0)}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={closeModal} className="btn-outline px-8">Cancel</button>
              <button onClick={handleSave} disabled={isSaving} className="btn-gold px-10">
                <Save size={14} />
                {isSaving ? 'Saving...' : editingAssignment ? 'Save Changes' : 'Add Subject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
