'use client'
import { useEffect, useMemo, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import Topbar from '@/components/layout/Topbar'
import toast from 'react-hot-toast'
import { X } from 'lucide-react'
import { getClassLevelsFromDirectory } from '@/lib/utils'

type AttendanceStatus = 'P' | 'A' | 'L' | 'S'

type AttendanceScoreRow = {
  id: string
  status: AttendanceStatus
  label: string
  score: number
}

type AttendanceGradeRow = {
  id: string
  lower: number
  upper: number
  grade: string
  remark: string
}

type ScoreSetupByClass = Record<string, AttendanceScoreRow[]>
type GradeSetupByClass = Record<string, AttendanceGradeRow[]>

const SCORE_STORAGE_KEY = 'edu_attendance_score_setup_v1'
const GRADE_STORAGE_KEY = 'edu_attendance_grade_setup_v1'
const DEFAULT_CLASSES = ['Grade 10', 'Grade 11', 'Grade 12']

export default function AttendancePage() {
  const [selectedClass, setSelectedClass] = useState('Grade 10')
  const [classLevels, setClassLevels] = useState<string[]>(DEFAULT_CLASSES)
  const setupKey = selectedClass
  const [hasMounted, setHasMounted] = useState(false)
  const [scoreSetupByClass, setScoreSetupByClass] = useState<ScoreSetupByClass>(() => ({
    ['Grade 10']: [
      { id: 'st_p', status: 'P', label: 'Present', score: 1 },
      { id: 'st_a', status: 'A', label: 'Absent', score: 0 },
      { id: 'st_l', status: 'L', label: 'Late', score: 0.5 },
      { id: 'st_s', status: 'S', label: 'Sick', score: 0 },
    ],
  }))
  const [gradeSetupByClass, setGradeSetupByClass] = useState<GradeSetupByClass>(() => ({
    ['Grade 10']: [
      { id: 'g1', lower: 90, upper: 100, grade: 'A', remark: 'Excellent' },
      { id: 'g2', lower: 75, upper: 89, grade: 'B', remark: 'Very Good' },
      { id: 'g3', lower: 60, upper: 74, grade: 'C', remark: 'Good' },
      { id: 'g4', lower: 40, upper: 59, grade: 'D', remark: 'Fair' },
      { id: 'g5', lower: 0, upper: 39, grade: 'E', remark: 'Poor' },
    ],
  }))

  useEffect(() => {
    setHasMounted(true)
  }, [])

  useEffect(() => {
    if (!hasMounted) return
    const next = getClassLevelsFromDirectory(DEFAULT_CLASSES)
    setClassLevels(next)
    setSelectedClass((prev) => (next.includes(prev) ? prev : next[0] || prev))
  }, [hasMounted])

  useEffect(() => {
    if (!hasMounted) return
    try {
      const raw = window.localStorage.getItem(SCORE_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as unknown
        if (parsed && typeof parsed === 'object') setScoreSetupByClass((prev) => ({ ...prev, ...(parsed as Record<string, AttendanceScoreRow[]>) }))
      }
    } catch {
    }
    try {
      const raw = window.localStorage.getItem(GRADE_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as unknown
        if (parsed && typeof parsed === 'object') setGradeSetupByClass((prev) => ({ ...prev, ...(parsed as Record<string, AttendanceGradeRow[]>) }))
      }
    } catch {
    }
  }, [hasMounted])

  useEffect(() => {
    if (!hasMounted) return
    try {
      window.localStorage.setItem(SCORE_STORAGE_KEY, JSON.stringify(scoreSetupByClass))
    } catch {
    }
  }, [hasMounted, scoreSetupByClass])

  useEffect(() => {
    if (!hasMounted) return
    try {
      window.localStorage.setItem(GRADE_STORAGE_KEY, JSON.stringify(gradeSetupByClass))
    } catch {
    }
  }, [hasMounted, gradeSetupByClass])

  useEffect(() => {
    setScoreSetupByClass((prev) => {
      if (prev[setupKey]) return prev
      const baseKey = prev['Grade 10'] ? 'Grade 10' : Object.keys(prev)[0]
      const base = baseKey ? prev[baseKey] : []
      return { ...prev, [setupKey]: (base ?? []).map((r) => ({ ...r, id: `${r.id}_${Date.now()}` })) }
    })
    setGradeSetupByClass((prev) => {
      if (prev[setupKey]) return prev
      const baseKey = prev['Grade 10'] ? 'Grade 10' : Object.keys(prev)[0]
      const base = baseKey ? prev[baseKey] : []
      return { ...prev, [setupKey]: (base ?? []).map((r) => ({ ...r, id: `${r.id}_${Date.now()}` })) }
    })
  }, [setupKey])

  const scoreRows = scoreSetupByClass[setupKey] ?? []
  const gradeRows = gradeSetupByClass[setupKey] ?? []

  const classOptions = useMemo(() => (classLevels.length ? classLevels : DEFAULT_CLASSES), [classLevels])

  const [showScoreModal, setShowScoreModal] = useState(false)
  const [editingScoreId, setEditingScoreId] = useState<string | null>(null)
  const [scoreStatus, setScoreStatus] = useState<AttendanceStatus>('P')
  const [scoreLabel, setScoreLabel] = useState('Present')
  const [scoreValue, setScoreValue] = useState('1')

  const [showGradeModal, setShowGradeModal] = useState(false)
  const [editingGradeId, setEditingGradeId] = useState<string | null>(null)
  const [gradeLower, setGradeLower] = useState('0')
  const [gradeUpper, setGradeUpper] = useState('100')
  const [gradeLetter, setGradeLetter] = useState('A')
  const [gradeRemark, setGradeRemark] = useState('Excellent')

  const openAddScore = () => {
    setEditingScoreId(null)
    setScoreStatus('P')
    setScoreLabel('Present')
    setScoreValue('1')
    setShowScoreModal(true)
  }

  const openEditScore = (row: AttendanceScoreRow) => {
    setEditingScoreId(row.id)
    setScoreStatus(row.status)
    setScoreLabel(row.label)
    setScoreValue(String(row.score))
    setShowScoreModal(true)
  }

  const saveScore = () => {
    const label = scoreLabel.trim()
    const score = Number(scoreValue)
    if (!label) {
      toast.error('Please enter a label.')
      return
    }
    if (!Number.isFinite(score)) {
      toast.error('Please enter a valid score.')
      return
    }

    setScoreSetupByClass((prev) => {
      const list = prev[setupKey] ?? []
      if (editingScoreId) {
        const updated = list.map((r) => (r.id === editingScoreId ? { ...r, status: scoreStatus, label, score } : r))
        return { ...prev, [setupKey]: updated }
      }
      const exists = list.some((r) => r.status === scoreStatus)
      if (exists) {
        toast.error('This status already exists. Edit it instead.')
        return prev
      }
      const row: AttendanceScoreRow = { id: `as_${Date.now()}`, status: scoreStatus, label, score }
      return { ...prev, [setupKey]: [...list, row] }
    })

    toast.success(editingScoreId ? 'Score updated.' : 'Score added.')
    setShowScoreModal(false)
  }

  const deleteScore = (id: string) => {
    if (!window.confirm('Delete this score row?')) return
    setScoreSetupByClass((prev) => {
      const list = prev[setupKey] ?? []
      return { ...prev, [setupKey]: list.filter((r) => r.id !== id) }
    })
    toast.success('Deleted.')
  }

  const openAddGrade = () => {
    setEditingGradeId(null)
    setGradeLower('0')
    setGradeUpper('100')
    setGradeLetter('A')
    setGradeRemark('Excellent')
    setShowGradeModal(true)
  }

  const openEditGrade = (row: AttendanceGradeRow) => {
    setEditingGradeId(row.id)
    setGradeLower(String(row.lower))
    setGradeUpper(String(row.upper))
    setGradeLetter(row.grade)
    setGradeRemark(row.remark)
    setShowGradeModal(true)
  }

  const saveGrade = () => {
    const lower = Number(gradeLower)
    const upper = Number(gradeUpper)
    const grade = gradeLetter.trim()
    const remark = gradeRemark.trim()

    if (!Number.isFinite(lower) || !Number.isFinite(upper)) {
      toast.error('Please enter valid range numbers.')
      return
    }
    if (lower > upper) {
      toast.error('Lower bound cannot be greater than upper bound.')
      return
    }
    if (!grade) {
      toast.error('Please enter a grade.')
      return
    }

    setGradeSetupByClass((prev) => {
      const list = prev[setupKey] ?? []
      const row: AttendanceGradeRow = { id: editingGradeId ?? `ag_${Date.now()}`, lower, upper, grade, remark }
      const next = editingGradeId ? list.map((r) => (r.id === editingGradeId ? row : r)) : [...list, row]
      return { ...prev, [setupKey]: next.sort((a, b) => b.upper - a.upper) }
    })

    toast.success(editingGradeId ? 'Grade updated.' : 'Grade added.')
    setShowGradeModal(false)
  }

  const deleteGrade = (id: string) => {
    if (!window.confirm('Delete this grade row?')) return
    setGradeSetupByClass((prev) => {
      const list = prev[setupKey] ?? []
      return { ...prev, [setupKey]: list.filter((r) => r.id !== id) }
    })
    toast.success('Deleted.')
  }

  return (
    <AppLayout>
      <Topbar />

      <div className="page-header animate-in">
        <div className="gold-accent" />
        <h1 className="page-title">Attendance Setup</h1>
        <p className="page-subtitle">Configure attendance scoring and grading rules per class.</p>
      </div>

      <div className="px-6 pb-8 space-y-4">
        <div className="card animate-in stagger-1">
          <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6660' }}>Class</label>
          <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="select w-48">
            {classOptions.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="card animate-in stagger-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-base">Attendance Score Setup for {selectedClass}</h2>
                <div className="flex gap-2">
                  <button className="btn-gold text-xs px-3 py-1.5" onClick={openAddScore}>Add</button>
                </div>
              </div>

              <div className="rounded-lg overflow-hidden border" style={{ borderColor: '#E4E1D8' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: 90 }}>Status</th>
                      <th>Label</th>
                      <th style={{ width: 120 }}>Score</th>
                      <th style={{ width: 140 }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scoreRows.map((r) => (
                      <tr key={r.id}>
                        <td className="font-mono text-sm" style={{ color: '#6B6660' }}>{r.status}</td>
                        <td className="font-medium">{r.label}</td>
                        <td className="font-mono text-sm">{r.score}</td>
                        <td>
                          <div className="flex gap-2">
                            <button className="btn-outline text-xs px-3 py-1.5" onClick={() => openEditScore(r)}>Edit</button>
                            <button className="btn-outline text-xs px-3 py-1.5" style={{ borderColor: '#EF4444', color: '#EF4444' }} onClick={() => deleteScore(r.id)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {scoreRows.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-sm" style={{ color: '#6B6660' }}>No rows yet.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card animate-in stagger-3">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-base">Attendance Grade Setup for {selectedClass}</h2>
                <div className="flex gap-2">
                  <button className="btn-gold text-xs px-3 py-1.5" onClick={openAddGrade}>Add</button>
                </div>
              </div>

              <div className="rounded-lg overflow-hidden border" style={{ borderColor: '#E4E1D8' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: 90 }}>Lower</th>
                      <th style={{ width: 90 }}>Upper</th>
                      <th style={{ width: 90 }}>Grade</th>
                      <th>Remark</th>
                      <th style={{ width: 140 }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gradeRows.map((r) => (
                      <tr key={r.id}>
                        <td className="font-mono text-sm" style={{ color: '#6B6660' }}>{r.lower}</td>
                        <td className="font-mono text-sm" style={{ color: '#6B6660' }}>{r.upper}</td>
                        <td className="font-bold">{r.grade}</td>
                        <td className="text-sm" style={{ color: '#6B6660' }}>{r.remark}</td>
                        <td>
                          <div className="flex gap-2">
                            <button className="btn-outline text-xs px-3 py-1.5" onClick={() => openEditGrade(r)}>Edit</button>
                            <button className="btn-outline text-xs px-3 py-1.5" style={{ borderColor: '#EF4444', color: '#EF4444' }} onClick={() => deleteGrade(r.id)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {gradeRows.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-sm" style={{ color: '#6B6660' }}>No rows yet.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        {showScoreModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
            <div className="card w-full max-w-lg mx-4 animate-in">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-bold text-lg">{editingScoreId ? 'Edit Score' : 'New Score'}</h2>
                <button onClick={() => setShowScoreModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100">
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="label">Status</label>
                  <select value={scoreStatus} onChange={(e) => setScoreStatus(e.target.value as AttendanceStatus)} className="select">
                    <option value="P">P</option>
                    <option value="A">A</option>
                    <option value="L">L</option>
                    <option value="S">S</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="label">Label</label>
                  <input value={scoreLabel} onChange={(e) => setScoreLabel(e.target.value)} className="input" placeholder="e.g. Present" />
                </div>
                <div>
                  <label className="label">Score</label>
                  <input value={scoreValue} onChange={(e) => setScoreValue(e.target.value)} className="input" inputMode="decimal" placeholder="e.g. 1" />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setShowScoreModal(false)} className="btn-outline px-8">Cancel</button>
                <button onClick={saveScore} className="btn-gold px-10">Save</button>
              </div>
            </div>
          </div>
        )}

        {showGradeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
            <div className="card w-full max-w-lg mx-4 animate-in">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-bold text-lg">{editingGradeId ? 'Edit Grade' : 'New Grade'}</h2>
                <button onClick={() => setShowGradeModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100">
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Lower</label>
                  <input value={gradeLower} onChange={(e) => setGradeLower(e.target.value)} className="input" inputMode="numeric" placeholder="e.g. 75" />
                </div>
                <div>
                  <label className="label">Upper</label>
                  <input value={gradeUpper} onChange={(e) => setGradeUpper(e.target.value)} className="input" inputMode="numeric" placeholder="e.g. 89" />
                </div>
                <div>
                  <label className="label">Grade</label>
                  <input value={gradeLetter} onChange={(e) => setGradeLetter(e.target.value)} className="input" placeholder="e.g. A" />
                </div>
                <div>
                  <label className="label">Remark</label>
                  <input value={gradeRemark} onChange={(e) => setGradeRemark(e.target.value)} className="input" placeholder="e.g. Excellent" />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setShowGradeModal(false)} className="btn-outline px-8">Cancel</button>
                <button onClick={saveGrade} className="btn-gold px-10">Save</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
