'use client'
import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Save } from 'lucide-react'
import { PageHeader, StudentAvatar } from '../_components'
import { teacherApi } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'
import toast from 'react-hot-toast'

// ── Types ──────────────────────────────────────────────────────────────────
type AssessmentRecord = { id: string; assessment: string; max_score: number }
type GradeRecord      = { id: string; lower: number; upper: number; grade: string; remark: string }
type Tab              = 'CA' | 'Exam'
type StudentRow       = { id: string; name: string; avatar: string }
type StudentMarks     = { ca: Record<string, number | null>; exam: number | null; remark: string }
type Mode             = 'input' | 'view'
type Props            = { mode?: Mode }

const DEFAULT_GRADES: GradeRecord[] = [
  { id: 'gr-1', lower: 75, upper: 100, grade: 'A1', remark: 'EXCELLENT'  },
  { id: 'gr-2', lower: 70, upper: 74,  grade: 'B2', remark: 'VERY GOOD'  },
  { id: 'gr-3', lower: 65, upper: 69,  grade: 'B3', remark: 'GOOD'       },
  { id: 'gr-4', lower: 60, upper: 64,  grade: 'C4', remark: 'CREDIT'     },
  { id: 'gr-5', lower: 55, upper: 59,  grade: 'C5', remark: 'CREDIT'     },
  { id: 'gr-6', lower: 50, upper: 54,  grade: 'C6', remark: 'CREDIT'     },
  { id: 'gr-7', lower: 45, upper: 49,  grade: 'D7', remark: 'PASS'       },
  { id: 'gr-8', lower: 40, upper: 44,  grade: 'E8', remark: 'PASS'       },
  { id: 'gr-9', lower: 0,  upper: 39,  grade: 'F9', remark: 'FAIL'       },
]

const DEFAULT_CA_ROWS: AssessmentRecord[] = [
  { id: 'ca-1', assessment: 'CA 1', max_score: 20 },
  { id: 'ca-2', assessment: 'CA 2', max_score: 20 },
]
const DEFAULT_EXAM_ROW: AssessmentRecord = { id: 'ex-1', assessment: 'Exam', max_score: 60 }

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
const toInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase()
}

export default function AssessmentSection({ mode = 'input' }: Props) {
  const viewOnly    = mode === 'view'
  const queryClient = useQueryClient()
  const { user }    = useAuthStore()

  const [selectedGroupId,   setSelectedGroupId]   = useState<string>('')
  const [selectedSubjectId, setSelectedSubjectId] = useState<number>(0)
  const [activeTab,         setActiveTab]          = useState<Tab>('CA')
  const [marksByStudent,    setMarksByStudent]     = useState<Record<string, StudentMarks>>({})
  const [saved,             setSaved]              = useState(false)

  // ── Track whether we've already seeded marks from DB for this context ─────
  // This prevents the grades refetch after save from overwriting what the
  // teacher is currently typing.
  const initialisedForRef = useRef<string>('')   // key = `${groupId}|${subjectId}|${tab}`

  // ── 1. Teacher's groups ───────────────────────────────────────────────────
  const { data: groups = [], isLoading: groupsLoading } = useQuery({
    queryKey: ['teacher-groups'],
    queryFn:  () => teacherApi.getGroups().then(r => r.data),
  })

  useEffect(() => {
    if (groups.length > 0 && !selectedGroupId) {
      setSelectedGroupId(groups[0].id)
      setSelectedSubjectId(groups[0].subject_id ?? 0)
    }
  }, [groups, selectedGroupId])

  const uniqueGroups            = groups.filter((g: any, i: number, arr: any[]) => arr.findIndex((x: any) => x.id === g.id) === i)
  const subjectsForSelectedGroup = groups.filter((g: any) => g.id === selectedGroupId)
  const currentGroup            = uniqueGroups.find((g: any) => g.id === selectedGroupId)

  // ── 2. Assessments for selected section ───────────────────────────────────
  const { data: assessments = [] } = useQuery({
    queryKey: ['teacher-assessments', selectedGroupId],
    queryFn:  () => teacherApi.getAssessments(selectedGroupId).then(r => r.data),
    enabled:  !!selectedGroupId,
  })

  const subjectAssessments = assessments.filter((a: any) =>
    !selectedSubjectId || Number(a.subject_id) === Number(selectedSubjectId)
  )

  const caRows: AssessmentRecord[] = subjectAssessments
    .filter((a: any) => a.category === 'CA')
    .map((a: any) => ({ id: String(a.id), assessment: a.title, max_score: a.maxMarks }))

  const examAssessment = subjectAssessments.find((a: any) => a.category === 'Exam')
  const examRow: AssessmentRecord = examAssessment
    ? { id: String(examAssessment.id), assessment: examAssessment.title, max_score: examAssessment.maxMarks }
    : DEFAULT_EXAM_ROW

  const activeCaRows  = caRows.length > 0 ? caRows : DEFAULT_CA_ROWS
  const activeExamRow = examRow
  const caMax         = activeCaRows.reduce((s, r) => s + r.max_score, 0)
  const examMax       = activeExamRow.max_score
  const totalMax      = caMax + examMax

  // ── 3. Students ───────────────────────────────────────────────────────────
  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['group-students', selectedGroupId],
    queryFn:  () => teacherApi.getGroupStudents(selectedGroupId).then(r => r.data),
    enabled:  !!selectedGroupId,
  })

  const studentRows: StudentRow[] = students.map((s: any) => ({
    id:     String(s.id),
    name:   s.name,
    avatar: s.avatar ?? toInitials(s.name),
  }))

  // ── 4. Existing grades — fetched per assessment ───────────────────────────
  // We fetch ALL CA assessments + exam and merge them, so the teacher sees
  // all previously saved scores when they open the page.
  // Key insight: we fetch once per context change, NOT after every save.
  const allAssessmentIds = [
    ...activeCaRows.filter(r => !isNaN(Number(r.id))).map(r => r.id),
    ...(examAssessment ? [String(examAssessment.id)] : []),
  ]

  // Fetch grades for the first CA assessment (representative — all share same student list)
  const primaryAssessmentId = activeCaRows[0]?.id && !isNaN(Number(activeCaRows[0].id))
    ? activeCaRows[0].id
    : examAssessment ? String(examAssessment.id) : null

  const { data: existingGrades = [], dataUpdatedAt } = useQuery({
    queryKey: ['assessment-grades', selectedGroupId, selectedSubjectId],
    queryFn:  async () => {
      // Fetch grades for ALL assessments of this subject in parallel
      const ids = [
        ...subjectAssessments
          .filter((a: any) => !isNaN(Number(a.id)))
          .map((a: any) => String(a.id)),
      ]
      if (ids.length === 0) return []
      const results = await Promise.all(
        ids.map(id => teacherApi.getAssessmentGrades(id).then(r =>
          (r.data as any[]).map((g: any) => ({ ...g, assessment_id: id }))
        ))
      )
      return results.flat()
    },
    enabled:           !!selectedGroupId && subjectAssessments.length > 0,
    // CRITICAL: do not refetch automatically — only refetch on explicit context change
    staleTime:         Infinity,
    refetchOnMount:    false,
    refetchOnFocus:    false,
  })

  // ── Seed marks from DB — only once per (group, subject, tab) context ──────
  const initialisationKey = `${selectedGroupId}|${selectedSubjectId}|${activeTab}`

  useEffect(() => {
    // Only run when context changes (different class/subject/tab) or students first load
    if (studentRows.length === 0) return
    if (initialisedForRef.current === initialisationKey) return  // already seeded — don't overwrite

    // Build a map: assessment_id → student_id → marks
    const gradeMap: Record<string, Record<string, number | null>> = {}
    const remarkMap: Record<string, string> = {}

    existingGrades.forEach((g: any) => {
      const aId = String(g.assessment_id)
      if (!gradeMap[aId]) gradeMap[aId] = {}
      gradeMap[aId][String(g.student_id)] = g.marks
      if (g.remarks) remarkMap[String(g.student_id)] = g.remarks
    })

    const next: Record<string, StudentMarks> = {}
    for (const st of studentRows) {
      // CA marks: look up each CA assessment separately
      const ca: Record<string, number | null> = {}
      for (const r of activeCaRows) {
        ca[r.assessment] = gradeMap[r.id]?.[st.id] ?? null
      }
      // Exam marks
      const examId = examAssessment ? String(examAssessment.id) : null
      const exam   = examId ? gradeMap[examId]?.[st.id] ?? null : null

      next[st.id] = {
        ca,
        exam,
        remark: remarkMap[st.id] ?? '',
      }
    }

    setMarksByStudent(next)
    setSaved(false)
    initialisedForRef.current = initialisationKey   // mark as seeded
  }, [initialisationKey, studentRows.length, existingGrades.length])
  // NOTE: intentionally NOT including marksByStudent — that would cause overwrite loop

  // ── Reset initialisation flag when context changes ────────────────────────
  useEffect(() => {
    initialisedForRef.current = ''  // force re-seed when group/subject/tab changes
  }, [selectedGroupId, selectedSubjectId, activeTab])

  // ── Invalidate grades cache when context changes so fresh data loads ───────
  useEffect(() => {
    if (selectedGroupId && selectedSubjectId) {
      queryClient.invalidateQueries({
        queryKey: ['assessment-grades', selectedGroupId, selectedSubjectId],
      })
    }
  }, [selectedGroupId, selectedSubjectId])

  // ── Update helpers — these ONLY update local state, never touch DB ─────────
  const updateCa = (studentId: string, assessment: string, value: string) => {
    const max     = activeCaRows.find(r => r.assessment === assessment)?.max_score ?? 0
    const trimmed = value.trim()
    const num     = trimmed === '' ? null : Number(trimmed)
    const v       = num === null || !Number.isFinite(num) ? null : clamp(num, 0, max)
    setMarksByStudent(prev => ({
      ...prev,
      [studentId]: {
        ca:     { ...(prev[studentId]?.ca ?? {}), [assessment]: v },
        exam:   prev[studentId]?.exam ?? null,
        remark: prev[studentId]?.remark ?? '',
      },
    }))
    setSaved(false)
  }

  const updateExam = (studentId: string, value: string) => {
    const trimmed = value.trim()
    const num     = trimmed === '' ? null : Number(trimmed)
    const v       = num === null || !Number.isFinite(num) ? null : clamp(num, 0, examMax)
    setMarksByStudent(prev => ({
      ...prev,
      [studentId]: {
        ca:     prev[studentId]?.ca ?? {},
        exam:   v,
        remark: prev[studentId]?.remark ?? '',
      },
    }))
    setSaved(false)
  }

  const updateRemark = (studentId: string, value: string) => {
    setMarksByStudent(prev => ({
      ...prev,
      [studentId]: {
        ca:     prev[studentId]?.ca ?? {},
        exam:   prev[studentId]?.exam ?? null,
        remark: value,
      },
    }))
    setSaved(false)
  }

  const computeTotals = (studentId: string) => {
    const m       = marksByStudent[studentId]
    const caTotal = Object.values(m?.ca ?? {}).reduce<number>((sum, v) => sum + (v ?? 0), 0)
    const exam    = m?.exam ?? 0
    const total   = caTotal + exam
    const pct     = totalMax > 0 ? Math.round((total / totalMax) * 1000) / 10 : 0
    const rule    = DEFAULT_GRADES.find(g => pct >= g.lower && pct <= g.upper) ?? null
    return { caTotal, exam: m?.exam, total, pct, grade: rule?.grade ?? '—', autoRemark: rule?.remark ?? '—' }
  }

  // ── Save to DB ────────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: () => {
      const promises: Promise<any>[] = []

      if (activeTab === 'Exam' && examAssessment) {
        const grades = studentRows.map(st => ({
          student_id: st.id,
          marks:      marksByStudent[st.id]?.exam ?? null,
          remarks:    marksByStudent[st.id]?.remark ?? '',
        }))
        promises.push(teacherApi.saveGrades(String(examAssessment.id), grades))
      }

      if (activeTab === 'CA') {
        for (const row of activeCaRows) {
          if (!row.id || isNaN(Number(row.id))) continue  // skip default placeholders
          const grades = studentRows.map(st => ({
            student_id: st.id,
            marks:      marksByStudent[st.id]?.ca?.[row.assessment] ?? null,
            remarks:    marksByStudent[st.id]?.remark ?? '',
          }))
          promises.push(teacherApi.saveGrades(row.id, grades))
        }
      }

      if (promises.length === 0) {
        const tabLabel = activeTab === 'CA' ? 'CA' : 'Exam'
        toast.error(`No ${tabLabel} assessments found in DB for this subject. Ask admin to create them.`)
        return Promise.resolve()
      }

      return Promise.all(promises)
    },
    onSuccess: () => {
      toast.success('Grades saved!')
      setSaved(true)
      // Update the ref so next load still reads from DB correctly
      // but do NOT invalidate — that would trigger a re-seed and overwrite current state
      // Teacher can refresh manually if they want to reload from DB
    },
    onError: () => toast.error('Failed to save grades.'),
  })

  return (
    <div>
      <PageHeader
        title={mode === 'view' ? 'Assessment (View Score)' : 'Assessment (Input Score)'}
        subtitle="Only CA and Terminal Exam are available."
      />

      <div className="px-6 pb-8 space-y-4">
        <div className="card animate-in">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6660' }}>Teacher</label>
              <div className="input w-64 flex items-center" style={{ background: '#F7F6F3' }}>{user?.name ?? '—'}</div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6660' }}>Class</label>
              <select
                value={selectedGroupId}
                onChange={e => {
                  const id = e.target.value
                  setSelectedGroupId(id)
                  const g = groups.find((x: any) => x.id === id)
                  setSelectedSubjectId(g?.subject_id ?? 0)
                }}
                className="select w-56"
                disabled={groupsLoading || uniqueGroups.length === 0}
              >
                {groupsLoading && <option value="">Loading...</option>}
                {!groupsLoading && uniqueGroups.length === 0 && <option value="">No assigned classes</option>}
                {uniqueGroups.map((g: any) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6660' }}>Subject</label>
              <select
                value={selectedSubjectId}
                onChange={e => setSelectedSubjectId(Number(e.target.value))}
                className="select w-56"
                disabled={subjectsForSelectedGroup.length === 0}
              >
                {subjectsForSelectedGroup.map((g: any) => (
                  <option key={g.subject_id} value={g.subject_id}>{g.subject}</option>
                ))}
                {subjectsForSelectedGroup.length === 0 && <option value={0}>—</option>}
              </select>
            </div>

            <div className="ml-auto flex items-end gap-2">
              <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: '#E4E1D8' }}>
                {([{ id: 'CA' as const, label: 'CA' }, { id: 'Exam' as const, label: 'Terminal Exam' }]).map(t => (
                  <button key={t.id} type="button" onClick={() => setActiveTab(t.id)}
                    className="px-4 py-2 text-sm font-medium transition-all"
                    style={{ background: activeTab === t.id ? '#C9A020' : 'white', color: activeTab === t.id ? 'white' : '#6B6660', borderLeft: t.id === 'Exam' ? '1px solid #E4E1D8' : 'none' }}>
                    {t.label}
                  </button>
                ))}
              </div>
              {!viewOnly && (
                <button type="button" className="btn-gold flex items-center gap-2"
                  disabled={!selectedGroupId || saveMutation.isPending}
                  onClick={() => saveMutation.mutate()}>
                  <Save size={14} />
                  {saveMutation.isPending ? 'Saving...' : saved ? 'Saved ✓' : 'Save'}
                </button>
              )}
            </div>
          </div>

          {currentGroup && (
            <div className="mt-4 text-xs" style={{ color: '#6B6660' }}>
              {currentGroup.name} · CA max {caMax} · Exam max {examMax} · Total {totalMax}
            </div>
          )}
        </div>

        {!groupsLoading && uniqueGroups.length === 0 && (
          <div className="card animate-in">
            <p className="text-sm" style={{ color: '#6B6660' }}>
              No assigned classes found. Ask admin to assign subjects to you in Academics.
            </p>
          </div>
        )}

        {uniqueGroups.length > 0 && (
          <div className="card animate-in">
            {studentsLoading ? (
              <p className="text-sm text-center py-8" style={{ color: '#6B6660' }}>Loading students...</p>
            ) : (
              <div className="rounded-xl overflow-hidden border" style={{ borderColor: '#E4E1D8' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: 56 }}>#</th>
                      <th>Student</th>
                      {activeTab === 'CA' ? (
                        <>
                          {activeCaRows.map(r => <th key={r.id} style={{ width: 140 }}>{r.assessment} (/{r.max_score})</th>)}
                          <th style={{ width: 120 }}>CA Total (/{caMax})</th>
                        </>
                      ) : (
                        <th style={{ width: 160 }}>{activeExamRow.assessment} (/{examMax})</th>
                      )}
                      <th style={{ width: 120 }}>Total (/{totalMax})</th>
                      <th style={{ width: 90 }}>%</th>
                      {activeTab === 'Exam' && <th style={{ width: 90 }}>Grade</th>}
                      <th style={{ width: 220 }}>Remark</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentRows.map((st, idx) => {
                      const totals = computeTotals(st.id)
                      return (
                        <tr key={st.id}>
                          <td className="font-mono text-sm" style={{ color: '#6B6660' }}>{idx + 1}</td>
                          <td>
                            <div className="flex items-center gap-2.5">
                              <StudentAvatar initials={st.avatar} />
                              <span className="font-medium">{st.name}</span>
                            </div>
                          </td>
                          {activeTab === 'CA' ? (
                            <>
                              {activeCaRows.map(r => (
                                <td key={r.id}>
                                  {viewOnly ? (
                                    <span style={{ color: '#6B6660' }}>{marksByStudent[st.id]?.ca?.[r.assessment] ?? '—'}</span>
                                  ) : (
                                    <input type="number" min={0} max={r.max_score}
                                      value={marksByStudent[st.id]?.ca?.[r.assessment] ?? ''}
                                      onChange={e => updateCa(st.id, r.assessment, e.target.value)}
                                      className="input w-28 text-center" placeholder="—" />
                                  )}
                                </td>
                              ))}
                              <td className="font-bold">{totals.caTotal}</td>
                            </>
                          ) : (
                            <td>
                              {viewOnly ? (
                                <span style={{ color: '#6B6660' }}>{marksByStudent[st.id]?.exam ?? '—'}</span>
                              ) : (
                                <input type="number" min={0} max={examMax}
                                  value={marksByStudent[st.id]?.exam ?? ''}
                                  onChange={e => updateExam(st.id, e.target.value)}
                                  className="input w-28 text-center" placeholder="—" />
                              )}
                            </td>
                          )}
                          <td className="font-bold">{totals.total}</td>
                          <td className="font-medium" style={{ color: '#6B6660' }}>
                            {Number.isFinite(totals.pct) ? `${totals.pct}%` : '—'}
                          </td>
                          {activeTab === 'Exam' && <td className="font-bold">{totals.grade}</td>}
                          <td>
                            {viewOnly ? (
                              <span style={{ color: '#6B6660' }}>{marksByStudent[st.id]?.remark || '—'}</span>
                            ) : (
                              <input type="text" value={marksByStudent[st.id]?.remark ?? ''}
                                onChange={e => updateRemark(st.id, e.target.value)}
                                className="input" placeholder="Write remark…" />
                            )}
                          </td>
                        </tr>
                      )
                    })}
                    {studentRows.length === 0 && !studentsLoading && (
                      <tr>
                        <td colSpan={activeTab === 'CA' ? 6 + activeCaRows.length : 6} style={{ padding: 20 }}>
                          <p className="text-sm" style={{ color: '#6B6660' }}>No students in this class yet.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {uniqueGroups.length > 0 && (
          <div className="card animate-in">
            <h3 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#6B6660' }}>Grading Scale</h3>
            <div className="rounded-xl overflow-hidden border" style={{ borderColor: '#E4E1D8' }}>
              <table className="table">
                <thead><tr><th>Lower</th><th>Upper</th><th>Grade</th><th>Remark</th></tr></thead>
                <tbody>
                  {DEFAULT_GRADES.slice().sort((a, b) => b.upper - a.upper).map(g => (
                    <tr key={g.id}>
                      <td style={{ color: '#6B6660' }}>{g.lower}</td>
                      <td style={{ color: '#6B6660' }}>{g.upper}</td>
                      <td className="font-semibold">{g.grade}</td>
                      <td style={{ color: '#6B6660' }}>{g.remark}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
