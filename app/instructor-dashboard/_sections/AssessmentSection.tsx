'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Download, Save, Upload } from 'lucide-react'
import { PageHeader, StudentAvatar } from '../_components'
import { adminMockDb } from '@/lib/admin-mock-db'
import { useAuthStore } from '@/lib/auth-store'
import { withActiveTermKey } from '@/lib/utils'
import toast from 'react-hot-toast'

type Subject = { id: string; code: string; type: string; name: string; teacher: string; max_marks: string }
type AssessmentRecord = { id: string; assessment: string; max_score: number }
type GradeRecord = { id: string; lower: number; upper: number; grade: string; remark: string }
type BehaviourSkillRecord = { id: string; type: 'Behaviour' | 'Skill'; name: string; max_score: number }
type StudentBehaviourSkillMarks = Record<string, number | null>
type Tab = 'CA' | 'Exam' | 'Behaviour & Skills'
type StudentRow = { id: string; name: string; avatar: string; admission_no: string }
type StudentMarks = { ca: Record<string, number | null>; exam: number | null; remark: string }
type Mode = 'input' | 'view'

type Props = { mode?: Mode }

const SUBJECTS_STORAGE_KEY = 'edu_subjects_by_class_section_v1'
const ASSESSMENT_STORAGE_KEY = 'edu_results_assessment_setup_v1'
const GRADE_STORAGE_KEY = 'edu_results_grade_setup_v1'
const BEHAVIOUR_SKILL_STORAGE_KEY = 'edu_results_behaviour_skill_setup_v1'
const MARKS_STORAGE_KEY = 'edu_instructor_assessment_marks_v1'
const BEHAVIOUR_SKILL_MARKS_STORAGE_KEY = 'edu_instructor_behaviour_skill_marks_v1'

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

const escapeCsv = (value: unknown) => {
  const raw = (value ?? '').toString()
  if (/[",\n\r]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`
  return raw
}

const parseCsvLine = (line: string) => {
  const out: string[] = []
  let cur = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]
    if (ch === '"') {
      const next = line[i + 1]
      if (inQuotes && next === '"') {
        cur += '"'
        i += 1
        continue
      }
      inQuotes = !inQuotes
      continue
    }
    if (ch === ',' && !inQuotes) {
      out.push(cur)
      cur = ''
      continue
    }
    cur += ch
  }
  out.push(cur)
  return out.map((v) => v.trim())
}

const parseCsv = (text: string) => {
  const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = normalized.split('\n').filter((l) => l.trim().length > 0)
  if (lines.length === 0) return { headers: [] as string[], rows: [] as string[][] }
  const headers = parseCsvLine(lines[0]).map((h) => h.trim())
  const rows = lines.slice(1).map((l) => parseCsvLine(l))
  return { headers, rows }
}

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
  const importRef = useRef<HTMLInputElement>(null)

  const [hasMounted, setHasMounted] = useState(false)
  const [subjectsByKey, setSubjectsByKey] = useState<Record<string, Subject[]>>(() => ({
    ['c10:s10a']: adminMockDb.subjects.map((s) => ({ ...s })),
  }))

  const [assessmentByClass, setAssessmentByClass] = useState<Record<string, AssessmentRecord[]>>({})
  const [gradeByClass, setGradeByClass] = useState<Record<string, GradeRecord[]>>({})
  const [behaviourSkillByClass, setBehaviourSkillByClass] = useState<Record<string, BehaviourSkillRecord[]>>({})

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
      const rawA = window.localStorage.getItem(withActiveTermKey(ASSESSMENT_STORAGE_KEY)) ?? window.localStorage.getItem(ASSESSMENT_STORAGE_KEY)
      const rawG = window.localStorage.getItem(withActiveTermKey(GRADE_STORAGE_KEY)) ?? window.localStorage.getItem(GRADE_STORAGE_KEY)
      const rawB = window.localStorage.getItem(withActiveTermKey(BEHAVIOUR_SKILL_STORAGE_KEY)) ?? window.localStorage.getItem(BEHAVIOUR_SKILL_STORAGE_KEY)
      if (rawA) setAssessmentByClass(JSON.parse(rawA))
      if (rawG) setGradeByClass(JSON.parse(rawG))
      if (rawB) setBehaviourSkillByClass(JSON.parse(rawB))
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

  const behaviourSkillConfig = useMemo(() => {
    const list = behaviourSkillByClass[currentClass]
    return Array.isArray(list) ? list : []
  }, [behaviourSkillByClass, currentClass])

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
  const behaviourSkillTotalMax = useMemo(() => behaviourSkillConfig.reduce((sum, x) => sum + (Number.isFinite(x.max_score) ? x.max_score : 0), 0), [behaviourSkillConfig])

  const students = useMemo<StudentRow[]>(() => {
    if (!groupInfo) return []
    return adminMockDb.students
      .filter((s) => s.grade === groupInfo.grade && s.section === groupInfo.section)
      .map((s) => ({ id: s.id, name: s.name, avatar: toInitials(s.name), admission_no: s.admission_no }))
  }, [groupInfo])

  const admissionToStudentId = useMemo(() => {
    const map = new Map<string, string>()
    for (const s of students) {
      if (s.admission_no) map.set(s.admission_no.trim().toLowerCase(), s.id)
    }
    return map
  }, [students])

  const selectionKey = useMemo(() => {
    if (!groupInfo || !selectedSubject) return ''
    const teacherKey = normalizePersonName(teacherName).replace(/\s+/g, '_')
    return `${teacherKey}|${groupInfo.key}|${selectedSubject}`
  }, [groupInfo, selectedSubject, teacherName])

  const [marksByStudent, setMarksByStudent] = useState<Record<string, StudentMarks>>({})
  const [saved, setSaved] = useState(false)
  const [invalidScoreKeys, setInvalidScoreKeys] = useState<Record<string, boolean>>({})
  const [behaviourSkillMarksByStudent, setBehaviourSkillMarksByStudent] = useState<Record<string, StudentBehaviourSkillMarks>>({})
  const [savedBehaviourSkill, setSavedBehaviourSkill] = useState(false)

  const behaviourSkillGroupKey = useMemo(() => (groupInfo?.key ? groupInfo.key : ''), [groupInfo])

  useEffect(() => {
    if (!hasMounted || !selectionKey) return
    try {
      const raw = window.localStorage.getItem(withActiveTermKey(MARKS_STORAGE_KEY)) ?? window.localStorage.getItem(MARKS_STORAGE_KEY)
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
      setInvalidScoreKeys({})
    } catch {
      setMarksByStudent({})
      setSaved(false)
      setInvalidScoreKeys({})
    }
  }, [hasMounted, selectionKey, students, caRows])


  useEffect(() => {
    if (!hasMounted || !behaviourSkillGroupKey) return
    try {
      const raw = window.localStorage.getItem(withActiveTermKey(BEHAVIOUR_SKILL_MARKS_STORAGE_KEY)) ?? window.localStorage.getItem(BEHAVIOUR_SKILL_MARKS_STORAGE_KEY)
      const store = raw ? (JSON.parse(raw) as Record<string, Record<string, StudentBehaviourSkillMarks>>) : {}
      const existing = store[behaviourSkillGroupKey] ?? {}
      const next: Record<string, StudentBehaviourSkillMarks> = {}
      for (const st of students) {
        const prev = existing[st.id] ?? {}
        const marks: StudentBehaviourSkillMarks = {}
        for (const item of behaviourSkillConfig) {
          marks[item.id] = prev[item.id] ?? null
        }
        next[st.id] = marks
      }
      setBehaviourSkillMarksByStudent(next)
      setSavedBehaviourSkill(false)
      setInvalidScoreKeys({})
    } catch {
      setBehaviourSkillMarksByStudent({})
      setSavedBehaviourSkill(false)
      setInvalidScoreKeys({})
    }
  }, [behaviourSkillConfig, behaviourSkillGroupKey, hasMounted, students])

  const setInvalidScore = (key: string, isInvalid: boolean) => {
    setInvalidScoreKeys((prev) => {
      if (!isInvalid && !prev[key]) return prev
      if (isInvalid && prev[key]) return prev
      const next = { ...prev }
      if (isInvalid) next[key] = true
      else delete next[key]
      return next
    })
  }

  const updateCa = (studentId: string, assessment: string, value: string) => {
    const max = caRows.find((r) => r.assessment === assessment)?.max_score ?? 0
    const trimmed = value.trim()
    const num = trimmed === '' ? null : Number(trimmed)
    const key = `${selectionKey}::ca::${studentId}::${assessment}`
    const v =
      num === null || !Number.isFinite(num) ? null :
      num > max ? null :
      clampNumber(num, 0, max)
    setInvalidScore(key, num !== null && Number.isFinite(num) && num > max)
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
    const key = `${selectionKey}::exam::${studentId}`
    const v =
      num === null || !Number.isFinite(num) ? null :
      num > examMax ? null :
      clampNumber(num, 0, examMax)
    setInvalidScore(key, num !== null && Number.isFinite(num) && num > examMax)
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

  const updateBehaviourSkill = (studentId: string, itemId: string, value: string) => {
    const max = behaviourSkillConfig.find((x) => x.id === itemId)?.max_score ?? 0
    const trimmed = value.trim()
    const num = trimmed === '' ? null : Number(trimmed)
    const key = `${behaviourSkillGroupKey}::bs::${studentId}::${itemId}`
    const v =
      num === null || !Number.isFinite(num) ? null :
      num > max ? null :
      clampNumber(num, 0, max)
    setInvalidScore(key, num !== null && Number.isFinite(num) && num > max)
    setBehaviourSkillMarksByStudent((prev) => ({
      ...prev,
      [studentId]: { ...(prev[studentId] ?? {}), [itemId]: v },
    }))
    setSavedBehaviourSkill(false)
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
      const raw = window.localStorage.getItem(withActiveTermKey(MARKS_STORAGE_KEY)) ?? window.localStorage.getItem(MARKS_STORAGE_KEY)
      const store = raw ? (JSON.parse(raw) as Record<string, Record<string, StudentMarks>>) : {}
      store[selectionKey] = marksByStudent
      window.localStorage.setItem(withActiveTermKey(MARKS_STORAGE_KEY), JSON.stringify(store))
      setSaved(true)
      toast.success('Saved.')
    } catch {
      toast.error('Could not save.')
    }
  }

  const handleSaveBehaviourSkills = () => {
    if (!hasMounted || !behaviourSkillGroupKey) return
    try {
      const raw = window.localStorage.getItem(withActiveTermKey(BEHAVIOUR_SKILL_MARKS_STORAGE_KEY)) ?? window.localStorage.getItem(BEHAVIOUR_SKILL_MARKS_STORAGE_KEY)
      const store = raw ? (JSON.parse(raw) as Record<string, Record<string, StudentBehaviourSkillMarks>>) : {}
      store[behaviourSkillGroupKey] = behaviourSkillMarksByStudent
      window.localStorage.setItem(withActiveTermKey(BEHAVIOUR_SKILL_MARKS_STORAGE_KEY), JSON.stringify(store))
      setSavedBehaviourSkill(true)
      toast.success('Saved.')
    } catch {
      toast.error('Could not save.')
    }
  }

  const downloadScoreSheet = () => {
    if (!selectionKey || !groupInfo) return
    const headers = [
      'Student ID',
      'Admission No',
      'Student Name',
      ...caRows.map((r) => r.assessment),
      examRow?.assessment || 'Exam',
      'Remark',
    ]
    const lines = [
      '\uFEFF' + headers.map(escapeCsv).join(','),
      ...students.map((st) => {
        const m = marksByStudent[st.id]
        const values = [
          st.id,
          st.admission_no,
          st.name,
          ...caRows.map((r) => m?.ca?.[r.assessment] ?? ''),
          m?.exam ?? '',
          m?.remark ?? '',
        ]
        return values.map(escapeCsv).join(',')
      }),
    ]
    const csv = lines.join('\n')
    const safeGroup = groupInfo.groupName.replace(/[^\w\-]+/g, '_')
    const safeSubject = selectedSubject.replace(/[^\w\-]+/g, '_')
    const filename = `assessment_scores_${safeGroup}_${safeSubject}.csv`

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const importScoreSheetText = (text: string) => {
    if (!selectionKey) return
    try {
      const { headers, rows } = parseCsv(text)
      if (headers.length === 0) {
        toast.error('Import file is empty.')
        return
      }

      const normalizedHeaders = headers.map((h) => h.trim().toLowerCase())
      const idxStudentId = normalizedHeaders.findIndex((h) => h === 'student id' || h === 'student_id' || h === 'id')
      const idxAdmission = normalizedHeaders.findIndex((h) => h.includes('admission'))
      const idxRemark = normalizedHeaders.findIndex((h) => h.includes('remark'))

      const caIdxByAssessment = new Map<string, number>()
      for (const r of caRows) {
        const idx = normalizedHeaders.findIndex((h) => h === r.assessment.trim().toLowerCase())
        if (idx !== -1) caIdxByAssessment.set(r.assessment, idx)
      }

      const examLabel = (examRow?.assessment || 'Exam').trim().toLowerCase()
      const idxExam = normalizedHeaders.findIndex((h) => h === examLabel || h === 'exam' || h.includes('exam'))

      if (idxStudentId === -1 && idxAdmission === -1) {
        toast.error('CSV must contain "Student ID" or "Admission No".')
        return
      }

      const next: Record<string, StudentMarks> = { ...marksByStudent }
      let applied = 0

      for (const row of rows) {
        const rawId = idxStudentId === -1 ? '' : (row[idxStudentId] ?? '').trim()
        const rawAdm = idxAdmission === -1 ? '' : (row[idxAdmission] ?? '').trim()
        const resolvedId =
          rawId && next[rawId] ? rawId : rawAdm ? admissionToStudentId.get(rawAdm.toLowerCase()) ?? '' : ''

        if (!resolvedId || !next[resolvedId]) continue

        const prev = next[resolvedId]
        const ca: Record<string, number | null> = { ...(prev?.ca ?? {}) }

        for (const r of caRows) {
          const idx = caIdxByAssessment.get(r.assessment)
          if (idx === undefined) continue
          const cell = (row[idx] ?? '').trim()
          if (!cell) continue
          const num = Number(cell)
          if (!Number.isFinite(num)) continue
          ca[r.assessment] = clampNumber(num, 0, r.max_score)
        }

        const examCell = idxExam === -1 ? '' : (row[idxExam] ?? '').trim()
        let exam: number | null = prev?.exam ?? null
        if (examCell) {
          const num = Number(examCell)
          if (Number.isFinite(num)) exam = clampNumber(num, 0, examMax)
        }

        const remark = idxRemark === -1 ? prev?.remark ?? '' : (row[idxRemark] ?? '').toString()

        next[resolvedId] = { ca, exam, remark }
        applied += 1
      }

      if (applied === 0) {
        toast.error('No matching students found in this file.')
        return
      }

      setMarksByStudent(next)
      setSaved(false)

      try {
        const raw = window.localStorage.getItem(withActiveTermKey(MARKS_STORAGE_KEY)) ?? window.localStorage.getItem(MARKS_STORAGE_KEY)
        const store = raw ? (JSON.parse(raw) as Record<string, Record<string, StudentMarks>>) : {}
        store[selectionKey] = next
        window.localStorage.setItem(withActiveTermKey(MARKS_STORAGE_KEY), JSON.stringify(store))
        setSaved(true)
        toast.success('Imported and saved.')
      } catch {
        toast.success('Imported.')
      }
    } catch {
      toast.error('Could not import this CSV.')
    }
  }

  const importScoreSheet = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : ''
      importScoreSheetText(text)
    }
    reader.readAsText(file)
  }

  return (
    <div>
      <PageHeader
        title={mode === 'view' ? 'Assessment (View Score)' : 'Assessment (Input Score)'}
        subtitle="CA, Terminal Exam, and Behaviour/Skill scoring are applied from the admin Results setup."
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
                disabled={!groupInfo || groupInfo.subjects.length === 0 || activeTab === 'Behaviour & Skills'}
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
                  { id: 'Behaviour & Skills' as const, label: 'Behaviour & Skills' },
                ]).map((t, i) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveTab(t.id)}
                    className="px-4 py-2 text-sm font-medium transition-all"
                    style={{
                      background: activeTab === t.id ? '#C9A020' : 'white',
                      color: activeTab === t.id ? 'white' : '#6B6660',
                      borderLeft: i === 0 ? 'none' : '1px solid #E4E1D8',
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              {!viewOnly ? (
                <>
                  {activeTab === 'Behaviour & Skills' ? (
                    <button type="button" className="btn-gold flex items-center gap-2" disabled={!behaviourSkillGroupKey} onClick={handleSaveBehaviourSkills}>
                      <Save size={14} /> {savedBehaviourSkill ? 'Saved' : 'Save'}
                    </button>
                  ) : (
                    <>
                      <input
                        ref={importRef}
                        type="file"
                        accept=".csv,text/csv"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) importScoreSheet(file)
                          e.target.value = ''
                        }}
                      />
                      <button type="button" className="btn-outline flex items-center gap-2" disabled={!selectionKey} onClick={downloadScoreSheet}>
                        <Download size={14} /> Download Excel
                      </button>
                      <button type="button" className="btn-outline flex items-center gap-2" disabled={!selectionKey} onClick={() => importRef.current?.click()}>
                        <Upload size={14} /> Upload Excel
                      </button>
                      <button type="button" className="btn-gold flex items-center gap-2" disabled={!selectionKey} onClick={handleSave}>
                        <Save size={14} /> {saved ? 'Saved' : 'Save'}
                      </button>
                    </>
                  )}
                </>
              ) : null}
            </div>
          </div>

          {groupInfo ? (
            <div className="mt-4 text-xs" style={{ color: '#6B6660' }}>
              {activeTab === 'Behaviour & Skills'
                ? `Using admin setup for ${groupInfo.grade}: Items ${behaviourSkillConfig.length}, Total ${behaviourSkillTotalMax}`
                : `Using admin setup for ${groupInfo.grade}: CA max ${caMax}, Exam max ${examMax}, Total ${totalMax}`}
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
            {activeTab === 'Behaviour & Skills' ? (
              behaviourSkillConfig.length === 0 ? (
                <div className="text-sm" style={{ color: '#6B6660' }}>
                  No Behaviour/Skill items have been set for {currentClass}. Add them in Results → Result Settings.
                </div>
              ) : (
                <div className="rounded-xl overflow-hidden border" style={{ borderColor: '#E4E1D8' }}>
                  <div className="overflow-x-auto">
                    <table className="table" style={{ minWidth: 900 }}>
                      <thead>
                        <tr>
                          <th style={{ width: 56 }}>#</th>
                          <th>Student</th>
                          {behaviourSkillConfig.map((item) => (
                            <th key={item.id} style={{ width: 170 }}>
                              {item.name} (/{item.max_score})
                            </th>
                          ))}
                          <th style={{ width: 140 }}>Total (/{behaviourSkillTotalMax})</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((st, idx) => {
                          const total = behaviourSkillConfig.reduce((sum, item) => sum + (behaviourSkillMarksByStudent[st.id]?.[item.id] ?? 0), 0)
                          return (
                            <tr key={st.id}>
                              <td className="font-mono text-sm" style={{ color: '#6B6660' }}>{idx + 1}</td>
                              <td>
                                <div className="flex items-center gap-2.5">
                                  <StudentAvatar initials={st.avatar} />
                                  <span className="font-medium">{st.name}</span>
                                </div>
                              </td>
                              {behaviourSkillConfig.map((item) => (
                                <td key={item.id}>
                                  {viewOnly ? (
                                    <span className="font-medium" style={{ color: '#6B6660' }}>
                                      {behaviourSkillMarksByStudent[st.id]?.[item.id] ?? '—'}
                                    </span>
                                  ) : (
                                    (() => {
                                      const invalidKey = `${behaviourSkillGroupKey}::bs::${st.id}::${item.id}`
                                      const invalid = Boolean(invalidScoreKeys[invalidKey])
                                      return (
                                    <input
                                      type="number"
                                      min={0}
                                      max={item.max_score}
                                      value={behaviourSkillMarksByStudent[st.id]?.[item.id] ?? ''}
                                      onChange={(e) => updateBehaviourSkill(st.id, item.id, e.target.value)}
                                      className="input w-28 text-center"
                                      placeholder="—"
                                      style={invalid ? { borderColor: '#EF4444', boxShadow: '0 0 0 3px rgba(239,68,68,0.12)' } : undefined}
                                    />
                                      )
                                    })()
                                  )}
                                </td>
                              ))}
                              <td className="font-bold">{total}</td>
                            </tr>
                          )
                        })}
                        {students.length === 0 ? (
                          <tr>
                            <td colSpan={3 + behaviourSkillConfig.length} style={{ padding: 20 }}>
                              <div className="text-sm" style={{ color: '#6B6660' }}>No students found for this class/section.</div>
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            ) : (
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
                      {activeTab === 'Exam' ? <th style={{ width: 260 }}>Comment</th> : null}
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
                                    (() => {
                                      const invalidKey = `${selectionKey}::ca::${st.id}::${r.assessment}`
                                      const invalid = Boolean(invalidScoreKeys[invalidKey])
                                      return (
                                    <input
                                      type="number"
                                      min={0}
                                      max={r.max_score}
                                      value={marksByStudent[st.id]?.ca?.[r.assessment] ?? ''}
                                      onChange={(e) => updateCa(st.id, r.assessment, e.target.value)}
                                      className="input w-28 text-center"
                                      placeholder="—"
                                      style={invalid ? { borderColor: '#EF4444', boxShadow: '0 0 0 3px rgba(239,68,68,0.12)' } : undefined}
                                    />
                                      )
                                    })()
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
                                (() => {
                                  const invalidKey = `${selectionKey}::exam::${st.id}`
                                  const invalid = Boolean(invalidScoreKeys[invalidKey])
                                  return (
                                <input
                                  type="number"
                                  min={0}
                                  max={examMax}
                                  value={marksByStudent[st.id]?.exam ?? ''}
                                  onChange={(e) => updateExam(st.id, e.target.value)}
                                  className="input w-28 text-center"
                                  placeholder="—"
                                  style={invalid ? { borderColor: '#EF4444', boxShadow: '0 0 0 3px rgba(239,68,68,0.12)' } : undefined}
                                />
                                  )
                                })()
                              )}
                            </td>
                          )}
                          <td className="font-bold">{totals.total}</td>
                          <td className="font-medium" style={{ color: '#6B6660' }}>{Number.isFinite(totals.pct) ? `${totals.pct}%` : '—'}</td>
                          {activeTab === 'Exam' ? <td className="font-bold">{totals.grade}</td> : null}
                          {activeTab === 'Exam' ? (
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
                                  placeholder="Write comment…"
                                />
                              )}
                            </td>
                          ) : null}
                        </tr>
                      )
                    })}
                    {students.length === 0 ? (
                      <tr>
                        <td colSpan={activeTab === 'CA' ? 5 + caRows.length : 7} style={{ padding: 20 }}>
                          <div className="text-sm" style={{ color: '#6B6660' }}>No students found for this class/section.</div>
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            )}
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
