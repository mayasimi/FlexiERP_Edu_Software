'use client'
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { teacherApi } from '@/lib/api'
import toast from 'react-hot-toast'
import { Plus, Edit2, Save, X, Users, Calendar, Award, Percent } from 'lucide-react'
import { PageHeader, StudentAvatar } from '../_components'
import type { Assessment, AssessmentCategory, StudentGrade } from '../_types'

const typeStyle: Record<string, string> = {
  Exam: 'badge-red', Quiz: 'badge-gold', Assignment: 'badge-blue', Lab: 'badge-green', CTA: 'badge-gold',
}
const statusStyle: Record<string, { bg: string; text: string }> = {
  upcoming:  { bg: '#F3F4F6', text: '#4B5563' },
  grading:   { bg: '#FEF3C7', text: '#92400E' },
  completed: { bg: '#ECFDF5', text: '#065F46' },
}

export default function AssessmentSection() {
  const queryClient = useQueryClient()

  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null)
  const [grades,             setGrades]             = useState<StudentGrade[]>([])
  const [activeTab,          setActiveTab]          = useState<AssessmentCategory | 'all'>('all')
  const [filterType,         setFilterType]         = useState('all')
  const [filterStatus,       setFilterStatus]       = useState('all')
  const [showCreateModal,    setShowCreateModal]    = useState(false)
  const [gradesSaved,        setGradesSaved]        = useState(false)
  const [form,               setForm]               = useState({
    title: '', type: 'Exam' as Assessment['type'],
    category: 'CA' as AssessmentCategory,
    group_id: '', group: '', subject: '',
    date: '', maxMarks: 100, weight: 10,
  })

  // ── Fetch real groups ──────────────────────────────────────────────────────
  const { data: groups = [] } = useQuery({
    queryKey: ['teacher-groups'],
    queryFn:  () => teacherApi.getGroups().then(r => r.data),
  })

  // Set default group in form once groups load
  useEffect(() => {
    if (groups.length > 0 && !form.group_id) {
      setForm(f => ({ ...f, group_id: groups[0].id, group: groups[0].name, subject: groups[0].subject }))
    }
  }, [groups])

  // ── Fetch assessments ──────────────────────────────────────────────────────
  const { data: assessments = [] } = useQuery({
    queryKey: ['teacher-assessments'],
    queryFn:  () => teacherApi.getAssessments().then(r => r.data),
  })

  // ── Fetch grades when an assessment is selected ───────────────────────────
  const { data: gradingStudents = [] } = useQuery({
    queryKey: ['assessment-grades', selectedAssessment?.id],
    queryFn:  () => teacherApi.getAssessmentGrades(selectedAssessment!.id).then(r => r.data),
    enabled:  !!selectedAssessment,
  })

  // Sync grades state when gradingStudents loads
  useEffect(() => {
    if (gradingStudents.length > 0) {
      setGrades(gradingStudents.map((s: any) => ({ ...s })))
      setGradesSaved(false)
    }
  }, [gradingStudents])

  // ── Save grades mutation ──────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: (gradesToSave: StudentGrade[]) => {
      if (!selectedAssessment) return Promise.reject('No assessment selected')
      return teacherApi.saveGrades(selectedAssessment.id, gradesToSave)
    },
    onSuccess: () => {
      toast.success('Grades saved!')
      setGradesSaved(true)
      queryClient.invalidateQueries({ queryKey: ['teacher-assessments'] })
    },
    onError: () => toast.error('Failed to save grades.'),
  })

  // ── Open grading view ─────────────────────────────────────────────────────
  const openGrading = (a: Assessment) => {
    setSelectedAssessment(a)
    setGrades([])      // cleared — will be filled by useEffect when gradingStudents loads
    setGradesSaved(false)
  }

  // ── Update a single grade field locally ──────────────────────────────────
  const updateGrade = (studentId: string, field: 'marks' | 'remarks', value: string | number | null) => {
    setGrades(prev => prev.map(g => g.student_id === studentId ? { ...g, [field]: value } : g))
    setGradesSaved(false)
  }

  // ── Weight summary using real groups ─────────────────────────────────────
  const getWeightSummary = (groupId: string) => {
    const groupAssessments = assessments.filter((a: Assessment) => a.group_id === groupId)
    const caWeight   = groupAssessments.filter((a: Assessment) => a.category === 'CA').reduce((s: number, a: Assessment) => s + a.weight, 0)
    const examWeight = groupAssessments.filter((a: Assessment) => a.category === 'Exam').reduce((s: number, a: Assessment) => s + a.weight, 0)
    return { caWeight, examWeight, total: caWeight + examWeight }
  }

  // ── Filtered assessments ──────────────────────────────────────────────────
  const filtered = assessments.filter((a: Assessment) => {
    if (activeTab !== 'all' && a.category !== activeTab) return false
    if (filterType !== 'all' && a.type !== filterType) return false
    if (filterStatus !== 'all' && a.status !== filterStatus) return false
    return true
  })

  return (
    <div>
      <PageHeader title="Assessment & Grading"
        subtitle="Manage Continuous Assessment (CA) and Terminal Examinations separately."
        action={{ label: 'New Assessment', icon: <Plus size={14} />, onClick: () => setShowCreateModal(true) }} />

      <div className="px-6 pb-8 space-y-4">
        {/* Tabs */}
        <div className="card animate-in">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: '#E4E1D8' }}>
              {([
                { id: 'all' as const,  label: 'All Assessments' },
                { id: 'CA' as const,   label: 'Continuous Assessment (CA)' },
                { id: 'Exam' as const, label: 'Terminal Examination' },
              ]).map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className="px-4 py-2 text-sm font-medium transition-all"
                  style={{
                    background: activeTab === tab.id ? '#C9A020' : 'white',
                    color:      activeTab === tab.id ? 'white' : '#6B6660',
                    borderLeft: tab.id !== 'all' ? '1px solid #E4E1D8' : 'none',
                  }}>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Weight summary — real groups */}
          {activeTab !== 'all' && groups.length > 0 && (
            <div className="p-3 rounded-lg mb-4" style={{
              background: activeTab === 'CA' ? 'rgba(59,130,246,0.05)' : 'rgba(239,68,68,0.05)',
              border: `1px solid ${activeTab === 'CA' ? 'rgba(59,130,246,0.2)' : 'rgba(239,68,68,0.2)'}`,
            }}>
              <div className="flex items-center gap-2 mb-2">
                <Percent size={14} style={{ color: activeTab === 'CA' ? '#3B82F6' : '#EF4444' }} />
                <span className="text-sm font-semibold" style={{ color: activeTab === 'CA' ? '#3B82F6' : '#EF4444' }}>
                  {activeTab === 'CA' ? 'CA contributes 40% to final grade' : 'Exam contributes 60% to final grade'}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {groups.map((g: any) => {
                  const summary      = getWeightSummary(g.id)
                  const currentWeight = activeTab === 'CA' ? summary.caWeight : summary.examWeight
                  const maxWeight     = activeTab === 'CA' ? 40 : 60
                  return (
                    <div key={g.id} className="text-center p-2 rounded-lg" style={{ background: 'white' }}>
                      <p className="text-xs font-medium" style={{ color: '#6B6660' }}>{g.name}</p>
                      <p className="text-sm font-bold" style={{ color: currentWeight > maxWeight ? '#EF4444' : '#1A1A1A' }}>
                        {currentWeight}% / {maxWeight}%
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6660' }}>Type</label>
              <select value={filterType} onChange={e => setFilterType(e.target.value)} className="select w-40">
                <option value="all">All Types</option>
                {activeTab === 'CA' ? (
                  <><option value="Quiz">Quiz</option><option value="Assignment">Assignment</option><option value="Lab">Lab</option><option value="CTA">CA Test</option></>
                ) : activeTab === 'Exam' ? (
                  <option value="Exam">Exam</option>
                ) : (
                  <><option value="Exam">Exam</option><option value="Quiz">Quiz</option><option value="Assignment">Assignment</option><option value="Lab">Lab</option><option value="CTA">CA Test</option></>
                )}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6660' }}>Status</label>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="select w-40">
                <option value="all">All Status</option>
                <option value="upcoming">Upcoming</option>
                <option value="grading">Needs Grading</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Assessment cards or grading view */}
        {!selectedAssessment ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 animate-in stagger-2">
            {filtered.map((assessment: Assessment) => {
              const sStyle = statusStyle[assessment.status] ?? { bg: '#F3F4F6', text: '#4B5563' }
              return (
                <div key={assessment.id} className="card-hover">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`badge ${typeStyle[assessment.type] ?? 'badge-gray'}`}>{assessment.type}</span>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: sStyle.bg, color: sStyle.text }}>{assessment.status}</span>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full ml-auto"
                      style={{ background: assessment.category === 'CA' ? 'rgba(59,130,246,0.1)' : 'rgba(239,68,68,0.1)', color: assessment.category === 'CA' ? '#3B82F6' : '#EF4444' }}>
                      {assessment.category}
                    </span>
                  </div>
                  <h3 className="font-bold text-base mb-2">{assessment.title}</h3>
                  <div className="space-y-1.5 mb-4">
                    <div className="flex items-center gap-2 text-xs" style={{ color: '#6B6660' }}><Users size={12} /> {assessment.group} · {assessment.subject}</div>
                    <div className="flex items-center gap-2 text-xs" style={{ color: '#6B6660' }}><Calendar size={12} /> {new Date(assessment.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                    <div className="flex items-center gap-2 text-xs" style={{ color: '#6B6660' }}><Award size={12} /> Max: {assessment.maxMarks} · Weight: {assessment.weight}%</div>
                  </div>
                  <div className="h-px mb-3" style={{ background: '#E4E1D8' }} />
                  <button onClick={() => openGrading(assessment)} className="btn-gold text-xs w-full justify-center">
                    <Edit2 size={12} /> {assessment.status === 'completed' ? 'View Grades' : 'Enter Grades'}
                  </button>
                </div>
              )
            })}
            {filtered.length === 0 && (
              <div className="col-span-full text-center py-12">
                <p className="text-sm" style={{ color: '#6B6660' }}>No assessments found for the selected filters.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="card animate-in stagger-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="font-bold text-lg">{selectedAssessment.title}</h2>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{ background: selectedAssessment.category === 'CA' ? 'rgba(59,130,246,0.1)' : 'rgba(239,68,68,0.1)', color: selectedAssessment.category === 'CA' ? '#3B82F6' : '#EF4444' }}>
                    {selectedAssessment.category === 'CA' ? 'Continuous Assessment' : 'Terminal Examination'}
                  </span>
                </div>
                <p className="text-sm mt-0.5" style={{ color: '#6B6660' }}>
                  {selectedAssessment.group} · {selectedAssessment.subject} · Max: {selectedAssessment.maxMarks} · Weight: {selectedAssessment.weight}%
                </p>
              </div>
              <button onClick={() => setSelectedAssessment(null)} className="btn-outline text-sm"><X size={14} /> Close</button>
            </div>

            <div className="p-3 rounded-lg mb-4" style={{ background: '#F7F6F3', border: '1px solid #E4E1D8' }}>
              <p className="text-xs" style={{ color: '#6B6660' }}>
                ⚠️ Marks must be between 0 and {selectedAssessment.maxMarks}.
              </p>
            </div>

            {grades.length === 0 ? (
              <p className="text-center py-8 text-sm" style={{ color: '#6B6660' }}>Loading students...</p>
            ) : (
              <>
                <div className="rounded-lg overflow-hidden border" style={{ borderColor: '#E4E1D8' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th style={{ width: 50 }}>#</th>
                        <th>Student</th>
                        <th style={{ width: 140 }}>Marks (/{selectedAssessment.maxMarks})</th>
                        <th style={{ width: 80 }}>%</th>
                        <th>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grades.map((student, idx) => {
                        const pct      = student.marks !== null ? Math.round((student.marks / selectedAssessment.maxMarks) * 100) : null
                        const isOverMax = student.marks !== null && student.marks > selectedAssessment.maxMarks
                        return (
                          <tr key={student.student_id}>
                            <td className="font-mono text-sm" style={{ color: '#6B6660' }}>{idx + 1}</td>
                            <td>
                              <div className="flex items-center gap-2.5">
                                <StudentAvatar initials={student.avatar} />
                                <span className="font-medium">{student.name}</span>
                              </div>
                            </td>
                            <td>
                              <input type="number" min={0} max={selectedAssessment.maxMarks}
                                value={student.marks ?? ''}
                                onChange={e => updateGrade(student.student_id, 'marks', e.target.value === '' ? null : Number(e.target.value))}
                                className="input w-20 text-center" placeholder="—"
                                style={{ borderColor: isOverMax ? '#EF4444' : undefined }} />
                            </td>
                            <td>
                              <span className="text-sm font-medium"
                                style={{ color: pct !== null ? (pct >= 70 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#EF4444') : '#6B6660' }}>
                                {pct !== null ? `${pct}%` : '—'}
                              </span>
                            </td>
                            <td>
                              <input type="text" value={student.remarks}
                                onChange={e => updateGrade(student.student_id, 'remarks', e.target.value)}
                                className="input" placeholder="Optional" />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Summary */}
                <div className="grid grid-cols-4 gap-3 mt-4 p-3 rounded-lg" style={{ background: '#F7F6F3' }}>
                  <div className="text-center">
                    <p className="text-xs" style={{ color: '#6B6660' }}>Graded</p>
                    <p className="font-bold">{grades.filter(g => g.marks !== null).length}/{grades.length}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs" style={{ color: '#6B6660' }}>Average</p>
                    <p className="font-bold">
                      {grades.filter(g => g.marks !== null).length > 0
                        ? Math.round(grades.filter(g => g.marks !== null).reduce((s, g) => s + (g.marks || 0), 0) / grades.filter(g => g.marks !== null).length)
                        : '—'}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs" style={{ color: '#6B6660' }}>Highest</p>
                    <p className="font-bold" style={{ color: '#10B981' }}>
                      {grades.filter(g => g.marks !== null).length > 0
                        ? Math.max(...grades.filter(g => g.marks !== null).map(g => g.marks!))
                        : '—'}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs" style={{ color: '#6B6660' }}>Lowest</p>
                    <p className="font-bold" style={{ color: '#EF4444' }}>
                      {grades.filter(g => g.marks !== null).length > 0
                        ? Math.min(...grades.filter(g => g.marks !== null).map(g => g.marks!))
                        : '—'}
                    </p>
                  </div>
                </div>
              </>
            )}

            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setSelectedAssessment(null)} className="btn-outline">Cancel</button>
              <button onClick={() => saveMutation.mutate(grades)} className="btn-gold"
                disabled={saveMutation.isPending || grades.length === 0}>
                <Save size={14} /> {gradesSaved ? '✓ Saved' : saveMutation.isPending ? 'Saving...' : 'Save Grades'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="card w-full max-w-lg mx-4 animate-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-lg">Create Assessment</h2>
              <button onClick={() => setShowCreateModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100"><X size={18} /></button>
            </div>
            <p className="text-sm mb-4" style={{ color: '#6B6660' }}>
              Note: assessments are saved locally for now. Backend save endpoint coming next.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6660' }}>Category</label>
                <div className="flex gap-2">
                  <button onClick={() => setForm(f => ({ ...f, category: 'CA', type: 'Quiz' }))}
                    className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all"
                    style={{ background: form.category === 'CA' ? 'rgba(59,130,246,0.1)' : '#F7F6F3', color: form.category === 'CA' ? '#3B82F6' : '#6B6660', border: `1px solid ${form.category === 'CA' ? '#3B82F6' : '#E4E1D8'}` }}>
                    Continuous Assessment (40%)
                  </button>
                  <button onClick={() => setForm(f => ({ ...f, category: 'Exam', type: 'Exam', weight: 60 }))}
                    className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all"
                    style={{ background: form.category === 'Exam' ? 'rgba(239,68,68,0.1)' : '#F7F6F3', color: form.category === 'Exam' ? '#EF4444' : '#6B6660', border: `1px solid ${form.category === 'Exam' ? '#EF4444' : '#E4E1D8'}` }}>
                    Terminal Examination (60%)
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6660' }}>Title</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="input"
                  placeholder={form.category === 'CA' ? 'e.g. Weekly Quiz #9' : 'e.g. End of Term Exam'} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6660' }}>Class / Group</label>
                  <select value={form.group_id}
                    onChange={e => {
                      const g = groups.find((x: any) => x.id === e.target.value)
                      setForm(f => ({ ...f, group_id: e.target.value, group: g?.name ?? '', subject: g?.subject ?? '' }))
                    }}
                    className="select">
                    {groups.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6660' }}>Subject</label>
                  <input value={form.subject} readOnly className="input" style={{ background: '#F7F6F3' }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6660' }}>Max Marks</label>
                  <input type="number" value={form.maxMarks} onChange={e => setForm(f => ({ ...f, maxMarks: Number(e.target.value) }))} className="input" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6660' }}>Date</label>
                  <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="input" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowCreateModal(false)} className="btn-outline">Cancel</button>
              <button onClick={() => setShowCreateModal(false)} className="btn-gold" disabled={!form.title || !form.date}>
                <Plus size={14} /> Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
