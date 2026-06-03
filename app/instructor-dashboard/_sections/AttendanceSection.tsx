'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Upload, Clock, Download } from 'lucide-react'
import { PageHeader, StudentAvatar } from '../_components'
import { MOCK_ATTENDANCE_STUDENTS, MOCK_PERIODS } from '../_mock-data'
import type { AttendanceStatus, AttendanceMode } from '../_types'
import { adminMockDb } from '@/lib/admin-mock-db'
import toast from 'react-hot-toast'

const statusColors: Record<AttendanceStatus, { bg: string; text: string; active: string }> = {
  P: { bg: '#ECFDF5', text: '#065F46', active: '#10B981' },
  A: { bg: '#FEF2F2', text: '#991B1B', active: '#EF4444' },
  L: { bg: '#FFF7ED', text: '#9A3412', active: '#F59E0B' },
  S: { bg: '#F3F4F6', text: '#4B5563', active: '#9CA3AF' },
}

type AttendanceStudent = { id: string; name: string; avatar: string }

const toInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : ''
  return (first + last).toUpperCase()
}

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

export default function AttendanceSection() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useState<AttendanceMode>('daily')
  const [selectedGroup, setSelectedGroup] = useState('Class 10A')
  const [selectedSubject, setSelectedSubject] = useState('Advanced Physics')
  const [selectedPeriod, setSelectedPeriod] = useState(MOCK_PERIODS[0].id)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const students = useMemo<AttendanceStudent[]>(() => {
    const match = selectedGroup.match(/Class\s+(\d+)\s*([A-Z])/i)
    const gradeNumber = match?.[1] ?? ''
    const sectionLetter = (match?.[2] ?? '').toUpperCase()
    const grade = gradeNumber ? `Grade ${gradeNumber}` : ''
    const section = sectionLetter ? `Section ${sectionLetter}` : ''

    const fromDb = adminMockDb.students
      .filter((s) => {
        if (grade && s.grade !== grade) return false
        if (section && s.section !== section) return false
        return Boolean(grade && section)
      })
      .map((s) => ({ id: s.id, name: s.name, avatar: toInitials(s.name) }))

    if (fromDb.length > 0) return fromDb
    return MOCK_ATTENDANCE_STUDENTS.map((s) => ({ id: s.id, name: s.name, avatar: s.avatar }))
  }, [selectedGroup])

  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({})
  const [periodAttendance, setPeriodAttendance] = useState<Record<string, AttendanceStatus>>({})
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setAttendance(Object.fromEntries(students.map((s) => [s.id, 'P' as AttendanceStatus])))
    const initial: Record<string, AttendanceStatus> = {}
    students.forEach((s) => {
      MOCK_PERIODS.forEach((p) => {
        initial[`${s.id}-${p.id}`] = 'P'
      })
    })
    setPeriodAttendance(initial)
    setSaved(false)
  }, [students])

  const setStatus = (id: string, s: AttendanceStatus) => {
    if (mode === 'daily') {
      setAttendance(prev => ({ ...prev, [id]: s }))
    } else {
      setPeriodAttendance(prev => ({ ...prev, [`${id}-${selectedPeriod}`]: s }))
    }
    setSaved(false)
  }

  const markAll = (s: AttendanceStatus) => {
    if (mode === 'daily') {
      setAttendance(Object.fromEntries(students.map(st => [st.id, s])))
    } else {
      const updated = { ...periodAttendance }
      students.forEach(st => {
        updated[`${st.id}-${selectedPeriod}`] = s
      })
      setPeriodAttendance(updated)
    }
    setSaved(false)
  }

  const handleSave = () => setSaved(true)

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.name.toLowerCase().endsWith('.xlsx') || file.type.includes('spreadsheetml')) {
        toast.error('Please export the Excel file as CSV and upload the .csv.')
        e.target.value = ''
        return
      }

      if (!file.name.toLowerCase().endsWith('.csv')) {
        toast.error('Please upload a .csv file (Excel-exported CSV is supported).')
        e.target.value = ''
        return
      }

      const reader = new FileReader()
      reader.onload = () => {
        try {
          const text = typeof reader.result === 'string' ? reader.result : ''
          const { headers, rows } = parseCsv(text)
          if (headers.length === 0) {
            toast.error('CSV is empty.')
            return
          }

          const headerIndex = (name: string) =>
            headers.findIndex((h) => h.toLowerCase().replace(/\s+/g, ' ').trim() === name)

          const idIdx =
            headerIndex('student id') !== -1
              ? headerIndex('student id')
              : headers.findIndex((h) => /student\s*id/i.test(h) || /^id$/i.test(h))

          const statusIdx =
            headerIndex('status (p/a/l/h)') !== -1
              ? headerIndex('status (p/a/l/h)')
              : headers.findIndex((h) => /^status/i.test(h))

          if (idIdx === -1 || statusIdx === -1) {
            toast.error('CSV must contain "Student ID" and "Status" columns.')
            return
          }

          const allowed: AttendanceStatus[] = ['P', 'A', 'L', 'S']
          const currentIds = new Set(students.map((s) => s.id))
          let updated = 0
          let skipped = 0

          if (mode === 'daily') {
            setAttendance((prev) => {
              const next = { ...prev }
              for (const r of rows) {
                const id = (r[idIdx] ?? '').trim()
                const st = (r[statusIdx] ?? '').trim().toUpperCase() as AttendanceStatus
                if (!id || !currentIds.has(id) || !allowed.includes(st)) {
                  skipped += 1
                  continue
                }
                next[id] = st
                updated += 1
              }
              return next
            })
          } else {
            setPeriodAttendance((prev) => {
              const next = { ...prev }
              for (const r of rows) {
                const id = (r[idIdx] ?? '').trim()
                const st = (r[statusIdx] ?? '').trim().toUpperCase() as AttendanceStatus
                if (!id || !currentIds.has(id) || !allowed.includes(st)) {
                  skipped += 1
                  continue
                }
                next[`${id}-${selectedPeriod}`] = st
                updated += 1
              }
              return next
            })
          }

          setSaved(false)
          toast.success(`Imported: ${updated} updated${skipped ? `, ${skipped} skipped` : ''}.`)
        } catch {
          toast.error('Could not read this CSV file.')
        }
      }
      reader.onerror = () => {
        toast.error('Could not read this file.')
      }
      reader.readAsText(file)
    }
    e.target.value = ''
  }

  const getStudentStatus = (studentId: string): AttendanceStatus => {
    if (mode === 'daily') return attendance[studentId] || 'P'
    return periodAttendance[`${studentId}-${selectedPeriod}`] || 'P'
  }

  // Calculate counts based on current mode
  const counts = { P: 0, A: 0, L: 0, S: 0 }
  students.forEach(s => {
    const status = getStudentStatus(s.id)
    if (status in counts) counts[status]++
  })
  const total = students.length
  const presentPct = total ? Math.round((counts.P / total) * 100) : 0

  // Period summary for period mode
  const getPeriodSummary = (periodId: string) => {
    let present = 0
    students.forEach(s => {
      if (periodAttendance[`${s.id}-${periodId}`] === 'P') present++
    })
    return { present, total }
  }

  const downloadAttendanceTemplate = () => {
    const group = selectedGroup
    const match = group.match(/Class\s+(\d+)\s*([A-Z])/i)
    const gradeNumber = match?.[1] ?? ''
    const sectionLetter = (match?.[2] ?? '').toUpperCase()
    const grade = gradeNumber ? `Grade ${gradeNumber}` : ''
    const section = sectionLetter ? `Section ${sectionLetter}` : ''

    const headers = [
      'Student ID',
      'Student Name',
      'Grade',
      'Section',
      'Group',
      'Date',
      'Mode',
      'Subject',
      'Period',
      'Status (P/A/L/S)',
      'Remarks',
    ]

    const periodLabel =
      mode === 'period' ? `P${MOCK_PERIODS.find((p) => p.id === selectedPeriod)?.number ?? ''}` : ''

    const rows = students.map((s) => [
      s.id,
      s.name,
      grade,
      section,
      group,
      date,
      mode,
      selectedSubject,
      periodLabel,
      '',
      '',
    ])

    const csv = ['\uFEFF' + headers.map(escapeCsv).join(','), ...rows.map((r) => r.map(escapeCsv).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `attendance_${group.replace(/\s+/g, '_')}_${date}_${mode}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <PageHeader title="Record Attendance" subtitle="Mark daily or per-period student attendance for your classes." />

      <div className="px-6 pb-8 space-y-4">
        {/* Mode Toggle */}
        <div className="card animate-in">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B6660' }}>Mode:</span>
            <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: '#E4E1D8' }}>
              <button
                onClick={() => setMode('daily')}
                className="px-4 py-2 text-sm font-medium transition-all"
                style={{
                  background: mode === 'daily' ? '#C9A020' : 'white',
                  color: mode === 'daily' ? 'white' : '#6B6660',
                }}>
                Daily Register
              </button>
              <button
                onClick={() => setMode('period')}
                className="px-4 py-2 text-sm font-medium transition-all"
                style={{
                  background: mode === 'period' ? '#C9A020' : 'white',
                  color: mode === 'period' ? 'white' : '#6B6660',
                  borderLeft: '1px solid #E4E1D8',
                }}>
                Per-Period
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6660' }}>Class / Group</label>
              <select value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)} className="select">
                <option>Class 10A</option><option>Class 10B</option><option>Class 11A</option><option>Class 11B</option><option>Class 12A</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6660' }}>Subject</label>
              <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} className="select">
                <option>Advanced Physics</option><option>Physics Fundamentals</option><option>Physics Lab</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6660' }}>Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input" />
            </div>
            {mode === 'period' && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#6B6660' }}>Period</label>
                <select value={selectedPeriod} onChange={e => setSelectedPeriod(e.target.value)} className="select">
                  {MOCK_PERIODS.map(p => (
                    <option key={p.id} value={p.id}>Period {p.number} ({p.time})</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Period Overview (only in period mode) */}
        {mode === 'period' && (
          <div className="card animate-in stagger-1">
            <h3 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#6B6660' }}>Period Overview</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
              {MOCK_PERIODS.map(p => {
                const summary = getPeriodSummary(p.id)
                const isActive = selectedPeriod === p.id
                const pct = Math.round((summary.present / summary.total) * 100)
                return (
                  <button key={p.id} onClick={() => setSelectedPeriod(p.id)}
                    className="p-3 rounded-lg text-left transition-all"
                    style={{
                      background: isActive ? 'rgba(201,160,32,0.10)' : '#F7F6F3',
                      border: `1px solid ${isActive ? 'rgba(201,160,32,0.4)' : '#E4E1D8'}`,
                    }}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Clock size={12} style={{ color: isActive ? '#C9A020' : '#6B6660' }} />
                      <span className="text-xs font-bold" style={{ color: isActive ? '#C9A020' : '#1A1A1A' }}>P{p.number}</span>
                    </div>
                    <p className="text-[10px] truncate" style={{ color: '#6B6660' }}>{p.time}</p>
                    <p className="text-sm font-bold mt-1" style={{ color: pct >= 80 ? '#10B981' : pct >= 60 ? '#F59E0B' : '#EF4444' }}>{pct}%</p>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Student List */}
          <div className="card xl:col-span-2 animate-in stagger-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-base">
                Student List
                {mode === 'period' && (
                  <span className="ml-2 text-xs font-normal px-2 py-0.5 rounded-full" style={{ background: 'rgba(201,160,32,0.1)', color: '#C9A020' }}>
                    Period {MOCK_PERIODS.find(p => p.id === selectedPeriod)?.number} — {MOCK_PERIODS.find(p => p.id === selectedPeriod)?.subject}
                  </span>
                )}
              </h2>
              <div className="flex gap-2">
                <button onClick={() => markAll('P')} className="btn-outline text-xs px-3 py-1.5" style={{ borderColor: '#10B981', color: '#10B981' }}>Mark All Present</button>
                <button onClick={() => markAll('A')} className="btn-outline text-xs px-3 py-1.5" style={{ borderColor: '#EF4444', color: '#EF4444' }}>Mark All Absent</button>
              </div>
            </div>

            <div className="rounded-lg overflow-hidden border" style={{ borderColor: '#E4E1D8' }}>
              <table className="table">
                <thead><tr><th style={{ width: 60 }}>Roll</th><th>Student</th><th>Status</th></tr></thead>
                <tbody>
                  {students.map(st => {
                    const cur = getStudentStatus(st.id)
                    return (
                      <tr key={st.id}>
                        <td className="font-mono text-sm" style={{ color: '#6B6660' }}>{st.id}</td>
                        <td>
                          <div className="flex items-center gap-2.5">
                            <StudentAvatar initials={st.avatar} />
                            <span className="font-medium">{st.name}</span>
                          </div>
                        </td>
                        <td>
                          <div className="flex gap-1">
                {(['P', 'A', 'L', 'S'] as AttendanceStatus[]).map(s => {
                              const c = statusColors[s]
                              const isActive = cur === s
                              return (
                                <button key={s} onClick={() => setStatus(st.id, s)}
                                  className="w-8 h-8 rounded-lg text-sm font-bold transition-all"
                                  style={{ background: isActive ? c.active : c.bg, color: isActive ? 'white' : c.text, border: `1px solid ${isActive ? c.active : 'transparent'}` }}>
                                  {s}
                                </button>
                              )
                            })}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary */}
          <div className="space-y-4 animate-in stagger-3">
            <div className="card">
              <h3 className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#6B6660' }}>
                {mode === 'daily' ? 'Daily Summary' : `Period ${MOCK_PERIODS.find(p => p.id === selectedPeriod)?.number} Summary`}
              </h3>
              <div className="flex flex-col items-center mb-4">
                <div className="relative w-32 h-32">
                  <svg viewBox="0 0 36 36" className="w-32 h-32 -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#E4E1D8" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#C9A020" strokeWidth="3" strokeDasharray={`${presentPct} ${100 - presentPct}`} strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold">{presentPct}%</span>
                    <span className="text-xs" style={{ color: '#6B6660' }}>Present</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="rounded-lg p-2" style={{ background: '#F7F6F3' }}><p className="text-xl font-bold">{total}</p><p className="text-xs" style={{ color: '#6B6660' }}>Total</p></div>
                <div className="rounded-lg p-2" style={{ background: '#F7F6F3' }}><p className="text-xl font-bold" style={{ color: '#C9A020' }}>{counts.P}</p><p className="text-xs" style={{ color: '#6B6660' }}>Present</p></div>
              </div>
            </div>

            <div className="card">
              <h3 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#6B6660' }}>Breakdown</h3>
              {([
                { label: 'Present', key: 'P' as AttendanceStatus, color: '#10B981' },
                { label: 'Absent', key: 'A' as AttendanceStatus, color: '#EF4444' },
                { label: 'Late', key: 'L' as AttendanceStatus, color: '#F59E0B' },
                { label: 'Sick', key: 'S' as AttendanceStatus, color: '#9CA3AF' },
              ]).map(({ label, key, color }) => (
                <div key={key} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: '#E4E1D8' }}>
                  <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} /><span className="text-sm">{label}</span></div>
                  <span className="font-semibold text-sm">{counts[key]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex justify-end gap-3 pt-2">
          <input ref={fileInputRef} type="file" accept=".csv" onChange={handleCsvUpload} className="hidden" />
          <button onClick={downloadAttendanceTemplate} className="btn-outline flex items-center gap-1.5"><Download size={14} /> Download Excel</button>
          <button onClick={() => fileInputRef.current?.click()} className="btn-outline flex items-center gap-1.5"><Upload size={14} /> Upload Excel</button>
          <button onClick={() => {
            if (mode === 'daily') {
              setAttendance(Object.fromEntries(students.map(s => [s.id, 'P' as AttendanceStatus])))
            } else {
              const reset: Record<string, AttendanceStatus> = {}
              students.forEach(s => { MOCK_PERIODS.forEach(p => { reset[`${s.id}-${p.id}`] = 'P' }) })
              setPeriodAttendance(reset)
            }
          }} className="btn-outline">Reset</button>
          <button onClick={handleSave} className="btn-gold">{saved ? '✓ Saved' : '💾 Save Attendance'}</button>
        </div>
      </div>
    </div>
  )
}
