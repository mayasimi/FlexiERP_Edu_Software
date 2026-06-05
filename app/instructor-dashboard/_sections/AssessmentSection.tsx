'use client'
import { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { teacherApi } from '@/lib/api'
import { Plus, Edit2, Save, X, Users, Calendar, Award, Percent } from 'lucide-react'
import { PageHeader, StudentAvatar } from '../_components'
import { adminMockDb } from '@/lib/admin-mock-db'
import { useAuthStore } from '@/lib/auth-store'
import toast from 'react-hot-toast'

type Subject = { id: string; code: string; type: string; name: string; teacher: string; max_marks: string }
type AssessmentRecord = { id: string; assessment: string; max_score: number }
type GradeRecord = { id: string; lower: number; upper: number; grade: string; remark: string }
type Tab = 'CA' | 'Exam'
type StudentRow = { id: string; name: string; avatar: string }
type StudentMarks = { ca: Record<string, number | null>; exam: number | null; remark: string }
type Mode = 'input' | 'view'

type Props = { mode?: Mode }

const SUBJECTS_STORAGE_KEY = 'edu_subjects_by_class_section_v1'
const ASSESSMENT_STORAGE_KEY = 'edu_results_assessment_setup_v1'
const GRADE_STORAGE_KEY = 'edu_results_grade_setup_v1'
const MARKS_STORAGE_KEY = 'edu_instructor_assessment_marks_v1'

const defaultAssessment: AssessmentRecord[] = [
  { id: 'as-1', assessment: 'Project', max_score: 10 },
  { id: 'as-2', assessment: 'Test', max_score: 20 },
  { id: 'as-3', assessment: 'Exam', max_score: 70 },
]

const defaultGrades: GradeRecord[] = [
  { id: 'gr-1', lower: 75, upper: 100, grade: 'A1', remark: 'EXCELLENT' },
  { id: 'gr-2', lower: 70, upper: 74, grade: 'B2', remark: 'VERY GOOD' },
  { id: 'gr-3', lower: 65, upper: 69, grade: 'B3', remark: 'GOOD' },
  { id: 'gr-4', lower: 60, upper: 64, grade: 'C4', remark: 'CREDIT' },
  { id: 'gr-5', lower: 55, upper: 59, grade: 'C5', remark: 'CREDIT' },
  { id: 'gr-6', lower: 50, upper: 54, grade: 'C6', remark: 'CREDIT' },
  { id: 'gr-7', lower: 45, upper: 49, grade: 'D7', remark: 'PASS' },
  { id: 'gr-8', lower: 40, upper: 44, grade: 'E8', remark: 'PASS' },
  { id: 'gr-9', lower: 0, upper: 39, grade: 'F9', remark: 'FAIL' },
]

const toInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : ''
  return (first + last).toUpperCase()
}

const normalizePersonName = (v: string) =>
  v
    .toLowerCase()
    .replace(/\b(dr|prof|mr|mrs|ms)\.?\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()

const teacherMatches = (teacher: string, current: string) => {
  const a = normalizePersonName(teacher)
  const b = normalizePersonName(current)
  if (!a || !b) return false
  if (a === b) return true
  return a.includes(b) || b.includes(a)
}

const parseGroupKey = (key: string) => {
  const [classId, sectionId] = key.split(':')
  const gradeNum = classId?.match(/\d+/)?.[0] ?? ''
  const sectionLetter = sectionId?.match(/[a-z]$/i)?.[0]?.toUpperCase() ?? ''
  const grade = gradeNum ? `Grade ${gradeNum}` : classId
  const section = sectionLetter ? `Section ${sectionLetter}` : sectionId
  const groupName = gradeNum && sectionLetter ? `Class ${gradeNum}${sectionLetter}` : `${grade} ${section}`
  return { grade, section, groupName }
}

const clampNumber = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export default function AssessmentSection({ mode = 'input' }: Props) {
  const viewOnly = mode === 'view'
  const { user } = useAuthStore()
  const teacherName = user?.name || 'Dr. Robert Chen'

  const [hasMounted, setHasMounted] = useState(false)
  const [subjectsByKey, setSubjectsByKey] = useState<Record<string, Subject[]>>(() => ({
    ['c10:s10a']: adminMockDb.subjects.map((s) => ({ ...s })),
  }))

  const [assessmentByClass, setAssessmentByClass] = useState<Record<string, AssessmentRecord[]>>({})
  const [gradeByClass, setGradeByClass] = useState<Record<string, GradeRecord[]>>({})

  useEffect(() => setHasMounted(true), [])

  useEffect(() => {
    if (!hasMounted) return
    try {
      const rawSubjects = window.localStorage.getItem(SUBJECTS_STORAGE_KEY)
      if (rawSubjects) {
        const parsed = JSON.parse(rawSubjects) as Record<string, Subject[]>
        if (parsed && typeof parsed === 'object') setSubjectsByKey((prev) => ({ ...prev, ...parsed }))
      }
    } catch {}
  }, [hasMounted])

  useEffect(() => {
    if (!hasMounted) return
    try {
      const rawA = window.localStorage.getItem(ASSESSMENT_STORAGE_KEY)
      const rawG = window.localStorage.getItem(GRADE_STORAGE_KEY)
      if (rawA) setAssessmentByClass(JSON.parse(rawA))
      if (rawG) setGradeByClass(JSON.parse(rawG))
    } catch {}
  }, [hasMounted])

  const assignedGroups = useMemo(() => {
    const groups: Array<{ key: string; grade: string; section: string; groupName: string; subjects: string[] }> = []
    for (const [key, list] of Object.entries(subjectsByKey)) {
      const mine = (list ?? []).filter((s) => teacherMatches(s.teacher, teacherName))
      if (mine.length === 0) continue
      const { grade, section, groupName } = parseGroupKey(key)
      groups.push({
        key,
        grade,
        section,
        groupName,
        subjects: Array.from(new Set(mine.map((s) => s.name))).sort((a, b) => a.localeCompare(b)),
      })
    }
    return groups.sort((a, b) => a.groupName.localeCompare(b.groupName))
  }, [subjectsByKey, teacherName])

  const [selectedGroupKey, setSelectedGroupKey] = useState<string>('')
  const groupInfo = useMemo(() => assignedGroups.find((g) => g.key === selectedGroupKey) ?? null, [assignedGroups, selectedGroupKey])
  const [selectedSubject, setSelectedSubject] = useState<string>('')

  useEffect(() => {
    if (!assignedGroups.length) return
    setSelectedGroupKey((prev) => prev || assignedGroups[0].key)
  }, [assignedGroups])

  useEffect(() => {
    if (!groupInfo) return
    setSelectedSubject((prev) => prev || groupInfo.subjects[0] || '')
  }, [groupInfo])

  const [activeTab, setActiveTab] = useState<Tab>('CA')
  const currentClass = groupInfo?.grade || ''

  const assessmentConfig = useMemo(() => {
    const list = assessmentByClass[currentClass]
    return Array.isArray(list) && list.length ? list : defaultAssessment
  }, [assessmentByClass, currentClass])

  const gradeConfig = useMemo(() => {
    const list = gradeByClass[currentClass]
    return Array.isArray(list) && list.length ? list : defaultGrades
  }, [gradeByClass, currentClass])

  const examRow = useMemo(() => {
    return assessmentConfig.find((r) => /exam/i.test(r.assessment)) ?? null
  }, [assessmentConfig])

  const caRows = useMemo(() => {
    const list = assessmentConfig.filter((r) => !/exam/i.test(r.assessment))
    return list.length ? list : [{ id: 'as-ca', assessment: 'CA', max_score: 40 }]
  }, [assessmentConfig])

  const caMax = useMemo(() => caRows.reduce((sum, r) => sum + (Number.isFinite(r.max_score) ? r.max_score : 0), 0), [caRows])
  const examMax = useMemo(() => (examRow && Number.isFinite(examRow.max_score) ? examRow.max_score : 60), [examRow])
  const totalMax = useMemo(() => caMax + examMax, [caMax, examMax])

  const students = useMemo<StudentRow[]>(() => {
    if (!groupInfo) return []
    return adminMockDb.students
      .filter((s) => s.grade === groupInfo.grade && s.section === groupInfo.section)
      .map((s) => ({ id: s.id, name: s.name, avatar: toInitials(s.name) }))
  }, [groupInfo])

  const selectionKey = useMemo(() => {
    if (!groupInfo || !selectedSubject) return ''
    const teacherKey = normalizePersonName(teacherName).replace(/\s+/g, '_')
    return `${teacherKey}|${groupInfo.key}|${selectedSubject}`
  }, [groupInfo, selectedSubject, teacherName])

  const [marksByStudent, setMarksByStudent] = useState<Record<string, StudentMarks>>({})
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!hasMounted || !selectionKey) return
    try {
      const raw = window.localStorage.getItem(MARKS_STORAGE_KEY)
      const store = raw ? (JSON.parse(raw) as Record<string, Record<string, StudentMarks>>) : {}
      const existing = store[selectionKey] ?? {}
      const next: Record<string, StudentMarks> = {}
      for (const st of students) {
        const prev = existing[st.id]
        const ca: Record<string, number | null> = {}
        for (const r of caRows) {
          ca[r.assessment] = prev?.ca?.[r.assessment] ?? null
        }
        next[st.id] = {
          ca,
          exam: prev?.exam ?? null,
          remark: typeof (prev as any)?.remark === 'string' ? (prev as any).remark : '',
        }
      }
      setMarksByStudent(next)
      setSaved(false)
    } catch {
      setMarksByStudent({})
      setSaved(false)
    }
  }, [hasMounted, selectionKey, students, caRows])

  const updateCa = (studentId: string, assessment: string, value: string) => {
    const max = caRows.find((r) => r.assessment === assessment)?.max_score ?? 0
    const trimmed = value.trim()
    const num = trimmed === '' ? null : Number(trimmed)
    const v = num === null || !Number.isFinite(num) ? null : clampNumber(num, 0, max)
    setMarksByStudent((prev) => ({
      ...prev,
      [studentId]: {
        ca: { ...(prev[studentId]?.ca ?? {}), [assessment]: v },
        exam: prev[studentId]?.exam ?? null,
        remark: prev[studentId]?.remark ?? '',
      },
    }))
    setSaved(false)
  }

  const updateExam = (studentId: string, value: string) => {
    const trimmed = value.trim()
    const num = trimmed === '' ? null : Number(trimmed)
    const v = num === null || !Number.isFinite(num) ? null : clampNumber(num, 0, examMax)
    setMarksByStudent((prev) => ({
      ...prev,
      [studentId]: {
        ca: prev[studentId]?.ca ?? {},
        exam: v,
        remark: prev[studentId]?.remark ?? '',
      },
    }))
    setSaved(false)
  }

  const updateRemark = (studentId: string, value: string) => {
    setMarksByStudent((prev) => ({
      ...prev,
      [studentId]: {
        ca: prev[studentId]?.ca ?? {},
        exam: prev[studentId]?.exam ?? null,
        remark: value,
      },
    }))
    setSaved(false)
  }

  const computeTotals = (studentId: string) => {
    const m = marksByStudent[studentId]
    const caTotal = Object.values(m?.ca ?? {}).reduce<number>((sum, v) => sum + (v ?? 0), 0)
    const exam = m?.exam ?? 0
    const total = caTotal + exam
    const pct = totalMax > 0 ? (total / totalMax) * 100 : 0
    const roundedPct = Math.round(pct * 10) / 10
    const rule = gradeConfig.find((g) => roundedPct >= g.lower && roundedPct <= g.upper) ?? null
    return { caTotal, exam: m?.exam, total, pct: roundedPct, grade: rule?.grade ?? '—', autoRemark: rule?.remark ?? '—' }
  }

  const handleSave = () => {
    if (!hasMounted || !selectionKey) return
    try {
      const raw = window.localStorage.getItem(MARKS_STORAGE_KEY)
      const store = raw ? (JSON.parse(raw) as Record<string, Record<string, StudentMarks>>) : {}
      store[selectionKey] = marksByStudent
      window.localStorage.setItem(MARKS_STORAGE_KEY, JSON.stringify(store))
      setSaved(true)
      toast.success('Saved.')
    } catch {
      toast.error('Could not save.')
    }
  }

  return (
    <div>
      <PageHeader
        title={mode === 'view' ? 'Assessment (View Score)' : 'Assessment (Input Score)'}
        subtitle="Only CA and Terminal Exam are available. Grading is applied from the admin Results setup."
      />

      <div className="px-6 pb-8 space-y-4">
        <div className="card animate-in">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6660' }}>Teacher</label>
              <div className="input w-64 flex items-center" style={{ background: '#F7F6F3' }}>{teacherName}</div>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6660' }}>Class</label>
              <select
                value={selectedGroupKey}
                onChange={(e) => {
                  setSelectedGroupKey(e.target.value)
                  setSelectedSubject('')
                }}
                className="select w-56"
                disabled={assignedGroups.length === 0}
              >
                {assignedGroups.length === 0 ? (
                  <option value="">No assigned classes</option>
                ) : (
                  assignedGroups.map((g) => (
                    <option key={g.key} value={g.key}>{g.groupName}</option>
                  ))
                )}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6660' }}>Subject</label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="select w-72"
                disabled={!groupInfo || groupInfo.subjects.length === 0}
              >
                {!groupInfo ? (
                  <option value="">Select class</option>
                ) : groupInfo.subjects.length === 0 ? (
                  <option value="">No assigned subjects</option>
                ) : (
                  groupInfo.subjects.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))
                )}
              </select>
            </div>
            <div className="ml-auto flex items-end gap-2">
              <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: '#E4E1D8' }}>
                {([
                  { id: 'CA' as const, label: 'CA' },
                  { id: 'Exam' as const, label: 'Terminal Exam' },
                ]).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveTab(t.id)}
                    className="px-4 py-2 text-sm font-medium transition-all"
                    style={{
                      background: activeTab === t.id ? '#C9A020' : 'white',
                      color: activeTab === t.id ? 'white' : '#6B6660',
                      borderLeft: t.id === 'Exam' ? '1px solid #E4E1D8' : 'none',
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              {!viewOnly ? (
                <button type="button" className="btn-gold flex items-center gap-2" disabled={!selectionKey} onClick={handleSave}>
                  <Save size={14} /> {saved ? 'Saved' : 'Save'}
                </button>
              ) : null}
            </div>
          </div>

          {groupInfo ? (
            <div className="mt-4 text-xs" style={{ color: '#6B6660' }}>
              Using admin setup for {groupInfo.grade}: CA max {caMax}, Exam max {examMax}, Total {totalMax}
            </div>
          ) : null}
        </div>

        {assignedGroups.length === 0 ? (
          <div className="card animate-in">
            <div className="text-sm" style={{ color: '#6B6660' }}>
              No assigned classes found for this teacher. Assign subjects to this teacher in Academics to enable assessment entry.
            </div>
          </div>
        ) : (
          <div className="card animate-in">
            <div className="rounded-xl overflow-hidden border" style={{ borderColor: '#E4E1D8' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 56 }}>#</th>
                    <th>Student</th>
                    {activeTab === 'CA' ? (
                      <>
                        {caRows.map((r) => (
                          <th key={r.id} style={{ width: 130 }}>{r.assessment} (/{r.max_score})</th>
                        ))}
                        <th style={{ width: 120 }}>CA Total (/{caMax})</th>
                      </>
                    ) : (
                      <th style={{ width: 160 }}>{examRow?.assessment || 'Exam'} (/{examMax})</th>
                    )}
                    <th style={{ width: 120 }}>Total (/{totalMax})</th>
                    <th style={{ width: 90 }}>%</th>
                    {activeTab === 'Exam' ? <th style={{ width: 90 }}>Grade</th> : null}
                    <th style={{ width: 220 }}>Remark</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((st, idx) => {
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
                            {caRows.map((r) => (
                              <td key={r.id}>
                                {viewOnly ? (
                                  <span className="font-medium" style={{ color: '#6B6660' }}>
                                    {marksByStudent[st.id]?.ca?.[r.assessment] ?? '—'}
                                  </span>
                                ) : (
                                  <input
                                    type="number"
                                    min={0}
                                    max={r.max_score}
                                    value={marksByStudent[st.id]?.ca?.[r.assessment] ?? ''}
                                    onChange={(e) => updateCa(st.id, r.assessment, e.target.value)}
                                    className="input w-28 text-center"
                                    placeholder="—"
                                  />
                                )}
                              </td>
                            ))}
                            <td className="font-bold">{totals.caTotal}</td>
                          </>
                        ) : (
                          <td>
                            {viewOnly ? (
                              <span className="font-medium" style={{ color: '#6B6660' }}>
                                {marksByStudent[st.id]?.exam ?? '—'}
                              </span>
                            ) : (
                              <input
                                type="number"
                                min={0}
                                max={examMax}
                                value={marksByStudent[st.id]?.exam ?? ''}
                                onChange={(e) => updateExam(st.id, e.target.value)}
                                className="input w-28 text-center"
                                placeholder="—"
                              />
                            )}
                          </td>
                        )}
                        <td className="font-bold">{totals.total}</td>
                        <td className="font-medium" style={{ color: '#6B6660' }}>{Number.isFinite(totals.pct) ? `${totals.pct}%` : '—'}</td>
                        {activeTab === 'Exam' ? <td className="font-bold">{totals.grade}</td> : null}
                        <td>
                          {viewOnly ? (
                            <span className="font-medium" style={{ color: '#6B6660' }}>
                              {marksByStudent[st.id]?.remark?.trim() ? marksByStudent[st.id].remark : '—'}
                            </span>
                          ) : (
                            <input
                              type="text"
                              value={marksByStudent[st.id]?.remark ?? ''}
                              onChange={(e) => updateRemark(st.id, e.target.value)}
                              className="input"
                              placeholder="Write remark…"
                            />
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan={activeTab === 'CA' ? 6 + caRows.length : 6} style={{ padding: 20 }}>
                        <div className="text-sm" style={{ color: '#6B6660' }}>No students found for this class/section.</div>
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {groupInfo ? (
          <div className="card animate-in">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#6B6660' }}>Grading Scale Applied</h3>
            </div>
            <div className="rounded-xl overflow-hidden border" style={{ borderColor: '#E4E1D8' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Lower</th>
                    <th>Upper</th>
                    <th>Grade</th>
                    <th>Remark</th>
                  </tr>
                </thead>
                <tbody>
                  {gradeConfig
                    .slice()
                    .sort((a, b) => b.upper - a.upper)
                    .map((g) => (
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
        ) : null}
      </div>
    </div>
  )
}
