'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import Topbar from '@/components/layout/Topbar'
import toast from 'react-hot-toast'
import { Download, Pencil, Trash2, Upload } from 'lucide-react'
import { adminMockDb } from '@/lib/admin-mock-db'

type AssessmentRecord = { id: string; assessment: string; max_score: number }
type GradeRecord = { id: string; lower: number; upper: number; grade: string; remark: string }
type StudentMarks = { ca?: Record<string, number | null>; exam?: number | null; remark?: string }

const CLASSES = ['Grade 9', 'Grade 10', 'Grade 11', 'Grade 12']
const ASSESSMENT_STORAGE_KEY = 'edu_results_assessment_setup_v1'
const GRADE_STORAGE_KEY = 'edu_results_grade_setup_v1'
const MARKS_STORAGE_KEY = 'edu_instructor_assessment_marks_v1'

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

const downloadText = (filename: string, text: string, mime = 'text/plain;charset=utf-8') => {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

const toAssessmentCsv = (rows: AssessmentRecord[]) => {
  const headers = ['Assessment', 'Max Obtainable Score']
  const lines = [
    '\uFEFF' + headers.map(escapeCsv).join(','),
    ...rows.map((r) => [r.assessment, r.max_score].map(escapeCsv).join(',')),
  ]
  return lines.join('\n')
}

const toGradeCsv = (rows: GradeRecord[]) => {
  const headers = ['Lower', 'Upper', 'Grade', 'Remark']
  const lines = [
    '\uFEFF' + headers.map(escapeCsv).join(','),
    ...rows.map((r) => [r.lower, r.upper, r.grade, r.remark].map(escapeCsv).join(',')),
  ]
  return lines.join('\n')
}

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

const parseGroupKey = (key: string) => {
  const [classId, sectionId] = key.split(':')
  const gradeNum = classId?.match(/\d+/)?.[0] ?? ''
  const sectionLetter = sectionId?.match(/[a-z]$/i)?.[0]?.toUpperCase() ?? ''
  const grade = gradeNum ? `Grade ${gradeNum}` : classId
  const section = sectionLetter ? `Section ${sectionLetter}` : sectionId
  const groupName = gradeNum && sectionLetter ? `Class ${gradeNum}${sectionLetter}` : `${grade} ${section}`
  return { grade, section, groupName }
}

const computeGrade = (pct: number, gradeRows: GradeRecord[]) => {
  const roundedPct = Math.round(pct * 10) / 10
  const rule = gradeRows.find((g) => roundedPct >= g.lower && roundedPct <= g.upper) ?? null
  return { pct: roundedPct, grade: rule?.grade ?? '—', remark: rule?.remark ?? '—' }
}

export default function ResultsPage() {
  const router = useRouter()
  const assessmentImportRef = useRef<HTMLInputElement>(null)
  const gradeImportRef = useRef<HTMLInputElement>(null)

  const [hasMounted, setHasMounted] = useState(false)
  const [selectedClass, setSelectedClass] = useState<string>('Grade 12')

  const [assessmentByClass, setAssessmentByClass] = useState<Record<string, AssessmentRecord[]>>(() =>
    Object.fromEntries(CLASSES.map((c) => [c, defaultAssessment]))
  )
  const [gradeByClass, setGradeByClass] = useState<Record<string, GradeRecord[]>>(() =>
    Object.fromEntries(CLASSES.map((c) => [c, defaultGrades]))
  )

  useEffect(() => setHasMounted(true), [])

  const [activeTab, setActiveTab] = useState<'settings' | 'view'>('settings')

  useEffect(() => {
    if (!hasMounted) return
    if (typeof window === 'undefined') return
    const read = () => {
      const tab = new URLSearchParams(window.location.search).get('tab')
      setActiveTab(tab === 'view' ? 'view' : 'settings')
    }
    read()
    window.addEventListener('locationchange', read)
    return () => window.removeEventListener('locationchange', read)
  }, [hasMounted])

  const goTab = (tab: 'settings' | 'view') => {
    setActiveTab(tab)
    router.replace(`/results?tab=${tab}`)
  }

  useEffect(() => {
    if (!hasMounted) return
    try {
      const rawA = localStorage.getItem(ASSESSMENT_STORAGE_KEY)
      const rawG = localStorage.getItem(GRADE_STORAGE_KEY)
      if (rawA) {
        const parsed = JSON.parse(rawA) as Record<string, AssessmentRecord[]>
        setAssessmentByClass((prev) => ({ ...prev, ...parsed }))
      }
      if (rawG) {
        const parsed = JSON.parse(rawG) as Record<string, GradeRecord[]>
        setGradeByClass((prev) => ({ ...prev, ...parsed }))
      }
    } catch {
      toast.error('Could not load saved results setup.')
    }
  }, [hasMounted])

  useEffect(() => {
    if (!hasMounted) return
    localStorage.setItem(ASSESSMENT_STORAGE_KEY, JSON.stringify(assessmentByClass))
  }, [assessmentByClass, hasMounted])

  useEffect(() => {
    if (!hasMounted) return
    localStorage.setItem(GRADE_STORAGE_KEY, JSON.stringify(gradeByClass))
  }, [gradeByClass, hasMounted])

  const assessments = assessmentByClass[selectedClass] ?? []
  const grades = gradeByClass[selectedClass] ?? []

  const totalAssessmentScore = useMemo(() => assessments.reduce((sum, r) => sum + (Number.isFinite(r.max_score) ? r.max_score : 0), 0), [assessments])
  const assessmentCsv = useMemo(() => toAssessmentCsv(assessments), [assessments])
  const gradeCsv = useMemo(() => toGradeCsv(grades), [grades])

  const [assessmentImportText, setAssessmentImportText] = useState('')
  const [gradeImportText, setGradeImportText] = useState('')

  const [assessmentName, setAssessmentName] = useState('')
  const [assessmentMax, setAssessmentMax] = useState('')
  const [editingAssessmentId, setEditingAssessmentId] = useState<string | null>(null)

  const [gradeLower, setGradeLower] = useState('')
  const [gradeUpper, setGradeUpper] = useState('')
  const [gradeValue, setGradeValue] = useState('')
  const [gradeRemark, setGradeRemark] = useState('')
  const [editingGradeId, setEditingGradeId] = useState<string | null>(null)

  const [marksStore, setMarksStore] = useState<Record<string, Record<string, StudentMarks>>>({})
  const [viewSection, setViewSection] = useState<string>('')
  const [viewSubject, setViewSubject] = useState<string>('')
  const [viewTeacher, setViewTeacher] = useState<string>('')
  const [viewSelectionKey, setViewSelectionKey] = useState<string>('')

  useEffect(() => {
    if (!hasMounted) return
    try {
      const raw = localStorage.getItem(MARKS_STORAGE_KEY)
      const parsed = raw ? (JSON.parse(raw) as Record<string, Record<string, StudentMarks>>) : {}
      if (parsed && typeof parsed === 'object') setMarksStore(parsed)
    } catch {
      setMarksStore({})
    }
  }, [hasMounted])

  const availableSelections = useMemo(() => {
    const list: Array<{
      key: string
      teacherKey: string
      groupKey: string
      subject: string
      grade: string
      section: string
      groupName: string
      teacherLabel: string
    }> = []

    for (const key of Object.keys(marksStore)) {
      const parts = key.split('|')
      if (parts.length < 3) continue
      const teacherKey = parts[0]
      const groupKey = parts[1]
      const subject = parts.slice(2).join('|')
      const { grade, section, groupName } = parseGroupKey(groupKey)
      const teacherLabel = teacherKey
        .replace(/_/g, ' ')
        .split(' ')
        .filter(Boolean)
        .map((w) => w.slice(0, 1).toUpperCase() + w.slice(1))
        .join(' ')

      list.push({ key, teacherKey, groupKey, subject, grade, section, groupName, teacherLabel })
    }

    return list.sort((a, b) => {
      const g = a.grade.localeCompare(b.grade)
      if (g !== 0) return g
      const s = a.section.localeCompare(b.section)
      if (s !== 0) return s
      const sub = a.subject.localeCompare(b.subject)
      if (sub !== 0) return sub
      return a.teacherLabel.localeCompare(b.teacherLabel)
    })
  }, [marksStore])

  const selectionsForClass = useMemo(() => availableSelections.filter((s) => s.grade === selectedClass), [availableSelections, selectedClass])

  const subjectOptions = useMemo(() => {
    const set = new Set<string>()
    for (const s of selectionsForClass) set.add(s.subject)
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [selectionsForClass])

  useEffect(() => {
    if (activeTab !== 'view') return
    setViewSubject((prev) => (prev && subjectOptions.includes(prev) ? prev : subjectOptions[0] || ''))
  }, [activeTab, subjectOptions])

  useEffect(() => {
    if (activeTab !== 'view') return
    setViewSection('')
    setViewTeacher('')
    setViewSelectionKey('')
  }, [activeTab, viewSubject])

  const sectionOptionsForSubject = useMemo(() => {
    if (!viewSubject) return []
    const set = new Set<string>()
    for (const s of selectionsForClass) {
      if (s.subject !== viewSubject) continue
      set.add(s.section)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [selectionsForClass, viewSubject])

  const requiresSection = useMemo(() => sectionOptionsForSubject.length > 1, [sectionOptionsForSubject.length])

  useEffect(() => {
    if (activeTab !== 'view') return
    if (!viewSubject) return
    if (requiresSection) return
    const only = sectionOptionsForSubject[0] || ''
    if (!only) return
    setViewSection(only)
  }, [activeTab, requiresSection, sectionOptionsForSubject, viewSubject])

  const teacherOptionsForSubjectSection = useMemo(() => {
    if (!viewSubject) return []
    const map = new Map<string, string>()
    for (const s of selectionsForClass) {
      if (s.subject !== viewSubject) continue
      if (requiresSection && !viewSection) continue
      if (requiresSection && s.section !== viewSection) continue
      if (!requiresSection && viewSection && s.section !== viewSection) continue
      map.set(s.teacherKey, s.teacherLabel)
    }
    return Array.from(map.entries())
      .map(([teacherKey, teacherLabel]) => ({ teacherKey, teacherLabel }))
      .sort((a, b) => a.teacherLabel.localeCompare(b.teacherLabel))
  }, [requiresSection, selectionsForClass, viewSection, viewSubject])

  useEffect(() => {
    if (activeTab !== 'view') return
    if (teacherOptionsForSubjectSection.length <= 1) setViewTeacher('')
  }, [activeTab, teacherOptionsForSubjectSection.length])

  const selectionsFiltered = useMemo(() => {
    if (!viewSubject) return []
    return selectionsForClass.filter((s) => {
      if (s.subject !== viewSubject) return false
      if (requiresSection && !viewSection) return false
      if (requiresSection && s.section !== viewSection) return false
      if (!requiresSection && viewSection && s.section !== viewSection) return false
      if (viewTeacher && s.teacherKey !== viewTeacher) return false
      return true
    })
  }, [requiresSection, selectionsForClass, viewSection, viewSubject, viewTeacher])

  useEffect(() => {
    if (activeTab !== 'view') return
    const first = selectionsFiltered[0]?.key ?? ''
    setViewSelectionKey((prev) => (prev && selectionsFiltered.some((s) => s.key === prev) ? prev : first))
  }, [activeTab, selectionsFiltered])

  const selectedView = useMemo(() => selectionsFiltered.find((s) => s.key === viewSelectionKey) ?? null, [selectionsFiltered, viewSelectionKey])

  const assessmentConfig = useMemo(() => {
    const list = assessmentByClass[selectedClass]
    return Array.isArray(list) && list.length ? list : defaultAssessment
  }, [assessmentByClass, selectedClass])

  const gradeConfig = useMemo(() => {
    const list = gradeByClass[selectedClass]
    return Array.isArray(list) && list.length ? list : defaultGrades
  }, [gradeByClass, selectedClass])

  const examRow = useMemo(() => assessmentConfig.find((r) => /exam/i.test(r.assessment)) ?? null, [assessmentConfig])
  const caRows = useMemo(() => {
    const list = assessmentConfig.filter((r) => !/exam/i.test(r.assessment))
    return list.length ? list : [{ id: 'as-ca', assessment: 'CA', max_score: 40 }]
  }, [assessmentConfig])
  const caMax = useMemo(() => caRows.reduce((sum, r) => sum + (Number.isFinite(r.max_score) ? r.max_score : 0), 0), [caRows])
  const examMax = useMemo(() => (examRow && Number.isFinite(examRow.max_score) ? examRow.max_score : 60), [examRow])
  const totalMax = useMemo(() => caMax + examMax, [caMax, examMax])

  const viewStudents = useMemo(() => {
    if (!selectedView) return []
    return adminMockDb.students.filter((s) => s.grade === selectedView.grade && s.section === selectedView.section)
  }, [selectedView])

  const viewRows = useMemo(() => {
    if (!selectedView) return []
    const data = marksStore[selectedView.key] ?? {}
    return viewStudents.map((st) => {
      const m = data[st.id] ?? {}
      const ca = m.ca ?? {}
      const caTotal = caRows.reduce((sum, r) => sum + (Number(ca[r.assessment] ?? 0) || 0), 0)
      const exam = Number(m.exam ?? 0) || 0
      const total = caTotal + exam
      const pct = totalMax > 0 ? (total / totalMax) * 100 : 0
      const g = computeGrade(pct, gradeConfig)
      const typedRemark = (m.remark ?? '').trim()
      const remark = typedRemark ? typedRemark : g.remark
      return { student: st, ca, exam: m.exam ?? null, caTotal, total, pct: g.pct, grade: g.grade, remark }
    })
  }, [caRows, gradeConfig, marksStore, selectedView, totalMax, viewStudents])

  const resetAssessmentForm = () => {
    setAssessmentName('')
    setAssessmentMax('')
    setEditingAssessmentId(null)
  }

  const resetGradeForm = () => {
    setGradeLower('')
    setGradeUpper('')
    setGradeValue('')
    setGradeRemark('')
    setEditingGradeId(null)
  }

  const startEditAssessment = (r: AssessmentRecord) => {
    setEditingAssessmentId(r.id)
    setAssessmentName(r.assessment)
    setAssessmentMax(String(r.max_score))
  }

  const saveAssessment = () => {
    const name = assessmentName.trim()
    const max = Number(assessmentMax)
    if (!name || !Number.isFinite(max) || max < 0) {
      toast.error('Please enter a valid Assessment and Max Score.')
      return
    }

    setAssessmentByClass((prev) => {
      const list = prev[selectedClass] ?? []
      if (editingAssessmentId) {
        return {
          ...prev,
          [selectedClass]: list.map((x) => (x.id === editingAssessmentId ? { ...x, assessment: name, max_score: max } : x)),
        }
      }
      const next: AssessmentRecord = { id: `as-${Date.now()}`, assessment: name, max_score: max }
      return { ...prev, [selectedClass]: [...list, next] }
    })
    toast.success(editingAssessmentId ? 'Assessment updated.' : 'Assessment added.')
    resetAssessmentForm()
  }

  const removeAssessment = (id: string) => {
    setAssessmentByClass((prev) => ({ ...prev, [selectedClass]: (prev[selectedClass] ?? []).filter((x) => x.id !== id) }))
    if (editingAssessmentId === id) resetAssessmentForm()
    toast.success('Assessment removed.')
  }

  const startEditGrade = (r: GradeRecord) => {
    setEditingGradeId(r.id)
    setGradeLower(String(r.lower))
    setGradeUpper(String(r.upper))
    setGradeValue(r.grade)
    setGradeRemark(r.remark)
  }

  const saveGrade = () => {
    const lower = Number(gradeLower)
    const upper = Number(gradeUpper)
    const gradeText = gradeValue.trim()
    const remark = gradeRemark.trim()

    if (!Number.isFinite(lower) || !Number.isFinite(upper) || lower < 0 || upper < 0 || lower > upper || !gradeText) {
      toast.error('Please enter a valid grade range and grade.')
      return
    }

    setGradeByClass((prev) => {
      const list = prev[selectedClass] ?? []
      if (editingGradeId) {
        return {
          ...prev,
          [selectedClass]: list.map((x) => (x.id === editingGradeId ? { ...x, lower, upper, grade: gradeText, remark } : x)),
        }
      }
      const next: GradeRecord = { id: `gr-${Date.now()}`, lower, upper, grade: gradeText, remark }
      return { ...prev, [selectedClass]: [...list, next].sort((a, b) => b.upper - a.upper) }
    })
    toast.success(editingGradeId ? 'Grade updated.' : 'Grade added.')
    resetGradeForm()
  }

  const removeGrade = (id: string) => {
    setGradeByClass((prev) => ({ ...prev, [selectedClass]: (prev[selectedClass] ?? []).filter((x) => x.id !== id) }))
    if (editingGradeId === id) resetGradeForm()
    toast.success('Grade removed.')
  }

  const importAssessmentCsvText = (text: string) => {
    try {
      const { headers, rows } = parseCsv(text)
      if (headers.length === 0) {
        toast.error('Import text is empty.')
        return
      }
      const aIdx = headers.findIndex((h) => /assessment/i.test(h))
      const mIdx = headers.findIndex((h) => /max/i.test(h))
      if (aIdx === -1 || mIdx === -1) {
        toast.error('Import must contain "Assessment" and "Max" columns.')
        return
      }
      const parsed: AssessmentRecord[] = []
      for (const r of rows) {
        const assessment = (r[aIdx] ?? '').trim()
        const max = Number((r[mIdx] ?? '').trim())
        if (!assessment || !Number.isFinite(max)) continue
        parsed.push({ id: `as-${Date.now()}-${parsed.length}`, assessment, max_score: max })
      }
      if (parsed.length === 0) {
        toast.error('No valid assessment rows found.')
        return
      }
      setAssessmentByClass((prev) => ({ ...prev, [selectedClass]: parsed }))
      toast.success(`Imported ${parsed.length} assessment records.`)
      setAssessmentImportText('')
    } catch {
      toast.error('Could not import this CSV text.')
    }
  }

  const importAssessmentCsv = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const text = typeof reader.result === 'string' ? reader.result : ''
        importAssessmentCsvText(text)
      } catch {
        toast.error('Could not import this CSV.')
      }
    }
    reader.readAsText(file)
  }

  const importGradeCsvText = (text: string) => {
    try {
      const { headers, rows } = parseCsv(text)
      if (headers.length === 0) {
        toast.error('Import text is empty.')
        return
      }
      const lIdx = headers.findIndex((h) => /lower/i.test(h))
      const uIdx = headers.findIndex((h) => /upper/i.test(h))
      const gIdx = headers.findIndex((h) => /^grade$/i.test(h) || /grade/i.test(h))
      const rIdx = headers.findIndex((h) => /remark/i.test(h))
      if (lIdx === -1 || uIdx === -1 || gIdx === -1) {
        toast.error('Import must contain "Lower", "Upper", and "Grade" columns.')
        return
      }
      const parsed: GradeRecord[] = []
      for (const row of rows) {
        const lower = Number((row[lIdx] ?? '').trim())
        const upper = Number((row[uIdx] ?? '').trim())
        const grade = (row[gIdx] ?? '').trim()
        const remark = rIdx === -1 ? '' : (row[rIdx] ?? '').trim()
        if (!Number.isFinite(lower) || !Number.isFinite(upper) || lower > upper || !grade) continue
        parsed.push({ id: `gr-${Date.now()}-${parsed.length}`, lower, upper, grade, remark })
      }
      if (parsed.length === 0) {
        toast.error('No valid grade rows found.')
        return
      }
      setGradeByClass((prev) => ({ ...prev, [selectedClass]: parsed.sort((a, b) => b.upper - a.upper) }))
      toast.success(`Imported ${parsed.length} grade records.`)
      setGradeImportText('')
    } catch {
      toast.error('Could not import this CSV text.')
    }
  }

  const importGradeCsv = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const text = typeof reader.result === 'string' ? reader.result : ''
        importGradeCsvText(text)
      } catch {
        toast.error('Could not import this CSV.')
      }
    }
    reader.readAsText(file)
  }

  return (
    <AppLayout>
      <Topbar />

      <div className="page-header animate-in">
        <div className="gold-accent" />
        <h1 className="page-title">Results</h1>
        <p className="page-subtitle">
          {activeTab === 'view' ? 'Query class results entered by instructors.' : 'Configure continuous assessment and grading by class.'}
        </p>
      </div>

      <div className="px-6 pb-8">
        <div className="card animate-in stagger-1 mb-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[220px]">
              <label className="label">Select Class</label>
              <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="select">
                {CLASSES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="ml-auto flex items-end gap-2">
              <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: '#E4E1D8' }}>
                {[
                  { id: 'settings' as const, label: 'Result Settings' },
                  { id: 'view' as const, label: 'View Results' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => goTab(t.id)}
                    className="px-3 py-2 text-sm font-semibold"
                    style={{
                      background: activeTab === t.id ? 'rgba(201,160,32,0.15)' : 'transparent',
                      color: activeTab === t.id ? '#C9A020' : '#6B6660',
                      borderRight: t.id === 'settings' ? '1px solid #E4E1D8' : undefined,
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {activeTab === 'view' ? (
          <div className="card animate-in stagger-2">
            <div className="flex flex-wrap items-end gap-3 mb-4">
              <div className="min-w-[260px]">
                <label className="label">Subject</label>
                <select value={viewSubject} onChange={(e) => setViewSubject(e.target.value)} className="select">
                  {subjectOptions.length === 0 ? <option value="">No subjects</option> : null}
                  {subjectOptions.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {requiresSection ? (
                <div className="min-w-[220px]">
                  <label className="label">Section</label>
                  <select value={viewSection} onChange={(e) => setViewSection(e.target.value)} className="select">
                    <option value="">Select section</option>
                    {sectionOptionsForSubject.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              ) : viewSection ? (
                <div className="min-w-[220px]">
                  <label className="label">Section</label>
                  <input className="input" value={viewSection} readOnly />
                </div>
              ) : null}

              {teacherOptionsForSubjectSection.length > 1 ? (
                <div className="min-w-[260px]">
                  <label className="label">Teacher</label>
                  <select value={viewTeacher} onChange={(e) => setViewTeacher(e.target.value)} className="select">
                    <option value="">All</option>
                    {teacherOptionsForSubjectSection.map((t) => (
                      <option key={t.teacherKey} value={t.teacherKey}>{t.teacherLabel}</option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div className="min-w-[360px] flex-1">
                <label className="label">Result Set</label>
                <select
                  value={viewSelectionKey}
                  onChange={(e) => setViewSelectionKey(e.target.value)}
                  className="select"
                  disabled={selectionsFiltered.length === 0}
                >
                  {selectionsFiltered.length === 0 ? <option value="">No results found</option> : null}
                  {selectionsFiltered.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.groupName} • {s.subject} • {s.teacherLabel}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {requiresSection && !viewSection ? (
              <div className="rounded-xl p-3" style={{ background: '#F7F6F3', border: '1px solid #E4E1D8' }}>
                <div className="text-sm" style={{ color: '#6B6660' }}>
                  Select a section to view results for {selectedClass} • {viewSubject}.
                </div>
              </div>
            ) : selectedView ? (
              <div className="rounded-xl overflow-hidden border" style={{ borderColor: '#E4E1D8' }}>
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th style={{ width: 56 }}>#</th>
                        <th>Student</th>
                        {caRows.map((r) => (
                          <th key={r.id} style={{ width: 130 }}>{r.assessment} (/{r.max_score})</th>
                        ))}
                        <th style={{ width: 120 }}>CA Total (/{caMax})</th>
                        <th style={{ width: 150 }}>{examRow?.assessment || 'Exam'} (/{examMax})</th>
                        <th style={{ width: 120 }}>Total (/{totalMax})</th>
                        <th style={{ width: 90 }}>%</th>
                        <th style={{ width: 90 }}>Grade</th>
                        <th style={{ width: 240 }}>Remark</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewRows.map((r, idx) => (
                        <tr key={r.student.id}>
                          <td className="font-mono text-sm" style={{ color: '#6B6660' }}>{idx + 1}</td>
                          <td className="font-medium">{r.student.name}</td>
                          {caRows.map((ca) => (
                            <td key={ca.id} style={{ color: '#6B6660' }}>
                              {r.ca?.[ca.assessment] ?? '—'}
                            </td>
                          ))}
                          <td className="font-bold">{r.caTotal}</td>
                          <td style={{ color: '#6B6660' }}>{r.exam ?? '—'}</td>
                          <td className="font-bold">{r.total}</td>
                          <td style={{ color: '#6B6660' }}>{Number.isFinite(r.pct) ? `${r.pct}%` : '—'}</td>
                          <td className="font-bold">{r.grade}</td>
                          <td style={{ color: '#6B6660' }}>{r.remark}</td>
                        </tr>
                      ))}
                      {viewRows.length === 0 ? (
                        <tr>
                          <td colSpan={9 + caRows.length} style={{ padding: 20 }}>
                            <div className="text-sm" style={{ color: '#6B6660' }}>No students found for this class/section.</div>
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="rounded-xl p-3" style={{ background: '#F7F6F3', border: '1px solid #E4E1D8' }}>
                <div className="text-sm" style={{ color: '#6B6660' }}>
                  No results found for {selectedClass}. Ask the instructor to input scores and save.
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div className="card animate-in stagger-2">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold">Continuous Assessment Setup for {selectedClass}</h2>
                  <span className="text-xs font-semibold" style={{ color: '#6B6660' }}>Total: {totalAssessmentScore}</span>
                </div>

            <div className="rounded-xl overflow-hidden border mb-4" style={{ borderColor: '#E4E1D8' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Assessment</th>
                    <th>Max Obtainable Score</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {assessments.map((r) => (
                    <tr key={r.id}>
                      <td className="font-medium">{r.assessment}</td>
                      <td style={{ color: '#6B6660' }}>{r.max_score}</td>
                      <td>
                        <div className="flex gap-1">
                          <button className="p-1.5 rounded hover:bg-gray-100" type="button" onClick={() => startEditAssessment(r)}>
                            <Pencil size={14} style={{ color: '#6B6660' }} />
                          </button>
                          <button className="p-1.5 rounded hover:bg-red-50" type="button" onClick={() => removeAssessment(r.id)}>
                            <Trash2 size={14} style={{ color: '#EF4444' }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td className="font-bold">TOTAL</td>
                    <td className="font-bold">{totalAssessmentScore}</td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mb-4">
              <div className="label">Export Assessment Record To</div>
              <textarea value={assessmentCsv} readOnly className="input min-h-[96px]" />
              <div className="flex flex-wrap gap-2 mt-2">
                <button type="button" className="btn-outline text-sm flex items-center gap-2" onClick={() => downloadText(`assessment_setup_${selectedClass}.csv`, assessmentCsv, 'text/csv;charset=utf-8')}>
                  <Download size={14} /> Export Assessment Record
                </button>
                <input
                  ref={assessmentImportRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) importAssessmentCsv(file)
                    e.target.value = ''
                  }}
                />
                <button type="button" className="btn-outline text-sm flex items-center gap-2" onClick={() => assessmentImportRef.current?.click()}>
                  <Upload size={14} /> Import Assessment Record
                </button>
              </div>
            </div>

            <div className="mb-4">
              <div className="label">Import Assessment Record (Paste CSV)</div>
              <textarea
                value={assessmentImportText}
                onChange={(e) => setAssessmentImportText(e.target.value)}
                className="input min-h-[96px]"
                placeholder="Paste CSV here, then click Import"
              />
              <div className="flex justify-end mt-2">
                <button type="button" className="btn-gold text-sm flex items-center gap-2" onClick={() => importAssessmentCsvText(assessmentImportText)}>
                  <Upload size={14} /> Import
                </button>
              </div>
            </div>

            <div className="label">New Assessment Record</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <input value={assessmentName} onChange={(e) => setAssessmentName(e.target.value)} className="input" placeholder="Assessment" />
              </div>
              <div>
                <input value={assessmentMax} onChange={(e) => setAssessmentMax(e.target.value)} className="input" placeholder="Max Obtainable Score" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-3">
              {editingAssessmentId ? (
                <button type="button" className="btn-outline" onClick={resetAssessmentForm}>Cancel</button>
              ) : null}
              <button type="button" className="btn-gold" onClick={saveAssessment}>{editingAssessmentId ? 'Save Changes' : 'Add Assessment'}</button>
            </div>
              </div>

              <div className="card animate-in stagger-3">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold">Grade Setup for {selectedClass}</h2>
            </div>

            <div className="rounded-xl overflow-hidden border mb-4" style={{ borderColor: '#E4E1D8' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Lower</th>
                    <th>Upper</th>
                    <th>Grade</th>
                    <th>Remark</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {grades.map((r) => (
                    <tr key={r.id}>
                      <td style={{ color: '#6B6660' }}>{r.lower}</td>
                      <td style={{ color: '#6B6660' }}>{r.upper}</td>
                      <td className="font-semibold">{r.grade}</td>
                      <td style={{ color: '#6B6660' }}>{r.remark}</td>
                      <td>
                        <div className="flex gap-1">
                          <button className="p-1.5 rounded hover:bg-gray-100" type="button" onClick={() => startEditGrade(r)}>
                            <Pencil size={14} style={{ color: '#6B6660' }} />
                          </button>
                          <button className="p-1.5 rounded hover:bg-red-50" type="button" onClick={() => removeGrade(r.id)}>
                            <Trash2 size={14} style={{ color: '#EF4444' }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mb-4">
              <div className="label">Export Grade Record To</div>
              <textarea value={gradeCsv} readOnly className="input min-h-[96px]" />
              <div className="flex flex-wrap gap-2 mt-2">
                <button type="button" className="btn-outline text-sm flex items-center gap-2" onClick={() => downloadText(`grade_setup_${selectedClass}.csv`, gradeCsv, 'text/csv;charset=utf-8')}>
                  <Download size={14} /> Export Grade Record
                </button>
                <input
                  ref={gradeImportRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) importGradeCsv(file)
                    e.target.value = ''
                  }}
                />
                <button type="button" className="btn-outline text-sm flex items-center gap-2" onClick={() => gradeImportRef.current?.click()}>
                  <Upload size={14} /> Import Grade Record
                </button>
              </div>
            </div>

            <div className="mb-4">
              <div className="label">Import Grade Record (Paste CSV)</div>
              <textarea
                value={gradeImportText}
                onChange={(e) => setGradeImportText(e.target.value)}
                className="input min-h-[96px]"
                placeholder="Paste CSV here, then click Import"
              />
              <div className="flex justify-end mt-2">
                <button type="button" className="btn-gold text-sm flex items-center gap-2" onClick={() => importGradeCsvText(gradeImportText)}>
                  <Upload size={14} /> Import
                </button>
              </div>
            </div>

            <div className="label">New Grade Record</div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <input value={gradeLower} onChange={(e) => setGradeLower(e.target.value)} className="input" placeholder="Lower" />
              <input value={gradeUpper} onChange={(e) => setGradeUpper(e.target.value)} className="input" placeholder="Upper" />
              <input value={gradeValue} onChange={(e) => setGradeValue(e.target.value)} className="input" placeholder="Grade" />
              <input value={gradeRemark} onChange={(e) => setGradeRemark(e.target.value)} className="input" placeholder="Remark (optional)" />
            </div>
            <div className="flex justify-end gap-2 mt-3">
              {editingGradeId ? (
                <button type="button" className="btn-outline" onClick={resetGradeForm}>Cancel</button>
              ) : null}
              <button type="button" className="btn-gold" onClick={saveGrade}>{editingGradeId ? 'Save Changes' : 'Add Grade'}</button>
            </div>
              </div>
            </div>

            <div className="card animate-in stagger-4 mt-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold">Student Mark Template for {selectedClass}</h3>
              </div>
              <div className="mt-3 rounded-xl p-3" style={{ background: '#F7F6F3', border: '1px solid #E4E1D8' }}>
                <div className="text-sm" style={{ color: '#6B6660' }}>
                  The class template can be configured based on the assessment and grade setup above.
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  )
}
